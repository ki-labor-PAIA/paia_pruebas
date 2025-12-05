"""
PAIA Protocol - Router Standalone
Router adaptado para usar con el servidor PAIA standalone
"""

from typing import Dict, Any, Optional
from .message import PAIAMessage, PAIAMessageFactory, PAIASystemMessage
from .validator import PAIAMessageValidator, PAIAErrorCodes
from .discovery import PAIADiscoveryService
from .autonomy import AutonomyManager, AutonomyLevel


class PAIAMessageRouterStandalone:
    """
    Router PAIA adaptado para servidor standalone.
    Usa PAIAStorage en lugar de db_manager genérico.
    """

    def __init__(
        self,
        storage,  # PAIAStorage
        discovery_service: PAIADiscoveryService,
        autonomy_manager: AutonomyManager,
        websocket_manager = None,
        agent_manager = None
    ):
        """
        Args:
            storage: Instancia de PAIAStorage
            discovery_service: Servicio de descubrimiento
            autonomy_manager: Gestor de autonomía
            websocket_manager: Gestor de conexiones WebSocket
            agent_manager: Gestor de agentes (para invocar LangGraph)
        """
        self.storage = storage
        self.discovery = discovery_service
        self.autonomy = autonomy_manager
        self.ws_manager = websocket_manager
        self.agent_manager = agent_manager

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
            db_agent = await self.storage.get_agent(from_agent_id)

            if not db_agent or str(db_agent['user_id']) != str(sender_user_id):
                print(f"[ROUTER] ✗ Agente emisor no pertenece al usuario")
                print(f"[ROUTER] DEBUG: db_agent user_id={db_agent['user_id'] if db_agent else 'None'}, sender_user_id={sender_user_id}")
                await self._send_error_to_sender(
                    sender_user_id,
                    PAIAErrorCodes.UNAUTHORIZED,
                    "El agente emisor no te pertenece"
                )
                return {"success": False, "error": "UNAUTHORIZED"}

            # ==================== FASE 2: AUTORIZACIÓN ====================
            to_agent_id = message["to_agent_id"]

            # 2.1 Verificar que el agente destino existe
            to_agent = await self.storage.get_agent(to_agent_id)
            if not to_agent:
                print(f"[ROUTER] ✗ Agente destino no encontrado: {to_agent_id}")
                await self._send_error_to_sender(
                    sender_user_id,
                    PAIAErrorCodes.AGENT_NOT_FOUND,
                    f"Agente {to_agent_id} no encontrado"
                )
                return {"success": False, "error": "AGENT_NOT_FOUND"}

            # 2.2 Verificar permisos de comunicación (conexión social)
            to_user_id = str(to_agent['user_id'])

            # Permitir si es el mismo usuario
            if str(sender_user_id) != to_user_id:
                are_friends = await self.storage.are_friends(str(sender_user_id), to_user_id)

                if not are_friends:
                    print(f"[ROUTER] ✗ No autorizado: usuarios no son amigos")
                    await self._send_error_to_sender(
                        sender_user_id,
                        PAIAErrorCodes.NOT_CONNECTED,
                        "No hay conexión social con el dueño del agente"
                    )
                    return {"success": False, "error": "NOT_CONNECTED"}

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
            conversation_id = await self.storage.get_or_create_conversation(
                from_agent_id,
                to_agent_id
            )

            if "metadata" not in message:
                message["metadata"] = {}
            message["metadata"]["conversation_id"] = conversation_id

            # 4.2 Guardar mensaje en BD
            saved_message = await self.storage.save_message({
                "conversation_id": conversation_id,
                "from_agent_id": from_agent_id,
                "to_agent_id": to_agent_id,
                "message_type": message["type"],
                "payload": message["payload"],
                "metadata": message["metadata"],
                "status": "sent"
            })

            message_id = str(saved_message['id'])
            print(f"[ROUTER] ✓ Mensaje guardado en BD: {message_id}")

            # ==================== FASE 5: ENRUTAMIENTO ====================

            # 5.1 Intentar entregar por WebSocket si el usuario destino está online
            delivered = await self._deliver_via_websocket(
                to_user_id,
                message
            )

            if delivered:
                # Actualizar estado a "delivered"
                await self.storage.update_message_status(message_id, "delivered")
                print(f"[ROUTER] ✓ Mensaje entregado vía WebSocket")

                # 5.2 Verificar nivel de autonomía
                autonomy_level = self.autonomy.get_autonomy_level_for_message(
                    to_agent_id,
                    message
                )

                print(f"[ROUTER] Nivel de autonomía: {autonomy_level.value}")

                # 5.3 Si es un mensaje de chat y tenemos agent_manager, procesarlo
                if message["type"] == "paia.chat.message" and self.agent_manager:
                    print(f"[ROUTER] 🤖 Invocando agente receptor para responder...")

                    # Obtener usuarios para pasar al procesador
                    to_user = await self.storage.get_user_by_id(to_user_id)
                    from_user = await self.storage.get_user_by_id(str(sender_user_id))

                    await self._process_chat_message(
                        message,
                        to_agent_id,
                        from_agent_id,
                        conversation_id,
                        to_user,
                        from_user,
                        to_user_id,
                        str(sender_user_id)
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
                await self.storage.update_message_status(message_id, "pending")
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
            user_agents = await self.storage.get_agents_by_user(user_id)
            agent_ids = [agent['id'] for agent in user_agents]

            if not agent_ids:
                return

            # Obtener mensajes pendientes
            pending_messages = await self.storage.get_pending_messages(agent_ids)

            print(f"[ROUTER] 📬 Entregando {len(pending_messages)} mensajes pendientes a usuario {user_id}")

            for msg in pending_messages:
                # Construir mensaje PAIA
                import json

                # Parsear payload y metadata si son strings
                payload = msg['payload']
                if isinstance(payload, str):
                    payload = json.loads(payload)

                metadata = msg['metadata']
                if isinstance(metadata, str):
                    metadata = json.loads(metadata)

                paia_message = {
                    "type": msg['message_type'],
                    "from_agent_id": msg['from_agent_id'],
                    "to_agent_id": msg['to_agent_id'],
                    "payload": payload,
                    "metadata": metadata
                }

                # Entregar por WebSocket
                delivered = await self._deliver_via_websocket(user_id, paia_message)

                if delivered:
                    # Actualizar estado
                    await self.storage.update_message_status(str(msg['id']), "delivered")
                    print(f"[ROUTER] ✓ Mensaje {msg['id']} entregado")

                    # Si es un mensaje de chat y tenemos agent_manager, procesarlo
                    if paia_message["type"] == "paia.chat.message" and self.agent_manager:
                        print(f"[ROUTER] 🤖 Procesando mensaje pendiente con el agente...")

                        # Obtener información del mensaje
                        from_agent_id = paia_message["from_agent_id"]
                        to_agent_id = paia_message["to_agent_id"]
                        conversation_id = paia_message["metadata"].get("conversation_id")

                        # Obtener agentes
                        from_agent = await self.storage.get_agent(from_agent_id)
                        to_agent = await self.storage.get_agent(to_agent_id)

                        if from_agent and to_agent:
                            # Obtener usuarios
                            from_user_id = str(from_agent['user_id'])
                            to_user_id = str(to_agent['user_id'])

                            to_user = await self.storage.get_user_by_id(to_user_id)
                            from_user = await self.storage.get_user_by_id(from_user_id)

                            # Procesar mensaje
                            await self._process_chat_message(
                                paia_message,
                                to_agent_id,
                                from_agent_id,
                                conversation_id,
                                to_user,
                                from_user,
                                to_user_id,
                                from_user_id
                            )

        except Exception as e:
            print(f"[ROUTER] Error entregando mensajes pendientes: {e}")

    async def _deliver_via_websocket(
        self,
        user_id: str,
        message: Dict[str, Any]
    ) -> bool:
        """Intentar entregar un mensaje vía WebSocket"""
        if not self.ws_manager:
            return False

        try:
            if not self.ws_manager.is_user_online(user_id):
                return False

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

    async def _process_chat_message(
        self,
        message: Dict[str, Any],
        to_agent_id: str,
        from_agent_id: str,
        conversation_id: str,
        to_user: Dict[str, Any],
        from_user: Dict[str, Any],
        to_user_id: str,
        from_user_id: str
    ):
        """
        Procesar un mensaje de chat invocando al agente receptor para generar respuesta.
        """
        try:
            from datetime import datetime

            # Extraer contenido del mensaje
            content = message.get("payload", {}).get("content", "")

            # Obtener información de los agentes
            from_agent = await self.storage.get_agent(from_agent_id)
            to_agent = await self.storage.get_agent(to_agent_id)

            if not from_agent or not to_agent:
                print(f"[ROUTER] ✗ No se encontraron los agentes")
                return

            # Obtener historial de la conversación para contexto
            conversation_messages = await self.storage.get_conversation_messages(conversation_id)

            # Construir contexto de conversación
            conversation_history = []
            for msg in conversation_messages[-10:]:  # Últimos 10 mensajes
                sender = await self.storage.get_agent(msg['from_agent_id'])
                msg_content = msg['payload'].get('content', '') if isinstance(msg['payload'], dict) else msg['payload']
                conversation_history.append(f"{sender['name']}: {msg_content}")

            history_text = "\n".join(conversation_history) if conversation_history else "Esta es la primera interacción."

            # Invocar al agente receptor con contexto
            print(f"[ROUTER] 🤖 Invocando agente '{to_agent['name']}' con mensaje de '{from_agent['name']}'")

            response = await self.agent_manager.invoke_agent(
                to_agent_id,
                f"""Has recibido un mensaje del agente '{from_agent['name']}' (de {from_user['name']}).

HISTORIAL DE LA CONVERSACIÓN:
{history_text}

NUEVO MENSAJE:
{from_agent['name']}: {content}

Responde de manera apropiada según tu expertise, y entiende el contexto de quien te habla es un agente, no una persona, asi que siempre manten una conversacion amigable y de colega, tomando en cuenta el contexto de la conversación. Si la conversación ya ha cumplido su propósito o el otro agente se está despidiendo, responde brevemente y concluye la interacción de forma natural sin extender innecesariamente los saludos de despedida."""
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
            await self.storage.save_message({
                "conversation_id": conversation_id,
                "from_agent_id": to_agent_id,
                "to_agent_id": from_agent_id,
                "message_type": "paia.chat.message",
                "payload": {"content": response, "intent": "answer"},
                "metadata": {
                    "message_id": response_message.metadata.message_id,
                    "timestamp": response_message.metadata.timestamp,
                    "protocol_version": response_message.metadata.protocol_version,
                    "conversation_id": conversation_id
                },
                "status": "sent"
            })

            print(f"[ROUTER] ✓ Respuesta guardada en BD")

            # Enviar respuesta al usuario remitente vía WebSocket
            if self.ws_manager:
                await self.ws_manager.send_to_user(from_user_id, {
                    "type": "paia.incoming_message",
                    "message": response_message.to_dict()
                })

                # También notificar al usuario receptor (dueño del agente que respondió)
                await self.ws_manager.send_to_user(to_user_id, {
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

            # IMPORTANTE: Procesar la respuesta automáticamente para continuar la conversación
            # Esto permite que el agente original (from_agent) responda de vuelta
            print(f"[ROUTER] 🔄 Verificando si continuar conversación automáticamente...")

            # Verificar si el agente original está online
            if self.ws_manager and self.ws_manager.is_user_online(from_user_id):
                print(f"[ROUTER] ✓ Usuario {from_user['name']} online, continuando conversación...")
                # Procesar la respuesta para que el agente original responda
                await self._process_chat_message(
                    response_message.to_dict(),
                    from_agent_id,  # Ahora el receptor es el agente original
                    to_agent_id,    # El emisor es el agente que respondió
                    conversation_id,
                    from_user,      # Invertir usuarios
                    to_user,
                    from_user_id,
                    to_user_id
                )
            else:
                print(f"[ROUTER] ⏸ Usuario {from_user['name']} offline o ws_manager no disponible, conversación pausada")

        except Exception as e:
            print(f"[ROUTER] ✗ Error procesando mensaje de chat: {e}")
            import traceback
            traceback.print_exc()
