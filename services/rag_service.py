"""
RAG Service (POC)
Servicio ligero para búsquedas semánticas básicas usando la memoria persistente
(note: para el POC usaremos búsqueda por texto con ilike; en siguientes iteraciones añadiremos embeddings y búsqueda vectorial).
"""
from typing import List, Dict
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from config.settings import LLM_MODEL, LLM_TEMPERATURE
from long_term_store_supabase import LongTermStoreSupabase


class RAGService:
    def __init__(self, lt_store: LongTermStoreSupabase, embedding_service=None, vector_store=None):
        self.lt_store = lt_store
        self.embedding_service = embedding_service
        self.vector_store = vector_store
        # LLM para re-rankeado / generación final
        self.llm = ChatGoogleGenerativeAI(model=LLM_MODEL, temperature=LLM_TEMPERATURE)

    async def ingest_documents(self, user_id: str, texts: list, source: str = "whatsapp") -> int:
        """Ingestar una lista de textos como documentos en la memoria del usuario y opcionalmente crear embeddings.
        Retorna el número de documentos insertados.
        """
        import uuid
        memory_profile = f"user:{user_id}|docs"
        inserted = 0

        # Store raw texts in long term memory (for backward compatibility)
        for t in texts:
            key = f"doc:{str(uuid.uuid4())}"
            try:
                await self.lt_store.set(memory_profile, key, t)
                inserted += 1
            except Exception as e:
                print(f"[RAG] Error insertando doc en memories: {e}")

        # If embedding service + vector store available, also create embeddings and upsert into vector store
        if self.embedding_service and self.vector_store:
            try:
                embeddings = self.embedding_service.embed_texts(texts)
                docs = []
                for i, t in enumerate(texts):
                    docs.append({
                        'text': t,
                        'metadata': {'source': source},
                        'embedding': embeddings[i]
                    })
                upserted = await self.vector_store.upsert_documents(user_id, docs)
                print(f"[RAG] Upserted {upserted} docs into vector store")
            except Exception as e:
                print(f"[RAG] Error creating embeddings/upserting: {e}")

        return inserted

    async def ingest_file(self, user_id: str, file_bytes: bytes, filename: str, mime_type: str = None, source: str = "whatsapp") -> int:
        """Procesar un archivo (PDF, imagen, txt) y extraer texto para ingestarlo en RAG.
        Retorna el número de fragments/chunks indexados.
        """
        # Guardar temporalmente
        import tempfile
        import os
        from utils.chunker import chunk_text

        tmp_dir = tempfile.mkdtemp(prefix="paia_rag_")
        tmp_path = os.path.join(tmp_dir, filename)
        try:
            with open(tmp_path, "wb") as f:
                f.write(file_bytes)

            # Extraer texto según tipo
            extracted = ""
            # PDF
            if filename.lower().endswith(".pdf"):
                try:
                    from PyPDF2 import PdfReader
                    reader = PdfReader(tmp_path)
                    texts = []
                    for p in reader.pages:
                        try:
                            texts.append(p.extract_text() or "")
                        except Exception:
                            continue
                    extracted = "\n".join(texts)
                except Exception as e:
                    print(f"[RAG ingest_file] PyPDF2 error: {e}")
            # Image -> OCR
            elif any(filename.lower().endswith(ext) for ext in ('.png', '.jpg', '.jpeg', '.tiff')):
                try:
                    from PIL import Image
                    import pytesseract
                    img = Image.open(tmp_path)
                    extracted = pytesseract.image_to_string(img)
                except Exception as e:
                    print(f"[RAG ingest_file] OCR error or dependencies missing: {e}")
            # Plain text or other
            else:
                try:
                    # Try to decode as utf-8 text
                    extracted = file_bytes.decode('utf-8')
                except Exception:
                    extracted = ""

            if not extracted.strip():
                # No text extracted
                print("[RAG ingest_file] No se extrajo texto del archivo")
                return 0

            # Chunk and ingest
            chunks = chunk_text(extracted, chunk_size=300, overlap=50)
            if not chunks:
                return 0

            count = await self.ingest_documents(user_id, chunks, source=source)
            return count

        finally:
            # Limpieza
            try:
                os.remove(tmp_path)
            except Exception:
                pass
            try:
                os.rmdir(tmp_dir)
            except Exception:
                pass

    async def query(self, user_id: str, query_text: str, k: int = 4) -> str:
        """Buscar en la memoria del usuario y generar una respuesta usando embeddings + LLM si están disponibles.
        Flows:
        - Si embedding_service + vector_store disponible: embed query, retrieve nearest, re-rank with LLM
        - Otherwise: fallback a búsqueda por texto existente
        """
        try:
            # Use vector search if available
            if self.embedding_service and self.vector_store:
                q_emb = self.embedding_service.embed_text(query_text)
                candidates = await self.vector_store.query_similar(user_id, q_emb, k=k)
                snippets = [c['text'] for c in candidates]
            else:
                memory_profile = f"user:{user_id}|docs"
                results = await self.lt_store.search_memories(memory_profile, query_text)
                snippets = list(results.values())[:k]

            context = "\n\n---\n".join(snippets) if snippets else "(No se encontraron documentos relevantes)"
            prompt = (
                "Eres un asistente que responde usando únicamente la información provista en los documentos a continuación. "
                "Si la información no es suficiente, sé transparente."
                f"\n\nDOCUMENTOS:\n{context}\n\nPREGUNTA: {query_text}\n\nRESPUESTA:"
            )

            response = await self.llm.ainvoke({"messages": [HumanMessage(content=prompt)]})
            return response["messages"][-1].content

        except Exception as e:
            print(f"[RAG Service] Error en query: {e}")
            return "Lo siento, ocurrió un error buscando en tus documentos."