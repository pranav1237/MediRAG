from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import User
from app.routers import auth, documents, chat
from app.routers import admin
from app.routers.auth import get_password_hash

# Create Database tables (SQLite)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Clinical RAG system providing grounded evidence-based answers."
)

# CORS Configuration
# NextJS typically runs on port 3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For MVP development, allow all. Restrict to specific domains in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

# Seed Initial Demo Users
@app.on_event("startup")
def startup_seed_users():
    db: Session = SessionLocal()
    try:
        # Check if admin user exists
        admin = db.query(User).filter(User.email == "admin@medirag.com").first()
        if not admin:
            admin_user = User(
                name="Admin User",
                email="admin@medirag.com",
                hashed_password=get_password_hash("admin123"),
                role="admin"
            )
            db.add(admin_user)
            print("Seeded default admin user: admin@medirag.com / admin123")
            
        # Check if doctor user exists
        doctor = db.query(User).filter(User.email == "doctor@medirag.com").first()
        if not doctor:
            doctor_user = User(
                name="Dr. Jane Smith",
                email="doctor@medirag.com",
                hashed_password=get_password_hash("doctor123"),
                role="doctor"
            )
            db.add(doctor_user)
            print("Seeded default doctor user: doctor@medirag.com / doctor123")
            
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error seeding database users: {e}")
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "status": "online",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs"
    }
