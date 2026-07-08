import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="doctor") # admin, doctor, nurse, pharmacist, student
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    queries = relationship("Query", back_populates="user")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    source_filename = Column(String, nullable=False)
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)
    version = Column(Integer, default=1)
    status = Column(String, default="processing") # processing, indexed, failed
    
    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")

class Chunk(Base):
    __tablename__ = "chunks"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    page_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    
    document = relationship("Document", back_populates="chunks")

class Query(Base):
    __tablename__ = "queries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="queries")
    feedbacks = relationship("Feedback", back_populates="query", cascade="all, delete-orphan")

class Feedback(Base):
    __tablename__ = "feedbacks"
    
    id = Column(Integer, primary_key=True, index=True)
    query_id = Column(Integer, ForeignKey("queries.id", ondelete="CASCADE"), nullable=False)
    score = Column(Integer, nullable=False) # 1 for thumbs-up, 0 or -1 for thumbs-down
    comment = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    query = relationship("Query", back_populates="feedbacks")
