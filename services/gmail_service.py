import base64
from email.mime.text import MIMEText
from typing import Dict, Optional, Any
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from db_manager_supabase import DatabaseManager

class GmailService:
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager

    async def get_service(self, user_id: str):
        """Build Gmail API service for a specific user"""
        creds_data = await self.db_manager.get_user_credentials(user_id, "google")
        
        if not creds_data or "credentials" not in creds_data:
            return None
            
        c_data = creds_data["credentials"]
        
        # Reconstruir credenciales desde el JSON guardado
        creds = Credentials(
            token=c_data.get("token"),
            refresh_token=c_data.get("refresh_token"),
            token_uri=c_data.get("token_uri"),
            client_id=c_data.get("client_id"),
            client_secret=c_data.get("client_secret"),
            scopes=c_data.get("scopes")
        )
        
        return build('gmail', 'v1', credentials=creds)

    async def send_email(self, user_id: str, to: str, subject: str, message_text: str) -> Dict[str, Any]:
        """Send an email on behalf of user_id"""
        try:
            service = await self.get_service(user_id)
            if not service:
                return {"success": False, "error": "User not connected to Gmail"}

            message = self.create_message(to, subject, message_text)
            
            sent_message = service.users().messages().send(
                userId="me", body=message
            ).execute()
            
            return {"success": True, "message_id": sent_message['id']}
            
        except Exception as e:
            print(f"[Gmail] Error sending email for user {user_id}: {e}")
            return {"success": False, "error": str(e)}

    def create_message(self, to: str, subject: str, message_text: str) -> Dict[str, str]:
        """Create a message for an email."""
        message = MIMEText(message_text)
        message['to'] = to
        message['from'] = 'me' # Gmail API ignores this and uses authenticated user
        message['subject'] = subject
        
        # Encode the message in base64url format
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        
        return {'raw': raw_message}
