import logging
import random
from typing import List, Dict, Any

try:
    from google import genai
    from google.genai import types
except ImportError:  # pragma: no cover - defensive fallback
    genai = None
    types = None

from app.config import settings

logger = logging.getLogger("medirag.llm")
logging.basicConfig(level=logging.INFO)

class LLMService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.use_mock = not self.api_key or genai is None or types is None
        
        if self.use_mock:
            if not self.api_key:
                logger.warning("GEMINI_API_KEY is not set. MediRAG will run in MOCK MODE for embeddings and generation.")
            else:
                logger.warning("Google GenAI SDK is unavailable. MediRAG will run in MOCK MODE for embeddings and generation.")
            self.client = None
        else:
            try:
                # The GenAI Client reads GEMINI_API_KEY from environment or parameter
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Gemini client successfully initialized.")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini client: {e}. Falling back to MOCK MODE.")
                self.use_mock = True
                self.client = None

    def validate_connection(self) -> dict:
        """Attempt a lightweight API call to validate the Gemini client and models.

        Returns a dict describing the connection status. If the official SDK isn't
        available or the API key is missing, returns details so the caller can
        decide to run in mock mode.
        """
        if self.use_mock:
            return {"ok": False, "reason": "MOCK_MODE or missing API key or SDK"}

        try:
            # Try to list available models or make a small metadata call.
            # The GenAI SDK may expose a models.list or client.models.list method.
            # We attempt a few fallbacks to be robust across SDK versions.
            models = None
            try:
                models = self.client.models.list()
            except Exception:
                try:
                    models = self.client.list_models()
                except Exception:
                    models = None

            if models is not None:
                # Return a short summary to avoid large payloads
                summary = []
                for m in (models[:10] if isinstance(models, list) else getattr(models, 'models', [])[:10]):
                    try:
                        name = getattr(m, 'name', str(m))
                    except Exception:
                        name = str(m)
                    summary.append(name)
                return {"ok": True, "models_preview": summary}

            return {"ok": False, "reason": "Could not list models with available SDK"}
        except Exception as e:
            logger.error(f"LLM validation failed: {e}")
            return {"ok": False, "reason": str(e)}

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generates 768-dimensional embeddings for a list of texts."""
        if not texts:
            return []
            
        if self.use_mock:
            # Return dummy 768-dim vectors
            return [[random.uniform(-0.1, 0.1) for _ in range(768)] for _ in texts]
            
        try:
            # Embed content using the new SDK
            response = self.client.models.embed_content(
                model=settings.EMBEDDING_MODEL,
                contents=texts
            )
            # The API returns a list of embeddings with `values`
            if hasattr(response, "embeddings") and response.embeddings:
                return [emb.values for emb in response.embeddings]
            elif hasattr(response, "embedding") and response.embedding:
                return [response.embedding.values]
            else:
                # Direct index access fallback
                if isinstance(response, list):
                    return [emb.values for emb in response]
                raise ValueError("Unexpected response structure from embed_content")
        except Exception as e:
            logger.error(f"Gemini embedding API call failed: {e}. Falling back to mock embeddings.")
            return [[random.uniform(-0.1, 0.1) for _ in range(768)] for _ in texts]

    def embed_text(self, text: str) -> List[float]:
        """Generates embedding for a single text string."""
        return self.embed_texts([text])[0]

    def generate_grounded_answer(self, question: str, contexts: List[Dict[str, Any]], doc_id_to_title: Dict[int, str] = None) -> str:
        """
        Generates a clinical answer grounded strictly in the provided contexts.
        Every facts-based claim must be cited.
        """
        if not contexts:
            return "No medical reference documents found. Please upload clinical documents first."
            
        if self.use_mock:
            # Return realistic grounded response showing citations
            titles = []
            for ctx in contexts:
                d_id = ctx.get("document_id")
                titles.append(doc_id_to_title.get(d_id, f"Doc {d_id}") if doc_id_to_title else f"Doc {d_id}")
            
            first_title = titles[0] if titles else "Clinical Guide"
            last_title = titles[-1] if titles else "Clinical Guide"
            
            mock_resp = (
                f"[MOCK MODE - NO API KEY] Based on the retrieved clinical references:\n\n"
                f"The recommended first-line intervention for this presentation is standard supportive therapy, "
                f"along with vital sign monitoring every 4 hours [{first_title}, p. {contexts[0].get('page_number')}]. "
                f"Ensure fluid balance is carefully maintained, and if patient criteria escalate beyond baseline, "
                f"consult the senior clinical registrar immediately [{last_title}, p. {contexts[-1].get('page_number')}]."
            )
            return mock_resp

        # Format retrieved contexts
        context_str = ""
        for idx, ctx in enumerate(contexts):
            d_id = ctx.get("document_id")
            doc_title = doc_id_to_title.get(d_id, f"Document ID: {d_id}") if doc_id_to_title else f"Document ID: {d_id}"
            page_num = ctx.get("page_number")
            text_content = ctx.get("text")
            
            context_str += f"--- CONTEXT BLOCK {idx+1} (Source: {doc_title}, Page: {page_num}) ---\n{text_content}\n\n"

        prompt = f"""You are a clinical knowledge assistant. Your goal is to answer the user's clinical question using ONLY the retrieved context blocks below.

Rules:
1. Do not make assumptions, extrapolate, or use outside knowledge.
2. If the answer cannot be found in the provided contexts, state: "I cannot answer this question based on the provided clinical documents."
3. Every statement or claim must be backed by a context block.
4. You MUST cite your source at the end of each sentence or claim using the document title and page number in brackets, for example: "... [Title, p. 5]." or "... [Title, p. 12]." Use the Source Title specified in the context block header.

Clinical Question: {question}

Retrieved Clinical Contexts:
{context_str}

Please generate the grounded clinical answer with inline citations:"""

        try:
            response = self.client.models.generate_content(
                model=settings.LLM_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.0,
                )
            )
            return response.text
        except Exception as e:
            logger.error(f"Gemini generation API call failed: {e}")
            return f"Error calling Gemini: {str(e)}"

llm_service = LLMService()
