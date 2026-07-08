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


@router.post("/llm/reload")
def reload_llm(current_user: User = Depends(get_current_user)):
    """Reload LLM service configuration (reads `.env` and reinitializes client)."""
    result = llm_service.reload()
    return result


@router.get("/llm/debug_models")
def debug_models(current_user: User = Depends(get_current_user)):
    """Return a small serialized preview of the raw models.list() response for debugging."""
    if llm_service.use_mock or not llm_service.client:
        return {"ok": False, "reason": "LLM client not initialized"}

    try:
        raw = None
        try:
            raw = llm_service.client.models.list()
        except Exception:
            try:
                raw = llm_service.client.list_models()
            except Exception as e:
                return {"ok": False, "error": str(e)}

        # Normalize to iterable
        items = []
        try:
            if isinstance(raw, list):
                items = raw[:10]
            elif hasattr(raw, 'models'):
                items = list(raw.models)[:10]
            elif isinstance(raw, dict) and 'models' in raw:
                items = raw['models'][:10]
            else:
                try:
                    items = list(raw)[:10]
                except Exception:
                    items = [str(raw)]
        except Exception as e:
            return {"ok": False, "error": f"Normalization failed: {e}"}

        serialized = []
        for m in items:
            if isinstance(m, dict):
                serialized.append({k: v for k, v in m.items() if k in ("name", "display_name", "version")})
            else:
                # try attributes
                serialized.append({
                    "name": getattr(m, 'name', None),
                    "display_name": getattr(m, 'display_name', None),
                    "version": getattr(m, 'version', None)
                })

        return {"ok": True, "preview": serialized}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.get("/llm/test_embed")
def test_embed(current_user: User = Depends(get_current_user)):
    """Run a quick embedding on a short string and return vector length and sample values."""
    try:
        vec = llm_service.embed_text("test embedding")
        return {"ok": True, "len": len(vec), "sample": vec[:5]}
    except Exception as e:
        return {"ok": False, "error": str(e)}
