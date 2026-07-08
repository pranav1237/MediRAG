from fastapi import APIRouter, Depends
from app.routers.auth import get_current_user
from app.models import User
from app.services.llm_service import llm_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/llm/validate")
def validate_llm(current_user: User = Depends(get_current_user)):
    """Validate LLM/Embedding service connectivity. Admin-only recommended.

    Returns a lightweight summary indicating whether the Gemini client appears
    connected and a small preview of available models when possible.
    """
    # Optional: require admin role; for now we allow any authenticated user.
    result = llm_service.validate_connection()
    return result
