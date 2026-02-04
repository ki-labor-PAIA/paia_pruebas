"""
Vector store backed by Supabase documents table.
- POC behaviour:
  - If a pgvector-backed function `search_similar(user_id text, q_embedding double precision[], k int)` exists, it will use it via RPC.
  - Otherwise it will fetch user's docs and compute similarity in Python (fallback).

Table schema suggested (run scripts/init_pgvector.sql):
  CREATE EXTENSION IF NOT EXISTS vector;
  CREATE TABLE documents (
    id uuid PRIMARY KEY,
    user_id text NOT NULL,
    text text NOT NULL,
    metadata jsonb,
    embedding vector(384),
    created_at timestamp with time zone DEFAULT now()
  );

RPC function (see migration script) `search_similar` returns id,text,metadata,embedding,distance
"""
from typing import List, Dict, Optional
import uuid
from supabase_config import supabase_client

class VectorStoreSupabase:
    def __init__(self):
        self.client = supabase_client

    async def upsert_documents(self, user_id: str, docs: List[Dict]) -> int:
        """Insertar o actualizar documentos con embeddings.
        docs: list of {id (optional), text, metadata (optional), embedding: list[float]}
        Retorna número insertados/actualizados.
        """
        inserted = 0
        for d in docs:
            doc_id = d.get('id') or str(uuid.uuid4())
            payload = {
                'id': doc_id,
                'user_id': user_id,
                'text': d['text'],
                'metadata': d.get('metadata', {}),
                'created_at': d.get('created_at')
            }
            # Try to put embedding in a column `embedding` if exists. PostgREST should accept array for vector.
            if 'embedding' in d and d['embedding'] is not None:
                payload['embedding'] = d['embedding']
            try:
                # Try insert; if exists update
                res = self.client.table('documents').insert(payload).execute()
                if res.error:
                    # try update
                    res2 = self.client.table('documents').update(payload).eq('id', doc_id).execute()
                    if not res2.error:
                        inserted += 1
                else:
                    inserted += 1
            except Exception as e:
                print(f"[VectorStore] Error upserting document {doc_id}: {e}")
        return inserted

    async def query_similar(self, user_id: str, query_embedding: List[float], k: int = 4) -> List[Dict]:
        """Retorna lista de documents con keys: id, text, metadata, distance (smaller = more similar)
        - Si existe la función SQL `search_similar`, la invoca via rpc.
        - Si no, hace fallback descargando embeddings y calculando similitud en Python.
        """
        try:
            # Intentar llamar a la función SQL (pgvector) - requiere que la función exista en la DB
            params = {
                'user_id': user_id,
                'q_embedding': query_embedding,
                'k': k
            }
            # supabase rpc expects named params; the function must be created in SQL migration
            res = self.client.rpc('search_similar', params).execute()
            if not res.error and res.data:
                # Expected data rows with distance
                return [{'id': r['id'], 'text': r['text'], 'metadata': r.get('metadata'), 'distance': r.get('distance')} for r in res.data]
        except Exception as e:
            print(f"[VectorStore] RPC search_similar failed or not available: {e}")

        # Fallback: download user's docs and compute cosine similarity
        try:
            q = self.client.table('documents').select('id,text,metadata,embedding').eq('user_id', user_id).execute()
            rows = q.data if not q.error else []
            if not rows:
                return []

            # If embedding column is present as list
            candidates = []
            for r in rows:
                emb = r.get('embedding')
                if emb:
                    candidates.append({'id': r['id'], 'text': r['text'], 'metadata': r.get('metadata', {}), 'embedding': emb})

            # compute cosine similarity
            try:
                import numpy as np
            except Exception:
                # If numpy not available, naive dot product
                def cos(a, b):
                    # a and b lists
                    la = sum(x*x for x in a) ** 0.5
                    lb = sum(x*x for x in b) ** 0.5
                    if la == 0 or lb == 0:
                        return 0.0
                    return sum(x*y for x, y in zip(a, b)) / (la * lb)
            else:
                def cos(a, b):
                    a = np.array(a)
                    b = np.array(b)
                    if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
                        return 0.0
                    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

            # Assume query_embedding is list
            scored = []
            for c in candidates:
                score = cos(query_embedding, c['embedding'])
                scored.append({'id': c['id'], 'text': c['text'], 'metadata': c.get('metadata', {}), 'score': score})

            # Sort by descending score (higher = more similar)
            scored = sorted(scored, key=lambda x: x['score'], reverse=True)[:k]
            # Return in consistent format (use distance = 1-score)
            return [{'id': s['id'], 'text': s['text'], 'metadata': s['metadata'], 'distance': 1.0 - s['score']} for s in scored]

        except Exception as e:
            print(f"[VectorStore] Fallback query error: {e}")
            return []