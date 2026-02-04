"""
Embedding Service usando sentence-transformers.
"""
from typing import List

try:
    from sentence_transformers import SentenceTransformer
    import numpy as np
except Exception as e:
    SentenceTransformer = None
    np = None


class EmbeddingService:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        if SentenceTransformer is None:
            raise ImportError("sentence-transformers no está instalado. Ejecuta: pip install sentence-transformers numpy")
        self.model = SentenceTransformer(model_name)

    def embed_text(self, text: str) -> List[float]:
        vec = self.model.encode([text], normalize_embeddings=True)[0]
        return vec.tolist()

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        vecs = self.model.encode(texts, normalize_embeddings=True)
        return [v.tolist() for v in vecs]

    def cosine_similarity(self, a, b):
        # a and b are lists or numpy arrays
        if np is None:
            raise ImportError("numpy no está instalado. Ejecuta: pip install numpy")
        a = np.array(a)
        b = np.array(b)
        if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
            return 0.0
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))