"""
WhatsApp routers for PAIA Backend.
Handles WhatsApp messaging and webhook operations.
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import PlainTextResponse
import os


def create_whatsapp_router(
    whatsapp_service: Optional[Any],
    db_manager: Any,
    memory_manager: Any,
    ensure_agent_loaded_func: Any
) -> APIRouter:
    router = APIRouter()

    @router.post("/api/whatsapp/send")
    async def send_whatsapp_message_endpoint(message_data: dict) -> Dict[str, Any]:
        try:
            if not whatsapp_service:
                raise HTTPException(status_code=503, detail="WhatsApp Service no está configurado")

            phone_number = message_data.get('phone_number', '')
            message = message_data.get('message', '')

            if not phone_number or not message:
                raise HTTPException(status_code=400, detail="phone_number y message son requeridos")

            result = whatsapp_service.send_text_message(phone_number, message)
            if result['success']:
                return result
            else:
                raise HTTPException(status_code=500, detail=result['message'])
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/api/webhooks/whatsapp")
    async def verify_whatsapp_webhook(
        request: Request,
        hub_mode: str = Query(alias="hub.mode", default=None),
        hub_verify_token: str = Query(alias="hub.verify_token", default=None),
        hub_challenge: str = Query(alias="hub.challenge", default=None)
    ) -> PlainTextResponse:
        verify_token = os.getenv("WHATSAPP_VERIFY_TOKEN")
        if not verify_token:
            raise HTTPException(status_code=500, detail="WHATSAPP_VERIFY_TOKEN no configurado")
        if hub_mode == "subscribe" and hub_verify_token == verify_token:
            return PlainTextResponse(content=hub_challenge, status_code=200)
        else:
            raise HTTPException(status_code=403, detail="Verificación fallida")

    @router.post("/api/webhooks/whatsapp")
    async def receive_whatsapp_webhook(request: Request) -> Dict[str, Any]:
        try:
            from datetime import datetime
            from langchain_core.messages import HumanMessage, AIMessage

            body = await request.body()
            signature = request.headers.get("X-Hub-Signature-256", "")

            if whatsapp_service:
                is_valid = whatsapp_service.verify_webhook_signature(body, signature)
                if not is_valid:
                    raise HTTPException(status_code=403, detail="Firma inválida")

            payload = await request.json()
            message_data = whatsapp_service.parse_webhook_payload(payload) if whatsapp_service else None

            if not message_data:
                return {"status": "ok"}

            customer_phone = message_data["customer_phone"]
            message_text = message_data["message_text"]

            db_agent = await db_manager.get_agent_by_whatsapp_phone(customer_phone)
            if not db_agent:
                return {"status": "ok", "message": "No agent found for this number"}

            agent = await ensure_agent_loaded_func(db_agent.id, db_agent.user_id)
            if not agent:
                return {"status": "error", "message": "Could not load agent"}

            if agent.conversation_history is None:
                agent.conversation_history = []

            agent.conversation_history.append({
                "role": "user",
                "content": message_text,
                "timestamp": datetime.now().isoformat()
            })

            conversation_context = []
            for msg in agent.conversation_history[-10:]:
                if msg["role"] == "user":
                    conversation_context.append(HumanMessage(content=msg["content"]))
                else:
                    conversation_context.append(AIMessage(content=msg["content"]))

            if not conversation_context:
                conversation_context.append(HumanMessage(content=message_text))

            response = await agent.llm_instance.ainvoke({"messages": conversation_context})
            response_content = response["messages"][-1].content

            agent.conversation_history.append({
                "role": "assistant",
                "content": response_content,
                "timestamp": datetime.now().isoformat()
            })

            if whatsapp_service and db_agent.whatsapp_phone_number:
                whatsapp_service.send_text_message(
                    to_phone=db_agent.whatsapp_phone_number,
                    message=response_content
                )

            return {"status": "ok"}
        except Exception as e:
            print(f"[WhatsApp Webhook] ERROR: {str(e)}")
            return {"status": "error", "message": str(e)}

    return router
