from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
import datetime

from app.database import get_db, SessionLocal
from app.models import User, Document, Chunk
from app.routers.auth import get_current_user
from app.services.pdf_processor import PDFProcessor
from app.services.vector_store import vector_store
from app.services.llm_service import llm_service

router = APIRouter(prefix="/documents", tags=["documents"])

# Pydantic Schema
class DocumentOut(BaseModel):
    id: int
    title: str
    source_filename: str
    upload_date: datetime.datetime
    version: int
    status: str

    class Config:
        from_attributes = True

# Admin role protection helper
def check_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators are authorized to perform this operation"
        )
    return current_user

def process_document_background(doc_id: int, file_content: bytes, file_name: str):
    """Processes document by chunking, embedding, and indexing in the background using a standalone session."""
    db: Session = SessionLocal()
    try:
        # Determine format
        if file_name.lower().endswith(".pdf"):
            chunks_data = PDFProcessor.extract_chunks(file_content)
        else:
            # Fallback for .txt or other text-based documents
            text = file_content.decode("utf-8", errors="ignore")
            chunks_data = [{"page_number": 1, "text": " ".join(text.split())}]
            
        if not chunks_data:
            raise ValueError("No extractable content found in the document.")

        # Save chunks to SQL DB
        chunks_db = []
        for c in chunks_data:
            chunk_obj = Chunk(
                document_id=doc_id,
                page_number=c["page_number"],
                content=c["text"]
            )
            chunks_db.append(chunk_obj)
            
        db.add_all(chunks_db)
        db.commit()

        # Extract text strings for embedding API
        text_strings = [c["text"] for c in chunks_data]
        
        # Call LLM Embeddings Service
        embeddings = llm_service.embed_texts(text_strings)
        
        # Index in Qdrant Vector Store
        vector_store.upsert_chunks(doc_id, chunks_data, embeddings)

        # Update Document status
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            doc.status = "indexed"
            db.commit()
            
    except Exception as e:
        db.rollback()
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            doc.status = "failed"
            db.commit()
        print(f"Background document processing failed for doc_id {doc_id}: {e}")
    finally:
        db.close()

@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    db: Session = Depends(get_db),
    admin_user: User = Depends(check_admin)
):
    # Verify file extension
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["pdf", "txt"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Only PDF and TXT are supported at this time."
        )

    # Read file content synchronously to pass to background task
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file: {e}"
        )

    # Initialize document entry in SQL database with status="processing"
    db_doc = Document(
        title=title,
        source_filename=file.filename,
        status="processing",
        version=1
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    # Dispatch background job for extraction, embedding, and indexing
    background_tasks.add_task(
        process_document_background,
        doc_id=db_doc.id,
        file_content=content,
        file_name=file.filename
    )

    return db_doc

@router.get("/", response_model=List[DocumentOut])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all uploaded medical documents in the system."""
    return db.query(Document).order_by(Document.upload_date.desc()).all()

@router.delete("/{doc_id}", status_code=status.HTTP_200_OK)
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(check_admin)
):
    """Deletes a document and its corresponding vector embeddings."""
    db_doc = db.query(Document).filter(Document.id == doc_id).first()
    if not db_doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    try:
        # Delete from Qdrant Vector Store
        vector_store.delete_document_vectors(doc_id)
        
        # Delete from SQL DB (Cascade deletes Chunks automatically)
        db.delete(db_doc)
        db.commit()
        return {"detail": f"Document '{db_doc.title}' deleted successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete document: {e}"
        )


@router.get("/status/{doc_id}")
def document_status(doc_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns processing status and chunk count for a given document id."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    chunk_count = db.query(Chunk).filter(Chunk.document_id == doc_id).count()

    return {
        "id": doc.id,
        "title": doc.title,
        "status": doc.status,
        "chunk_count": chunk_count,
        "uploaded_at": doc.upload_date,
        "version": doc.version
    }
