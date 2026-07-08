import io
from typing import List, Dict, Any
from pypdf import PdfReader

class PDFProcessor:
    @staticmethod
    def extract_chunks(file_bytes: bytes, chunk_size: int = 800, chunk_overlap: int = 150) -> List[Dict[str, Any]]:
        """
        Extracts text from PDF bytes page by page and splits it into overlapping chunks,
        retaining the original page numbers (1-indexed).
        """
        reader = PdfReader(io.BytesIO(file_bytes))
        chunks = []
        
        for page_idx, page in enumerate(reader.pages):
            page_num = page_idx + 1
            text = page.extract_text()
            if not text:
                continue
            
            # Clean text whitespace
            text = " ".join(text.split())
            if not text:
                continue
                
            # If text is small, write it as a single chunk
            if len(text) <= chunk_size:
                chunks.append({
                    "page_number": page_num,
                    "text": text
                })
            else:
                # Character-based window sliding
                start = 0
                while start < len(text):
                    end = start + chunk_size
                    # Adjust end to not cut in the middle of a word if possible
                    if end < len(text):
                        next_space = text.find(" ", end)
                        if next_space != -1 and next_space - end < 20:
                            end = next_space
                    
                    chunk_text = text[start:end].strip()
                    if chunk_text:
                        chunks.append({
                            "page_number": page_num,
                            "text": chunk_text
                        })
                    
                    start += chunk_size - chunk_overlap
                    if start >= len(text):
                        break
        return chunks
