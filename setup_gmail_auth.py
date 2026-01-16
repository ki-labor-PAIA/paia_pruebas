
import os
import os.path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Si modificas estos scopes, elimina el archivo token.json.
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def setup_gmail():
    """Muestra el flujo de autenticación de OAuth básico para obtener las credenciales."""
    creds = None
    
    # El archivo token.json almacena los tokens de acceso y actualización del usuario.
    # Se crea automáticamente cuando el flujo de autorización se completa por primera vez.
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
        
    # Si no hay credenciales (o no son válidas), permite que el usuario inicie sesión.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("Refrescando token expirado...")
            creds.refresh(Request())
        else:
            print("Iniciando flujo de autenticación...")
            
            # Verificar configuración
            client_id = os.getenv('GOOGLE_CLIENT_ID')
            client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
            
            if not client_id or not client_secret:
                print("ERRO: Faltan variables GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en el archivo .env")
                return

            # Configuración para el flujo
            config = {
                "installed": {
                    "client_id": client_id,
                    "project_id": "paia-project", # Valor genérico
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                    "client_secret": client_secret,
                    "redirect_uris": ["http://localhost"]
                }
            }
            
            flow = InstalledAppFlow.from_client_config(config, SCOPES)
            creds = flow.run_local_server(port=0)
            
        # Guarda las credenciales para la próxima ejecución
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
            print("\n✅ Autenticación exitosa!")
            print("Archivo 'token.json' creado exitosamente.")

if __name__ == '__main__':
    setup_gmail()
