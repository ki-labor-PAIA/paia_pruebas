"""
Router for Google OAuth 2.0 authentication.
"""
import os
import json
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Request
from google_auth_oauthlib.flow import Flow
from db_manager_supabase import DatabaseManager

# Scopes required for sending emails
SCOPES = ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly']

def create_google_auth_router(db_manager: DatabaseManager) -> APIRouter:
    router = APIRouter()

    # Configuración desde variables de entorno
    CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
    CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
    REDIRECT_URI = os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:3000/api/mcp/oauth2callback')

    if not CLIENT_ID or not CLIENT_SECRET:
        print("[WARNING] Google Client ID/Secret not configured")

    @router.get("/api/auth/google/authorize-url")
    async def get_authorize_url(user_id: str) -> Dict[str, str]:
        """
        Generar URL de autorización para conectar Gmail.
        
        Args:
            user_id: ID del usuario que está conectando su cuenta
        """
        try:
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": CLIENT_ID,
                        "client_secret": CLIENT_SECRET,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                    }
                },
                scopes=SCOPES
            )
            
            flow.redirect_uri = REDIRECT_URI
            
            # Generar URL y state
            # Incluimos user_id en el state para recuperarlo en el callback
            state_data = json.dumps({"user_id": user_id})
            authorization_url, state = flow.authorization_url(
                access_type='offline',
                include_granted_scopes='true',
                state=state_data,
                prompt='consent' # Forzar consent para obtener refresh_token
            )
            
            return {"url": authorization_url}
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating auth URL: {str(e)}")

    @router.post("/api/auth/google/callback")
    async def auth_callback(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Manejar el código de autorización devuelto por Google.
        El frontend recibe el code en la URL y lo envía aquí.
        """
        try:
            code = data.get("code")
            # El state puede venir codificado o simple, aquí asumimos que el frontend nos pasa el user_id
            user_id = data.get("user_id") 
            
            if not code or not user_id:
                raise HTTPException(status_code=400, detail="Missing code or user_id")

            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": CLIENT_ID,
                        "client_secret": CLIENT_SECRET,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                    }
                },
                scopes=SCOPES
            )
            
            flow.redirect_uri = REDIRECT_URI
            
            # Intercambiar código por tokens
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
            # Serializar credenciales
            creds_data = {
                "token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "token_uri": credentials.token_uri,
                "client_id": credentials.client_id,
                "client_secret": credentials.client_secret,
                "scopes": credentials.scopes
            }
            
            # Guardar en base de datos
            success = await db_manager.save_user_credentials(user_id, "google", creds_data)
            
            if not success:
                raise HTTPException(status_code=500, detail="Failed to save credentials")
                
            return {"message": "Gmail connected successfully", "email": "connected"}
            
        except Exception as e:
            print(f"Auth callback error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
            
    return router
