"""
PAIA Protocol - Message Router
Enrutamiento de mensajes PAIA entre agentes
"""

from typing import Dict, Any, Optional, Callable, Awaitable
from datetime import datetime
from .message import PAIAMessage, PAIAMessageFactory, PAIASystemMessage
from .validator import PAIAMessageValidator, PAIAErrorCodes
from .discovery import PAIADiscoveryService
from .autonomy import AutonomyManager, AutonomyLevel


MessageHandler = Callable[[Dict[str, Any]], Awaitable[None]]


class PAIAMessageRouter:
    """
    Router central para mensajes PAIA.
    Maneja validación, autorización, y enrutamiento de mensajes entre agentes.
    """

    def __init__(
        self,
        db_manager,
        discovery_service: PAIADiscoveryService,
        autonomy_manager: AutonomyManager,
        websocket_manager = None,
        agent_manager = None
    ):
        """
        Args:
            db_manager: Gestor de base de datos
            discovery_service: Servicio de descubrimiento
            autonomy_manager: Gestor de autonomía
            websocket_manager: Gestor de conexiones WebSocket
            agent_manager: Gestor de agentes (para invocar LangGraph)
        """
        self.db_manager = db_manager
        self.discovery = discovery_service
        self.autonomy = autonomy_manager
        self.ws_manager = websocket_manager
        self.agent_manager = agent_manager

        # Handlers personalizados por tipo de mensaje
        self._message_handlers: Dict[str, MessageHandler] = {}

    def register_handler(self, message_type: str, handler: MessageHandler):
        """Registrar un handler para un tipo específico de mensaje"""
        self._message_handlers[message_type] = handler
        print(f"[ROUTER] Handler registrado para: {message_type}")

    async def route_message(
        self,
        message: Dict[str, Any],
        sender_user_id: str
    ) -> Dict[str, Any]:
        """
        Procesar y enrutar un mensaje PAIA.

        Args:
            message: Mensaje PAIA en formato dict
            sender_user_id: ID del usuario que envía el mensaje

        Returns:
            Resultado del enrutamiento
        """
        try:
            # ==================== FASE 1: VALIDACIÓN ====================
            print(f"[ROUTER] 📨 Procesando mensaje de tipo: {message.get('type')}")

            # 1.1 Validar schema del mensaje
            is_valid, error_msg = PAIAMessageValidator.validate_message(message)
            if not is_valid:
                print(f"[ROUTER] ✗ Schema inválido: {error_msg}")
                await self._send_error_to_sender(
                    sender_user_id,
                    PAIAErrorCodes.INVALID_SCHEMA,
                    error_msg
                )
                return {"success": False, "error": "INVALID_SCHEMA", "details": error_msg}

            # 1.2 Validar que el agente emisor pertenece al usuario
            from_agent_id = message["from_agent_id"]
            db_agent = await self.db_manager.get_agent(from_agent_id)

            if not db_agent or db_agent.user_id != sender_user_id:
                print(f"[ROUTER] ✗ Agente emisor no pertenece al usuario")
                await self._send_error_to_sender(
                    sender_user_id,
                    PAIAErrorCodes.UNAUTHORIZED,
                    "El agente emisor no te pertenece"
                )
                return {"success": False, "error": "UNAUTHORIZED"}

            # ==================== FASE 2: AUTORIZACIÓN ====================
            to_agent_id = message["to_agent_id"]

            # 2.1 Verificar que el agente destino existe
            to_profile = await self.discovery.get_agent_profile(to_agent_id)
            if not to_profile:
                print(f"[ROUTER] ✗ Agente destino no encontrado: {to_agent_id}")
                await self._send_error_to_sender(
                    sender_user_id,
                    PAIAErrorCodes.AGENT_NOT_FOUND,
                    f"Agente {to_agent_id} no encontrado"
                )
                return {"success": False, "error": "AGENT_NOT_FOUND"}

            # 2.2 Verificar permisos de comunicación (conexión social)
            can_communicate, reason = await self.discovery.can_communicate(
                sender_user_id,
                to_agent_id
            )

            if not can_communicate:
                print(f"[ROUTER] ✗ No autorizado para comunicarse: {reason}")
                await self._send_error_to_sender(
                    sender_user_id,
                    PAIAErrorCodes.NOT_CONNECTED,
                    reason
                )
                return {"success": False, "error": "NOT_CONNECTED", "details": reason}

            # ==================== FASE 3: AUTONOMÍA ====================

            # 3.1 Verificar si el agente receptor está deshabilitado para este tipo de mensaje
            if self.autonomy.is_disabled(to_agent_id, message):
                print(f"[ROUTER] ✗ Agente destino tiene deshabilitado este tipo de mensaje")
                await self._send_error_to_sender(
                    sender_user_id,
                    PAIAErrorCodes.CAPABILITY_NOT_SUPPORTED,
                    "El agente destino no acepta este tipo de mensaje"
                )
                return {"success": False, "error": "DISABLED"}

            # ==================== FASE 4: PERSISTENCIA ====================

            # 4.1 Obtener o crear conversation_id
            conversation_id = message.get("metadata", {}).get("conversation_id")
            if not conversation_id:
                # Generar conversation_id basado en los agentes
                conversation_id = await self._get_or_create_conversation(
                    from_agent_id,
                    to_agent_id
                )
                message["metadata"]["conversation_id"] = conversation_id

            # 4.2 Guardar mensaje en BD
            saved_message = await self.db_manager.save_message({
                "conversation_id": conversation_id,
                "from_agent_id": from_agent_id,
                "to_agent_id": to_agent_id,
                "message_type": message["type"],
                "payload": message["payload"],
                "metadata": message["metadata"],
                "status": "sent"
            })

            message_id = saved_message.id if hasattr(saved_message, 'id') else message["metadata"]["message_id"]
            print(f"[ROUTER] ✓ Mensaje guardado en BD: {message_id}")

            # ==================== FASE 5: ENRUTAMIENTO ====================

            # 5.1 Intentar entregar por WebSocket si el usuario destino está online
            delivered = await self._deliver_via_websocket(
                to_profile.user_id,
                message
            )

            if delivered:
                # Actualizar estado a "delivered"
                await self.db_manager.update_message_status(message_id, "delivered")
                print(f"[ROUTER] ✓ Mensaje entregado vía WebSocket")

                # 5.2 Verificar nivel de autonomía para auto-ejecución
                autonomy_level = self.autonomy.get_autonomy_level_for_message(
                    to_agent_id,
                    message
                )

                print(f"[ROUTER] Nivel de autonomía: {autonomy_level.value}")

                # 5.3 Si es un mensaje de chat y el agente tiene autonomía, procesarlo
                if message["type"] == "paia.chat.message" and self.agent_manager:
                    print(f"[ROUTER] 🤖 Invocando agente receptor para responder...")
                    await self._process_chat_message(
                        message,
                        to_agent_id,
                        from_agent_id,
                        conversation_id,
                        to_profile,
                        from_profile
                    )

                # Enviar confirmación al emisor
                await self._send_confirmation_to_sender(
                    sender_user_id,
                    message_id,
                    "delivered"
                )

                return {
                    "success": True,
                    "message_id": message_id,
                    "status": "delivered",
                    "autonomy_level": autonomy_level.value
                }

            else:
                # Usuario offline, mensaje quedará pending
                await self.db_manager.update_message_status(message_id, "pending")
                print(f"[ROUTER] ⏸ Usuario destino offline, mensaje en pending")

                await self._send_confirmation_to_sender(
                    sender_user_id,
                    message_id,
                    "pending"
                )

                return {
                    "success": True,
                    "message_id": message_id,
                    "status": "pending"
                }

        except Exception as e:
            print(f"[ROUTER] ✗ Error enrutando mensaje: {e}")
            import traceback
            traceback.print_exc()

            await self._send_error_to_sender(
                sender_user_id,
                PAIAErrorCodes.INTERNAL_ERROR,
                str(e)
            )

            return {"success": False, "error": "INTERNAL_ERROR", "details": str(e)}

    async def deliver_pending_messages(self, user_id: str):
        """
        Entregar mensajes pendientes cuando un usuario se conecta.

        Args:
            user_id: ID del usuario que se conectó
        """
        try:
            # Obtener agentes del usuario
            user_agents = await self.db_manager.get_agents_by_user(user_id)
            agent_ids = [agent.id for agent in user_agents]

            if not agent_ids:
                return

            # Obtener mensajes pendientes para esos agentes
            pending_messages = await self.db_manager.get_pending_messages(agent_ids)

            print(f"[ROUTER] 📬 Entregando {len(pending_messages)} mensajes pendientes a usuario {user_id}")

            for msg in pending_messages:
                # Construir mensaje PAIA
                paia_message = {
                    "type": msg.message_type,
                    "from_agent_id": msg.from_agent_id,
                    "to_agent_id": msg.to_agent_id,
                    "payload": msg.payload,
                    "metadata": msg.metadata
                }

                # Entregar por WebSocket
                delivered = await self._deliver_via_websocket(user_id, paia_message)

                if delivered:
                    # Actualizar estado
                    await self.db_manager.update_message_status(msg.id, "delivered")
                    print(f"[ROUTER] ✓ Mensaje {msg.id} entregado")

        except Exception as e:
            print(f"[ROUTER] Error entregando mensajes pendientes: {e}")

    async def _deliver_via_websocket(
        self,
        user_id: str,
        message: Dict[str, Any]
    ) -> bool:
        """
        Intentar entregar un mensaje vía WebSocket.

        Returns:
            True si se entregó exitosamente
        """
        if not self.ws_manager:
            return False

        try:
            # Verificar si el usuario está online
            if not self.ws_manager.is_user_online(user_id):
                return False

            # Enviar mensaje
            await self.ws_manager.send_to_user(user_id, {
                "type": "paia.incoming_message",
                "message": message
            })

            return True

        except Exception as e:
            print(f"[ROUTER] Error entregando por WebSocket: {e}")
            return False

    async def _send_confirmation_to_sender(
        self,
        sender_user_id: str,
        message_id: str,
        status: str
    ):
        """Enviar confirmación de mensaje al emisor"""
        if not self.ws_manager:
            return

        try:
            confirmation = PAIASystemMessage.create_confirmation_message(
                to_agent_id="sender",
                confirmed_message_id=message_id,
                status=status
            )

            await self.ws_manager.send_to_user(sender_user_id, {
                "type": "paia.system.confirmation",
                "message": confirmation.to_dict()
            })

        except Exception as e:
            print(f"[ROUTER] Error enviando confirmación: {e}")

    async def _send_error_to_sender(
        self,
        sender_user_id: str,
        error_code: str,
        error_message: str
    ):
        """Enviar mensaje de error al emisor"""
        if not self.ws_manager:
            return

        try:
            error_msg = PAIASystemMessage.create_error_system_message(
                to_agent_id="sender",
                error_code=error_code,
                error_message=error_message,
                original_message_id="unknown"
            )

            await self.ws_manager.send_to_user(sender_user_id, {
                "type": "paia.system.error",
                "message": error_msg.to_dict()
            })

        except Exception as e:
            print(f"[ROUTER] Error enviando mensaje de error: {e}")

    async def _get_or_create_conversation(
        self,
        agent1_id: str,
        agent2_id: str
    ) -> str:
        """
        Obtener o crear una conversación entre dos agentes.

        Returns:
            conversation_id
        """
        # Ordenar IDs para consistencia
        ordered_ids = sorted([agent1_id, agent2_id])

        # Generar conversation_id
        conversation_id = f"{ordered_ids[0]}_{ordered_ids[1]}"

        # Verificar si existe en BD (implementación depende del db_manager)
        # Por ahora simplemente retornamos el ID generado
        return conversation_id

    async def handle_incoming_message(
        self,
        agent_id: str,
        message: Dict[str, Any]
    ):
        """
        Manejar un mensaje PAIA entrante para un agente.
        Decide si auto-ejecutar o pedir aprobación.

        Args:
            agent_id: ID del agente receptor
            message: Mensaje PAIA
        """
        try:
            # Verificar nivel de autonomía
            autonomy_level = self.autonomy.get_autonomy_level_for_message(
                agent_id,
                message
            )

            print(f"[ROUTER] 📥 Mensaje para {agent_id}, autonomía: {autonomy_level.value}")

            # Buscar handler personalizado
            message_type = message.get("type")
            if message_type in self._message_handlers:
                await self._message_handlers[message_type](message)
                return

            # Comportamiento por defecto según autonomía
            if autonomy_level == AutonomyLevel.FULL_AUTO:
                # Ejecutar automáticamente
                print(f"[ROUTER] 🤖 Ejecutando automáticamente")
                await self._auto_execute_message(agent_id, message)

            elif autonomy_level == AutonomyLevel.SUPERVISED:
                # Pedir aprobación
                print(f"[ROUTER] ⏸ Requiere aprobación del usuario")
                await self._request_user_approval(agent_id, message)

            elif autonomy_level == AutonomyLevel.MANUAL:
                # Solo notificar
                print(f"[ROUTER] 📢 Solo notificar al usuario")
                await self._notify_user_only(agent_id, message)

        except Exception as e:
            print(f"[ROUTER] Error manejando mensaje entrante: {e}")

    async def _auto_execute_message(self, agent_id: str, message: Dict[str, Any]):
        """Ejecutar automáticamente un mensaje en el agente"""
        # Esta función debería invocar el agente LangGraph
        # Por ahora es un placeholder
        print(f"[ROUTER] AUTO-EXECUTE: Agente {agent_id} procesando mensaje tipo {message['type']}")
        pass

    async def _request_user_approval(self, agent_id: str, message: Dict[str, Any]):
        """Solicitar aprobación del usuario antes de ejecutar"""
        # Enviar notificación al usuario pidiendo aprobación
        print(f"[ROUTER] APPROVAL: Solicitar aprobación para mensaje {message['metadata']['message_id']}")
        pass

    async def _notify_user_only(self, agent_id: str, message: Dict[str, Any]):
        """Solo notificar al usuario sin ejecutar"""
        # Crear notificación informativa
        print(f"[ROUTER] NOTIFY: Usuario informado sobre mensaje {message['metadata']['message_id']}")
        pass

    async def _process_chat_message(
        self,
        message: Dict[str, Any],
        to_agent_id: str,
        from_agent_id: str,
        conversation_id: str,
        to_profile,
        from_profile
    ):
        """
        Procesar un mensaje de chat invocando al agente receptor para generar respuesta.
        """
        try:
            # Extraer contenido del mensaje
            content = message.get("payload", {}).get("content", "")

            # Obtener información del agente remitente
            from_agent = await self.db_manager.get_agent(from_agent_id)
            to_agent = await self.db_manager.get_agent(to_agent_id)

            if not from_agent or not to_agent:
                print(f"[ROUTER] ✗ No se encontraron los agentes")
                return

            # Invocar al agente receptor
            print(f"[ROUTER] 🤖 Invocando agente '{to_agent['name']}' con mensaje de '{from_agent['name']}'")

            response = await self.agent_manager.invoke_agent(
                to_agent_id,
                f"Has recibido un mensaje del agente '{from_agent['name']}' (de {from_profile.name}): {content}\n\nResponde de manera apropiada según tu expertise."
            )

            print(f"[ROUTER] ✓ Respuesta generada: {response[:100]}...")

            # Crear mensaje de respuesta PAIA
            from .message import PAIAChatMessage

            response_message = PAIAChatMessage.create_chat_message(
                from_agent_id=to_agent_id,
                to_agent_id=from_agent_id,
                content=response,
                intent="answer",
                conversation_id=conversation_id
            )

            # Guardar respuesta en BD
            saved_response = await self.db_manager.save_message({
                "conversation_id": conversation_id,
                "from_agent_id": to_agent_id,
                "to_agent_id": from_agent_id,
                "message_type": "paia.chat.message",
                "payload": {"content": response, "intent": "answer"},
                "metadata": response_message.metadata.__dict__,
                "status": "sent"
            })

            print(f"[ROUTER] ✓ Respuesta guardada en BD")

            # Enviar respuesta al usuario remitente vía WebSocket
            if self.ws_manager:
                await self.ws_manager.send_to_user(from_profile.user_id, {
                    "type": "paia.incoming_message",
                    "message": response_message.to_dict()
                })

                # También notificar al usuario receptor (dueño del agente que respondió)
                await self.ws_manager.send_to_user(to_profile.user_id, {
                    "type": "conversation.update",
                    "conversation_id": conversation_id,
                    "agent1_id": to_agent_id,
                    "agent2_id": from_agent_id,
                    "message": {
                        "from_agent_id": to_agent_id,
                        "to_agent_id": from_agent_id,
                        "payload": {"content": response, "intent": "answer"},
                        "timestamp": datetime.utcnow().isoformat()
                    }
                })

                print(f"[ROUTER] ✓ Respuesta enviada vía WebSocket a ambos usuarios")

        except Exception as e:
            print(f"[ROUTER] ✗ Error procesando mensaje de chat: {e}")
            import traceback
            traceback.print_exc()


# ==================== WEBSOCKET MANAGER STUB ====================

class WebSocketManager:
    """
    Manager de conexiones WebSocket (stub/interface).
    La implementación real se integrará con FastAPI.
    """

    def __init__(self):
        self.active_connections: Dict[str, Any] = {}

    def is_user_online(self, user_id: str) -> bool:
        """Verificar si un usuario está online"""
        return user_id in self.active_connections

    async def send_to_user(self, user_id: str, message: Dict[str, Any]):
        """Enviar mensaje a un usuario específico"""
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            await websocket.send_json(message)

    async def connect(self, user_id: str, websocket):
        """Registrar nueva conexión"""
        self.active_connections[user_id] = websocket
        print(f"[WS] Usuario {user_id} conectado")

    async def disconnect(self, user_id: str):
        """Desconectar usuario"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            print(f"[WS] Usuario {user_id} desconectado")
