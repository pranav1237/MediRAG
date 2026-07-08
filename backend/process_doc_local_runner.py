from app.database import SessionLocal
from app.models import Document
from app.routers.documents import process_document_background

if __name__ == '__main__':
    db = SessionLocal()
    try:
        doc = Document(title='Sample Guideline (backend runner)', source_filename='sample_guideline.txt', status='processing', version=1)
        db.add(doc)
        db.commit()
        db.refresh(doc)
        doc_id = doc.id
        with open('../tests/sample_guideline.txt','rb') as f:
            content = f.read()
        print(f"Processing doc id={doc_id}...")
        process_document_background(doc_id, content, 'sample_guideline.txt')
        print('Done processing')
    finally:
        db.close()
