import uuid
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from app.config import settings


class VectorStore:
    def __init__(self):
        self.fallback_mode = False
        self.collection_name = settings.QDRANT_COLLECTION

        # Qdrant client runs locally in a folder without needing Docker,
        # or in-memory for ephemeral environments/testing.
        if settings.QDRANT_PATH == ":memory:":
            self.client = QdrantClient(":memory:")
        else:
            try:
                self.client = QdrantClient(path=settings.QDRANT_PATH)
            except RuntimeError as exc:
                print(f"Qdrant startup failed with local storage; falling back to in-memory mode: {exc}")
                self.fallback_mode = True
                self.client = QdrantClient(":memory:")

        self._ensure_collection()
        
    def _ensure_collection(self):
        """Creates the Qdrant collection if it does not already exist."""
        try:
            collections = self.client.get_collections().collections
            exists = any(c.name == self.collection_name for c in collections)
            if not exists:
                # Gemini text-embedding-004 uses 768 dimensions
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=768, distance=Distance.COSINE)
                )
        except Exception as e:
            print(f"Qdrant collection check/creation failed: {e}")
            # Fallback to re-creation
            try:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=768, distance=Distance.COSINE)
                )
            except Exception:
                pass

    def upsert_chunks(self, document_id: int, chunks: List[Dict[str, Any]], embeddings: List[List[float]]) -> None:
        """Indexes text chunks with their associated embedding vectors and metadata."""
        if not chunks or not embeddings:
            return
            
        points = []
        for chunk, vector in zip(chunks, embeddings):
            point_id = str(uuid.uuid4())
            points.append(
                PointStruct(
                    id=point_id,
                    vector=vector,
                    payload={
                        "document_id": document_id,
                        "page_number": chunk["page_number"],
                        "text": chunk["text"]
                    }
                )
            )
        
        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )

    def search_similar(self, query_vector: List[float], limit: int = 5) -> List[Dict[str, Any]]:
        """Finds the top k most similar chunks for the query vector."""
        if not query_vector:
            return []
            
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=limit
        )
        
        return [
            {
                "document_id": hit.payload.get("document_id"),
                "page_number": hit.payload.get("page_number"),
                "text": hit.payload.get("text"),
                "score": hit.score
            }
            for hit in results
        ]

    def delete_document_vectors(self, document_id: int) -> None:
        """Removes all indexed chunks corresponding to a specific document."""
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="document_id",
                        match=MatchValue(value=document_id)
                    )
                ]
            )
        )

vector_store = VectorStore()
