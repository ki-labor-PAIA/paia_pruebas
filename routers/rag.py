"""Router mínimo para administración RAG (POC)"""
from fastapi import APIRouter, HTTPException


def create_rag_router(rag_service) -> APIRouter:
    router = APIRouter()

    @router.post("/api/rag/query")
    async def rag_query_endpoint(data: dict):
        user_id = data.get("user_id")
        query = data.get("query")
        if not user_id or not query:
            raise HTTPException(status_code=400, detail="user_id y query son requeridos")
        if not rag_service:
            raise HTTPException(status_code=503, detail="RAG Service no está inicializado")

        result = await rag_service.query(user_id, query)
        return {"answer": result}

    @router.post("/api/rag/reindex")
    async def rag_reindex_endpoint():
        # Placeholder para reindexado (no implementado en POC)
        return {"status": "ok", "message": "Reindex no implementado en POC"}

    return router