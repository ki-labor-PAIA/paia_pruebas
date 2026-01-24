"""
Flows routers for PAIA Backend.
"""

from typing import Dict, Any
import json
from fastapi import APIRouter, HTTPException


def create_flows_router(db_manager: Any) -> APIRouter:
    router = APIRouter()

    @router.post('/api/flows/save')
    async def save_flow(flow_data: dict) -> Dict[str, str]:
        try:
            user_id = flow_data.get('user_id')
            name = flow_data.get('name')
            flow_data_content = flow_data.get('flow_data')

            if not user_id or not name or not flow_data_content:
                raise HTTPException(status_code=400, detail='user_id, name y flow_data son requeridos')

            saved_flow = await db_manager.save_flow(flow_data)
            flow_id = saved_flow['id'] if isinstance(saved_flow, dict) else saved_flow
            return {'flow_id': flow_id, 'message': f"Flujo '{name}' guardado exitosamente"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get('/api/flows/user/{user_id}')
    async def get_user_flows(user_id: str) -> Dict[str, Any]:
        try:
            flows = await db_manager.get_user_flows(user_id)
            return {'flows': flows, 'count': len(flows)}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")

    @router.put('/api/flows/{flow_id}')
    async def update_flow(flow_id: str, flow_data: dict) -> Dict[str, str]:
        try:
            updates = {
                'name': flow_data.get('name'),
                'description': flow_data.get('description'),
                'flow_data': json.dumps(flow_data.get('flow_data', {})),
                'is_public': flow_data.get('is_public', False),
                'metadata': json.dumps(flow_data.get('metadata', {}))
            }
            success = await db_manager.update_flow(flow_id, updates)
            if not success:
                raise HTTPException(status_code=404, detail='Flujo no encontrado')
            return {'message': 'Flujo actualizado exitosamente', 'flow_id': flow_id}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.put('/api/flows/{flow_id}/status')
    async def update_flow_status(flow_id: str, status_data: dict) -> Dict[str, str]:
        try:
            is_active = status_data.get('is_active', False)
            success = await db_manager.update_flow_status(flow_id, is_active)
            if not success:
                raise HTTPException(status_code=404, detail='Flujo no encontrado')
            return {'message': f"Flujo {'activado' if is_active else 'desactivado'} exitosamente"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.delete('/api/flows/{flow_id}')
    async def delete_flow(flow_id: str, user_data: dict) -> Dict[str, str]:
        try:
            user_id = user_data.get('user_id')
            if not user_id:
                raise HTTPException(status_code=400, detail='user_id es requerido')
            success = await db_manager.delete_flow(flow_id, user_id)
            if not success:
                raise HTTPException(status_code=404, detail='Flujo no encontrado o sin permisos')
            return {'message': 'Flujo eliminado exitosamente'}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get('/api/flows/friends/{user_id}/active')
    async def get_friends_active_flows(user_id: str) -> Dict[str, Any]:
        """Get active flows from connected friends"""
        try:
            flows = await db_manager.get_friends_active_flows(user_id)
            return {'active_flows': flows}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")

    return router
