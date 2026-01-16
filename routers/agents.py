"""
Agents routers for PAIA Backend.
Handles agent CRUD operations and messaging.
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
from dataclasses import asdict
from fastapi import APIRouter, HTTPException
from langchain_core.messages import HumanMessage, AIMessage


def create_agents_router(
    agents_store: Dict[str, Any],
    connections_store: Dict[str, Any],
    agent_manager: Any,  # Ahora es un dict con 'agent_manager' key
    auth_manager: Any,
    db_manager: Any,
    memory_manager: Any,
    ensure_agent_loaded_func: Any,
    whatsapp_service: Optional[Any],
    telegram_default_chat_id: str
) -> APIRouter:
    """
    Create agents router with dependencies.
    agent_manager es un diccionario que contiene la referencia al manager real.
    """
    router = APIRouter()

    def get_agent_manager():
        """Obtener el agent_manager actual del contenedor de servicios"""
        if isinstance(agent_manager, dict):
            return agent_manager.get('agent_manager')
        return agent_manager

    @router.post("/api/agents")
    async def create_agent(agent_data: dict) -> Dict[str, Any]:
        try:
            manager = get_agent_manager()
            if not manager:
                raise HTTPException(
                    status_code=503,
                    detail="Agent Manager no inicializado. El servidor esta iniciando."
                )

            user_id = agent_data.get('user_id')
            if user_id:
                user = await auth_manager.get_user_by_id(user_id)
                if not user:
                    await auth_manager.create_user(
                        email=f"user-{user_id}@placeholder.com",
                        name=f"User {user_id[:8]}",
                        user_id=user_id
                    )

            if 'telegram_chat_id' not in agent_data:
                agent_data['telegram_chat_id'] = telegram_default_chat_id

            whatsapp_phone = agent_data.get('whatsapp_phone_number')
            if whatsapp_phone and whatsapp_phone.strip():
                existing_agent = await db_manager.get_agent_by_whatsapp_phone(whatsapp_phone)

                if not existing_agent and whatsapp_phone.startswith("521") and len(whatsapp_phone) >= 12:
                    alt_phone = "52" + whatsapp_phone[3:]
                    existing_agent = await db_manager.get_agent_by_whatsapp_phone(alt_phone)
                elif not existing_agent and whatsapp_phone.startswith("52") and len(whatsapp_phone) >= 12 and not whatsapp_phone.startswith("521"):
                    alt_phone = "521" + whatsapp_phone[2:]
                    existing_agent = await db_manager.get_agent_by_whatsapp_phone(alt_phone)

                if existing_agent:
                    print(f"[Create Agent] Error: WhatsApp {whatsapp_phone} ya asignado a '{existing_agent.name}'")
                    raise HTTPException(
                        status_code=400,
                        detail=f"El numero de WhatsApp {whatsapp_phone} ya esta asignado al agente '{existing_agent.name}'"
                    )

            agent = await manager.create_agent(agent_data)

            whatsapp_phone = agent_data.get('whatsapp_phone_number')
            if whatsapp_phone and whatsapp_phone.strip():
                print(f"[WhatsApp] Número guardado en Supabase para agente '{agent.name}': {whatsapp_phone}")

            agent_dict = asdict(agent)
            agent_dict.pop('llm_instance', None)
            agent_dict.pop('tools', None)
            return agent_dict
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")

    @router.get("/api/agents")
    async def get_agents(user_id: str = None) -> Dict[str, Any]:
        if user_id:
            db_agents = await db_manager.get_agents_by_user(user_id)
            agents_list = []
            for db_agent in db_agents:
                agent_dict = {
                    'id': db_agent.id,
                    'name': db_agent.name,
                    'description': db_agent.description,
                    'personality': db_agent.personality,
                    'expertise': db_agent.expertise,
                    'status': db_agent.status,
                    'created': db_agent.created_at.isoformat(),
                    'mcp_endpoint': db_agent.mcp_endpoint,
                    'user_id': db_agent.user_id,
                    'is_public': db_agent.is_public,
                    'telegram_chat_id': db_agent.telegram_chat_id,
                    'is_persistent': db_agent.is_persistent,
                    'auto_start': db_agent.auto_start
                }
                agents_list.append(agent_dict)
            return {"agents": agents_list, "count": len(agents_list)}
        else:
            agents_list = []
            for agent in agents_store.values():
                agent_dict = asdict(agent)
                agent_dict.pop('llm_instance', None)
                agent_dict.pop('tools', None)
                agents_list.append(agent_dict)
            return {"agents": agents_list, "count": len(agents_list)}

    @router.get("/api/agents/public")
    async def get_public_agents(exclude_user_id: str = None) -> Dict[str, Any]:
        valid_exclude_id = exclude_user_id if exclude_user_id and exclude_user_id != 'anonymous' else None
        db_agents = await db_manager.get_public_agents(valid_exclude_id)
        agents_list = []
        for db_agent in db_agents:
            agent_dict = {
                'id': db_agent.id,
                'name': db_agent.name,
                'description': db_agent.description,
                'personality': db_agent.personality,
                'expertise': db_agent.expertise,
                'status': db_agent.status,
                'created': db_agent.created_at.isoformat(),
                'mcp_endpoint': db_agent.mcp_endpoint,
                'user_id': db_agent.user_id,
                'is_public': db_agent.is_public,
                'telegram_chat_id': db_agent.telegram_chat_id,
                'is_persistent': db_agent.is_persistent,
                'auto_start': db_agent.auto_start
            }
            agents_list.append(agent_dict)
        return {"agents": agents_list, "count": len(agents_list)}

    @router.delete("/api/agents/{agent_id}")
    async def delete_agent(agent_id: str, user_data: dict) -> Dict[str, str]:
        try:
            user_id = user_data.get('user_id')
            if not user_id:
                raise HTTPException(status_code=400, detail="user_id requerido")

            db_agent = await db_manager.get_agent(agent_id)
            if not db_agent or db_agent.user_id != user_id:
                raise HTTPException(status_code=404, detail="Agente no encontrado o no autorizado")

            success = await db_manager.delete_agent(agent_id)
            if not success:
                raise HTTPException(status_code=500, detail="Error eliminando agente de la BD")

            if agent_id in agents_store:
                del agents_store[agent_id]

            return {"message": f"Agente {db_agent.name} eliminado exitosamente"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.put("/api/agents/{agent_id}")
    async def update_agent(agent_id: str, update_data: dict) -> Dict[str, str]:
        try:
            user_id = update_data.get('user_id')
            if not user_id:
                raise HTTPException(status_code=400, detail="user_id requerido")

            db_agent = await db_manager.get_agent(agent_id)
            if not db_agent or db_agent.user_id != user_id:
                raise HTTPException(status_code=404, detail="Agente no encontrado o no autorizado")

            updates = {}
            if 'is_persistent' in update_data:
                updates['is_persistent'] = update_data['is_persistent']
            if 'auto_start' in update_data:
                updates['auto_start'] = update_data['auto_start']
            if 'status' in update_data:
                updates['status'] = update_data['status']

            success = await db_manager.update_agent(agent_id, updates)
            if not success:
                raise HTTPException(status_code=500, detail="Error actualizando agente")

            return {"message": f"Agente {db_agent.name} actualizado exitosamente"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/api/agents/{agent_id}/message")
    async def send_message_to_agent(agent_id: str, message_data: dict) -> Dict[str, str]:
        try:
            print(f"[DEBUG] Recibiendo mensaje para agente {agent_id}: {message_data}")

            agent = await ensure_agent_loaded_func(agent_id)
            if not agent:
                print(f"[ERROR] Agente {agent_id} no encontrado o no se pudo cargar")
                raise HTTPException(status_code=404, detail="Agente no encontrado")

            print(f"[DEBUG] Agente cargado: {agent.name}")
            user_id = message_data.get('user_id')

            if agent.conversation_history is None:
                agent.conversation_history = []

            try:
                memory_manager.add_to_short_term(agent_id, role="user", content=message_data['message'])
            except Exception as e:
                print(f"[WARNING] Error agregando a memoria corta: {e}")

            agent.conversation_history.append({
                "role": "user",
                "content": message_data['message'],
                "timestamp": datetime.now().isoformat(),
                "user_id": user_id
            })

            conversation_context = []
            for msg in agent.conversation_history[-10:]:
                if msg["role"] == "user":
                    conversation_context.append(HumanMessage(content=msg["content"]))
                else:
                    conversation_context.append(AIMessage(content=msg["content"]))

            try:
                long_term = await memory_manager.get_long_term_memory(agent_id)
                if long_term:
                    resumen = ", ".join([f"{k}: {v}" for k, v in long_term.items()])
                    conversation_context.insert(0, HumanMessage(content=f"Preferencias del usuario: {resumen}"))
            except Exception as e:
                print(f"[WARNING] Error obteniendo memoria a largo plazo: {e}")

            if not conversation_context:
                conversation_context.append(HumanMessage(content=message_data['message']))
            else:
                if conversation_context[-1].content != message_data['message']:
                    conversation_context.append(HumanMessage(content=message_data['message']))

            print(f"[DEBUG] Invocando LLM con {len(conversation_context)} mensajes")

            try:
                response = await agent.llm_instance.ainvoke({
                    "messages": conversation_context
                })
                print(f"[DEBUG] Respuesta LLM recibida: {type(response)}")
            except Exception as e:
                print(f"[ERROR] Error invocando LLM: {e}")
                import traceback
                traceback.print_exc()
                raise HTTPException(status_code=500, detail=f"Error invocando LLM: {str(e)}")

            response_content = response["messages"][-1].content

            try:
                memory_manager.add_to_short_term(agent_id, role="assistant", content=response_content)
                agent.conversation_history.append({
                    "role": "assistant",
                    "content": response_content,
                    "timestamp": datetime.now().isoformat()
                })
            except Exception as e:
                print(f"[ERROR] Al guardar respuesta en memoria/historial: {e}")

            try:
                if whatsapp_service and hasattr(agent, 'whatsapp_phone_number') and agent.whatsapp_phone_number:
                    phone_number = agent.whatsapp_phone_number
                    print(f"[WhatsApp] Enviando respuesta automática a {phone_number}...")

                    result = whatsapp_service.send_text_message(
                        to_phone=phone_number,
                        message=response_content
                    )

                    if result['success']:
                        print(f"[WhatsApp] Mensaje enviado exitosamente (agente: {agent.name})")
                    else:
                        print(f"[WhatsApp] Error al enviar: {result['message']}")

            except Exception as whatsapp_error:
                print(f"[WhatsApp] Error en envío automático: {whatsapp_error}")

            return {
                "agent_id": agent_id,
                "agent_name": agent.name,
                "response": response_content
            }
        except HTTPException:
            raise
        except Exception as e:
            print(f"[ERROR] Error general en send_message_to_agent: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/api/agents/{from_agent_id}/send-to/{to_agent_id}")
    async def send_message_between_agents(from_agent_id: str, to_agent_id: str, message_data: dict) -> Dict[str, str]:
        try:
            manager = get_agent_manager()
            if not manager:
                raise HTTPException(
                    status_code=503,
                    detail="Agent Manager no inicializado"
                )

            response = await manager.send_message_to_agent_api(
                from_agent_id,
                to_agent_id,
                message_data['message']
            )

            return {
                "from_agent": agents_store[from_agent_id].name,
                "to_agent": agents_store[to_agent_id].name,
                "response": response
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/api/agents/check-whatsapp/{phone_number}")
    async def check_whatsapp_available(phone_number: str) -> Dict[str, Any]:
        try:
            if not phone_number or not phone_number.strip():
                return {"available": True}

            existing = await db_manager.get_agent_by_whatsapp_phone(phone_number)

            if not existing and phone_number.startswith("521") and len(phone_number) >= 12:
                alt_phone = "52" + phone_number[3:]
                print(f"[Check WhatsApp] Intentando variante sin 1: {alt_phone}")
                existing = await db_manager.get_agent_by_whatsapp_phone(alt_phone)

            if not existing and phone_number.startswith("52") and len(phone_number) >= 12 and not phone_number.startswith("521"):
                alt_phone = "521" + phone_number[2:]
                print(f"[Check WhatsApp] Intentando variante con 1: {alt_phone}")
                existing = await db_manager.get_agent_by_whatsapp_phone(alt_phone)

            if existing:
                print(f"[Check WhatsApp] Numero {phone_number} ya en uso por agente: {existing.name}")
                return {
                    "available": False,
                    "agent_name": existing.name,
                    "agent_id": existing.id
                }

            print(f"[Check WhatsApp] Numero {phone_number} disponible")
            return {"available": True}

        except Exception as e:
            print(f"[Check WhatsApp] Error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/api/agents/{agent_id}/connected")
    async def get_agent_connections(agent_id: str) -> List[Dict[str, Any]]:
        if agent_id not in agents_store:
            raise HTTPException(status_code=404, detail="Agente no encontrado")

        connected = []
        for conn in connections_store.values():
            if conn.agent1 == agent_id and conn.agent2 in agents_store:
                other_agent = agents_store[conn.agent2]
                connected.append({
                    "id": other_agent.id,
                    "name": other_agent.name,
                    "expertise": other_agent.expertise,
                    "personality": other_agent.personality,
                    "telegram_configured": bool(other_agent.telegram_chat_id)
                })
            elif conn.agent2 == agent_id and conn.agent1 in agents_store:
                other_agent = agents_store[conn.agent1]
                connected.append({
                    "id": other_agent.id,
                    "name": other_agent.name,
                    "expertise": other_agent.expertise,
                    "personality": other_agent.personality,
                    "telegram_configured": bool(other_agent.telegram_chat_id)
                })

        return connected

    return router
