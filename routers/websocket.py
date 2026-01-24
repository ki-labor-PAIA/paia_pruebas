"""
WebSocket routers for PAIA Backend.
Handles WebSocket connections for real-time communication.
"""
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from paia_protocol import PAIAWebSocketHandler


def create_websocket_router(
    paia_ws_handler: Optional[PAIAWebSocketHandler]
) -> APIRouter:
    """
    Create WebSocket router with dependencies.

    Args:
        paia_ws_handler: PAIA WebSocket handler instance

    Returns:
        Configured APIRouter with WebSocket endpoints
    """
    router = APIRouter()

    @router.websocket("/ws/paia")
    async def websocket_paia_endpoint(websocket: WebSocket):
        """
        WebSocket endpoint for PAIA protocol communication.

        Args:
            websocket: WebSocket connection instance
        """
        if not paia_ws_handler:
            await websocket.close(code=1011, reason="PAIA WebSocket handler not initialized")
            return

        try:
            await paia_ws_handler.handle_connection(websocket)
        except WebSocketDisconnect:
            print("[WebSocket] Client disconnected")
        except Exception as e:
            print(f"[WebSocket] Error: {e}")
            try:
                await websocket.close(code=1011, reason=str(e))
            except:
                pass

    @router.websocket("/ws/{agent_id}")
    async def websocket_agent_endpoint(websocket: WebSocket, agent_id: str):
        """
        WebSocket endpoint for direct agent connection.

        Args:
            websocket: WebSocket connection instance
            agent_id: Agent ID for the connection
        """
        if not paia_ws_handler:
            await websocket.close(code=1011, reason="PAIA WebSocket handler not initialized")
            return

        try:
            await websocket.accept()
            print(f"[WebSocket] Agent {agent_id} connected")

            user_id = await websocket.receive_text()
            await paia_ws_handler.connect(user_id, websocket)

            try:
                while True:
                    data = await websocket.receive_text()
                    import json
                    message = json.loads(data)
                    await paia_ws_handler.handle_message(user_id, message)
            except WebSocketDisconnect:
                await paia_ws_handler.disconnect(user_id)
                print(f"[WebSocket] Agent {agent_id} disconnected")

        except WebSocketDisconnect:
            print(f"[WebSocket] Agent {agent_id} disconnected during handshake")
        except Exception as e:
            print(f"[WebSocket] Error for agent {agent_id}: {e}")
            try:
                await websocket.close(code=1011, reason=str(e))
            except:
                pass

    return router
