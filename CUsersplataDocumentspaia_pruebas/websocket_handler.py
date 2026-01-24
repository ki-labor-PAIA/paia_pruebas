"""
PAIA Protocol - WebSocket Handler
Handler de WebSocket para comunicación en tiempo real del protocolo PAIA
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Any, Optional
import json
import asyncio
from .router import PAIAMessageRouter
from .message import PAIAMessageFactory


class PAIAWebSocketHandler:
    """
    Handler de WebSocket para el protocolo PAIA.
    Maneja conexiones persistentes y comunicación en tiempo real.
    """

    def __init__(
        self,
        router: PAIAMessageRouter,
        auth_manager,
        db_manager
    ):
        """
        Args:
            router: Router de mensajes PAIA
            auth_manager: Gestor de autenticación
            db_manager: Gestor de base de datos
        """
        self.router = router
        self.auth_manager = auth_manager
        self.db_manager = db_manager

        # Conexiones activas: user_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}

        # Agentes por usuario: user_id -> List[agent_id]
        self.user_agents: Dict[str, list] = {}

    async def handle_connection(
        self,
        websocket: WebSocket,
        user_id: str,
        token: str
    ):
        """
        Manejar una conexión WebSocket completa.

        Args:
            websocket: Conexión WebSocket de FastAPI
            user_id: ID del usuario
            token: Token de autenticación
        """
        heartbeat_task = None

        try:
            # ==================== AUTENTICACIÓN ====================
            user = await self._authenticate_user(user_id, token)
            if not user:
                await websocket.close(code=4001, reason="Unauthorized")
                return

            # ==================== SETUP ====================
            await websocket.accept()
            print(f"[PAIA WS] ✓ Usuario {user_id} conectado")

            # Registrar conexión
            self.active_connections[user_id] = websocket

            # Obtener agentes del usuario
            user_agents = await self.db_manager.get_agents_by_user(user_id)
            agent_ids = [agent['id'] for agent in user_agents]
            self.user_agents[user_id] = agent_ids

            print(f"[PAIA WS] Usuario tiene {len(agent_ids)} agentes: {agent_ids}")

            # ==================== ENTREGAR MENSAJES PENDIENTES ====================
            await self.router.deliver_pending_messages(user_id)

            # ==================== HEARTBEAT ====================
            # Iniciar heartbeat en background
            heartbeat_task = asyncio.create_task(self._heartbeat(user_id, websocket))

            # ==================== LOOP DE ESCUCHA ====================
            try:
                while True:
                    # Recibir mensaje del cliente
                    data = await websocket.receive_text()

                    try:
                        message_data = json.loads(data)
                        await self._handle_message(user_id, message_data, websocket)

                    except json.JSONDecodeError:
                        print(f"[PAIA WS] ✗ JSON inválido de usuario {user_id}")
                        await websocket.send_json({
                            "type": "error",
                            "error": "INVALID_JSON",
                            "message": "Formato JSON inválido"
                        })

            except WebSocketDisconnect:
                print(f"[PAIA WS] Usuario {user_id} desconectado")

        except Exception as e:
            print(f"[PAIA WS] ✗ Error en conexión de {user_id}: {e}")
            import traceback
            traceback.print_exc()

        finally:
            # ==================== CLEANUP ====================
            if heartbeat_task:
                heartbeat_task.cancel()
            await self._cleanup_connection(user_id)

    async def _authenticate_user(self, user_id: str, token: str) -> Optional[Any]:
        """
        Autenticar usuario con token.

        Returns:
            Usuario si es válido, None si no
        """
        try:
            # Validar token JWT
            payload = self.auth_manager.verify_token(token)
            if not payload or payload.get('user_id') != user_id:
                print(f"[PAIA WS] ✗ Token inválido para usuario {user_id}")
                return None

            # Obtener usuario de la base de datos
            user = await self.db_manager.get_user_by_id(user_id)

            if not user:
                print(f"[PAIA WS] ✗ Usuario {user_id} no encontrado")
                return None

            # Aquí deberías validar el token real
            # Por ahora asumimos que es válido si el usuario existe
            return user

        except Exception as e:
            print(f"[PAIA WS] Error autenticando usuario: {e}")
            return None

    async def _handle_message(
        self,
        user_id: str,
        message_data: Dict[str, Any],
        websocket: WebSocket
    ):
        """
        Manejar un mensaje recibido del cliente.

        Args:
            user_id: ID del usuario que envió el mensaje
            message_data: Datos del mensaje
            websocket: Conexión WebSocket
        """
        message_type = message_data.get("type")

        print(f"[PAIA WS] 📨 Mensaje de {user_id}, tipo: {message_type}")

        try:
            # ==================== PING/PONG ====================
            if message_type == "ping":
                await websocket.send_json({"type": "pong"})
                return

            # ==================== MENSAJE PAIA ====================
            if message_type and message_type.startswith("paia."):
                # Es un mensaje del protocolo PAIA
                result = await self.router.route_message(
                    message_data,
                    user_id
                )

                # Enviar confirmación al cliente
                await websocket.send_json({
                    "type": "routing_result",
                    "result": result
                })
                return

            # ==================== MENSAJE DE CHAT DIRECTO ====================
            if message_type == "chat":
                # Chat directo con un agente (no PAIA)
                await self._handle_direct_chat(user_id, message_data, websocket)
                return

            # ==================== TIPO DESCONOCIDO ====================
            print(f"[PAIA WS] ⚠ Tipo de mensaje desconocido: {message_type}")
            await websocket.send_json({
                "type": "error",
                "error": "UNKNOWN_MESSAGE_TYPE",
                "message": f"Tipo de mensaje desconocido: {message_type}"
            })

        except Exception as e:
            print(f"[PAIA WS] ✗ Error manejando mensaje: {e}")
            import traceback
            traceback.print_exc()

            await websocket.send_json({
                "type": "error",
                "error": "INTERNAL_ERROR",
                "message": str(e)
            })

    async def _handle_direct_chat(
        self,
        user_id: str,
        message_data: Dict[str, Any],
        websocket: WebSocket
    ):
        """
        Manejar chat directo con un agente (no protocolo PAIA).
        Este es para cuando el usuario habla con su propio agente.
        """
        # Esta funcionalidad ya está implementada en paia_backend.py
        # Se podría integrar aquí si se desea
        pass

    async def _heartbeat(self, user_id: str, websocket: WebSocket):
        """
        Enviar heartbeat periódico para mantener conexión viva.

        Args:
            user_id: ID del usuario
            websocket: Conexión WebSocket
        """
        try:
            while True:
                await asyncio.sleep(30)  # Cada 30 segundos
                await websocket.send_json({"type": "heartbeat"})

        except asyncio.CancelledError:
            print(f"[PAIA WS] Heartbeat cancelado para {user_id}")
        except Exception as e:
            print(f"[PAIA WS] Error en heartbeat: {e}")

    async def _cleanup_connection(self, user_id: str):
        """Limpiar una conexión cerrada"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]

        if user_id in self.user_agents:
            del self.user_agents[user_id]

        print(f"[PAIA WS] Conexión de {user_id} limpiada")

    def is_user_online(self, user_id: str) -> bool:
        """Verificar si un usuario está online"""
        return user_id in self.active_connections

    async def broadcast_to_user(self, user_id: str, message: Dict[str, Any]):
        """Enviar un mensaje a un usuario específico vía WebSocket"""
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
                print(f"[PAIA WS] ✓ Mensaje enviado a usuario {user_id}: {message.get('type')}")
            except Exception as e:
                print(f"[PAIA WS] ✗ Error enviando a usuario {user_id}: {e}")

    async def send_to_user(self, user_id: str, message: Dict[str, Any]):
        """
        Enviar un mensaje a un usuario específico.

        Args:
            user_id: ID del usuario
            message: Mensaje a enviar
        """
        if user_id in self.active_connections:
            try:
                websocket = self.active_connections[user_id]
                await websocket.send_json(message)
                return True
            except Exception as e:
                print(f"[PAIA WS] Error enviando a {user_id}: {e}")
                return False
        return False

    async def broadcast_to_agents(
        self,
        agent_ids: list,
        message: Dict[str, Any]
    ):
        """
        Enviar un mensaje a todos los usuarios que poseen ciertos agentes.

        Args:
            agent_ids: Lista de IDs de agentes
            message: Mensaje a enviar
        """
        # Encontrar usuarios que tienen estos agentes
        target_users = set()
        for user_id, user_agent_list in self.user_agents.items():
            if any(agent_id in user_agent_list for agent_id in agent_ids):
                target_users.add(user_id)

        # Enviar a cada usuario
        for user_id in target_users:
            await self.send_to_user(user_id, message)


# ==================== INTEGRACIÓN CON FASTAPI ====================

def create_paia_websocket_endpoint(
    router: PAIAMessageRouter,
    auth_manager,
    db_manager
):
    """
    Crear el endpoint de WebSocket para FastAPI.

    Args:
        router: Router PAIA
        auth_manager: Gestor de autenticación
        db_manager: Gestor de base de datos

    Returns:
        Función async para usar como endpoint
    """
    handler = PAIAWebSocketHandler(router, auth_manager, db_manager)

    # Registrar el handler en el router para que pueda enviar mensajes
    router.ws_manager = handler

    async def websocket_endpoint(websocket: WebSocket, user_id: str, token: str = None):
        """
        Endpoint de WebSocket para PAIA.

        Usage en FastAPI:
        ```python
        @app.websocket("/ws/paia/{user_id}")
        async def paia_ws(websocket: WebSocket, user_id: str, token: str = Query(...)):
            await paia_websocket_endpoint(websocket, user_id, token)
        ```
        """
        await handler.handle_connection(websocket, user_id, token)

    return websocket_endpoint, handler
