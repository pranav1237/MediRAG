import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Query, Feedback, Document
from app.routers.auth import get_current_user
from app.services.vector_store import vector_store
from app.services.llm_service import llm_service

router = APIRouter(prefix="/chat", tags=["chat"])

# Pydantic Schemas
class QueryRequest(BaseModel):
    question: str
    top_k: int = 5

class CitationInfo(BaseModel):
    document_id: int
    document_title: str
    page_number: int
    text: str
    score: float

class QueryResponse(BaseModel):
    query_id: int
    answer: str
    citations: List[CitationInfo]

class FeedbackRequest(BaseModel):
    query_id: int
    score: int  # 1 for up, 0 for down
    comment: Optional[str] = None

class FeedbackOut(BaseModel):
    id: int
    query_id: int
    score: int
    comment: Optional[str]
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

class QueryHistoryOut(BaseModel):
    id: int
    question: str
    response: str
    timestamp: datetime.datetime
    feedbacks: List[FeedbackOut] = []

    class Config:
        from_attributes = True

@router.post("/query", response_model=QueryResponse)
def clinical_query(
    request: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    RAG Endpoint:
    1. Embeds query.
    2. Retrieves top-k relevant document chunks.
    3. Prompts LLM to write a grounded response with page citations.
    4. Saves search query to history.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        # Step 1: Embed query text
        query_vector = llm_service.embed_text(request.question)
        
        # Step 2: Query local Qdrant vector store
        similar_chunks = vector_store.search_similar(query_vector, limit=request.top_k)
        
        if not similar_chunks:
            # If nothing found in Vector DB, check if there are any documents at all
            doc_count = db.query(Document).count()
            if doc_count == 0:
                answer = "No medical reference documents are currently indexed. Please upload clinical guidelines or protocols to enable grounded answers."
            else:
                answer = "I could not find a strong match for this question in the current knowledge base. Please try rephrasing it or upload more relevant documents."

            db_query = Query(
                user_id=current_user.id,
                question=request.question,
                response=answer
            )
            db.add(db_query)
            db.commit()
            db.refresh(db_query)

            return QueryResponse(
                query_id=db_query.id,
                answer=answer,
                citations=[]
            )
        
        # Step 3: Fetch document titles from SQL database for resolved citations
        doc_ids = list(set([item["document_id"] for item in similar_chunks if item["document_id"] is not None]))
        doc_id_to_title = {}
        if doc_ids:
            docs = db.query(Document).filter(Document.id.in_(doc_ids)).all()
            doc_id_to_title = {d.id: d.title for d in docs}
            
        # Step 4: Generate Gemini grounded clinical response
        answer = llm_service.generate_grounded_answer(
            question=request.question,
            contexts=similar_chunks,
            doc_id_to_title=doc_id_to_title
        )

        # Step 5: Save Query History to SQLite
        db_query = Query(
            user_id=current_user.id,
            question=request.question,
            response=answer
        )
        db.add(db_query)
        db.commit()
        db.refresh(db_query)

        # Map similar chunks to Citation objects
        citations = []
        for chunk in similar_chunks:
            d_id = chunk["document_id"]
            citations.append(
                CitationInfo(
                    document_id=d_id if d_id is not None else 0,
                    document_title=doc_id_to_title.get(d_id, "Unknown Reference") if d_id is not None else "Unknown Reference",
                    page_number=chunk["page_number"] if chunk["page_number"] is not None else 1,
                    text=chunk["text"],
                    score=chunk["score"]
                )
            )

        return QueryResponse(
            query_id=db_query.id,
            answer=answer,
            citations=citations
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred during query execution: {e}"
        )

@router.post("/feedback", response_model=FeedbackOut)
def submit_feedback(
    request: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Allows users to submit thumbs up/down ratings and optional comments."""
    # Ensure referenced query exists
    db_query = db.query(Query).filter(Query.id == request.query_id).first()
    if not db_query:
        raise HTTPException(status_code=404, detail="Query log not found")
        
    # Ensure feedback doesn't already exist for this query
    existing_feedback = db.query(Feedback).filter(Feedback.query_id == request.query_id).first()
    if existing_feedback:
        # Update existing feedback
        existing_feedback.score = request.score
        existing_feedback.comment = request.comment
        existing_feedback.timestamp = datetime.datetime.utcnow()
        db.commit()
        db.refresh(existing_feedback)
        return existing_feedback

    # Create new feedback
    feedback = Feedback(
        query_id=request.query_id,
        score=request.score,
        comment=request.comment
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback

@router.get("/history", response_model=List[QueryHistoryOut])
def get_query_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches full conversational query logs and rating feedbacks for the authenticated user."""
    return (
        db.query(Query)
        .filter(Query.user_id == current_user.id)
        .order_by(Query.timestamp.desc())
        .all()
    )
