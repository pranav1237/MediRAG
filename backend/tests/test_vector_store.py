import unittest
from unittest.mock import Mock, patch


class VectorStoreTests(unittest.TestCase):
    def test_init_falls_back_to_in_memory_when_qdrant_storage_is_locked(self):
        import app.services.vector_store as vector_store_module

        mocked_client = Mock()
        mocked_client.get_collections.return_value.collections = []

        call_count = {"value": 0}

        def fake_qdrant_client(*args, **kwargs):
            call_count["value"] += 1
            if call_count["value"] == 1:
                raise RuntimeError("Storage folder already accessed")
            return mocked_client

        with patch.object(vector_store_module, "QdrantClient", side_effect=fake_qdrant_client) as mock_qdrant_client:
            store = vector_store_module.VectorStore()

            self.assertTrue(store.fallback_mode)
            self.assertEqual(store.collection_name, "medical_chunks")
            self.assertEqual(mock_qdrant_client.call_count, 2)


if __name__ == "__main__":
    unittest.main()
