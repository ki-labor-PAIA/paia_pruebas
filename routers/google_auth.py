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
# Scopes required for sending emails
SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid'
]

def create_google_auth_router(db_manager: DatabaseManager) -> APIRouter:
    router = APIRouter()

    # Configuración desde variables de entorno
    CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
    CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
    REDIRECT_URI = os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:3000/api/mcp/oauth2callback')

    if not CLIENT_ID or not CLIENT_SECRET:
        print("[WARNING] Google Client ID/Secret not configured")

    # Allow OAuth over HTTP for localhost
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
    # Relax scope validation (Google adds openid/email/profile automatically)
    os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

    @router.get("/api/auth/google/authorize-url")
    async def get_authorize_url(user_id: str) -> Dict[str, str]:
        """
        Generar URL de autorización para conectar Gmail.
        
        Args:
            user_id: ID del usuario que está conectando su cuenta
        """
        try:
            print(f"[AUTH] Generating URL for user_id: {user_id}")
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
            
            print(f"[AUTH] URL generated: {authorization_url[:50]}...")
            return {"url": authorization_url}
            
        except Exception as e:
            print(f"[AUTH ERROR] Generating URL: {e}")
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
            
            print(f"[AUTH] Callback received for user_id: {user_id}")
            
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
            print(f"[AUTH] Fetching token with redirect_uri: {REDIRECT_URI}")
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
            
            # Verificar que el usuario existe antes de guardar
            # Esto previene el error de Foreign Key si la sesión es vieja
            try:
                user_check = await db_manager.get_user_by_id(user_id)
                if not user_check:
                    print(f"[AUTH ERROR] User {user_id} not found in DB")
                    raise HTTPException(
                        status_code=404, 
                        detail="User not found. Please log out and log in again to refresh your session."
                    )
            except Exception as e:
                # Si falló la verificación (ej. formato UUID inválido), asumimos que no existe o es inválido
                if isinstance(e, HTTPException):
                    raise e
                print(f"[AUTH WARNING] Could not verify user existence: {e}")

            # Guardar en base de datos
            print(f"[AUTH] Saving credentials for user {user_id}...")
            try:
                success = await db_manager.save_user_credentials(user_id, "google", creds_data)
                
                if not success:
                    print(f"[AUTH ERROR] Failed to save credentials to DB (Operation returned False)")
                    raise HTTPException(status_code=500, detail="Failed to save credentials database record")
            except Exception as db_error:
                print(f"[AUTH ERROR] DB Error saving credentials: {db_error}")
                # Check for foreign key violation message
                err_str = str(db_error).lower()
                if "foreign key" in err_str or "violates" in err_str:
                     raise HTTPException(
                        status_code=400, 
                        detail="Invalid User ID (Foreign Key Violation). Please log out and log in again."
                    )
                raise HTTPException(status_code=500, detail=f"Database error: {str(db_error)}")
                
            print(f"[AUTH] Success!")
            return {"message": "Gmail connected successfully", "email": "connected"}
            
        except HTTPException as he:
            raise he
        except Exception as e:
            print(f"[AUTH ERROR] Callback failed: {e}")
            # Import traceback to print full stack
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))
            
    return router
