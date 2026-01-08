# auth_manager_supabase.py
import os
import hashlib
import uuid
from typing import Optional, Dict
from datetime import datetime
from dataclasses import dataclass
from supabase_config import supabase_client
import bcrypt
import jwt

@dataclass
class User:
    id: str
    email: str
    name: Optional[str] = None
    password_hash: Optional[str] = None
    google_id: Optional[str] = None
    image: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class AuthManager:
    def __init__(self):
        self.client = supabase_client
        self.jwt_secret = os.getenv("JWT_SECRET", "your-secret-key-change-this")

    async def create_user(self, email: str, password: Optional[str] = None, 
                         name: Optional[str] = None, google_id: Optional[str] = None,
                         image: Optional[str] = None, user_id: Optional[str] = None) -> User:
        """Crear un nuevo usuario"""
        if user_id is None:
            user_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Hash password if provided
        password_hash = None
        if password:
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        data = {
            "id": user_id,
            "email": email,
            "name": name,
            "password_hash": password_hash,
            "google_id": google_id,
            "image": image,
            "is_active": True,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        try:
            result = self.client.table("users").insert(data).execute()
            if result.data:
                return self._dict_to_user(result.data[0])
            raise Exception("Failed to create user")
        except Exception as e:
            if "duplicate key" in str(e).lower():
                raise Exception(f"User with email {email} already exists")
            raise e

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Obtener usuario por email"""
        result = self.client.table("users").select("*").eq("email", email).execute()
        if result.data:
            return self._dict_to_user(result.data[0])
        return None

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Obtener usuario por ID"""
        result = self.client.table("users").select("*").eq("id", user_id).execute()
        if result.data:
            return self._dict_to_user(result.data[0])
        return None

    async def get_user_by_google_id(self, google_id: str) -> Optional[User]:
        """Obtener usuario por Google ID"""
        result = self.client.table("users").select("*").eq("google_id", google_id).execute()
        if result.data:
            return self._dict_to_user(result.data[0])
        return None

    async def verify_password(self, email: str, password: str) -> Optional[User]:
        """Verificar password y retornar usuario si es correcto"""
        user = await self.get_user_by_email(email)
        if not user or not user.password_hash:
            return None

        if bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
            return user
        return None

    async def login_user(self, email: str, password: str) -> Dict:
        """Login con email y contraseña, retorna resultado con información del usuario"""
        user = await self.verify_password(email, password)

        if not user:
            return {
                "success": False,
                "message": "Credenciales inválidas"
            }

        if not user.is_active:
            return {
                "success": False,
                "message": "Usuario desactivado"
            }

        return {
            "success": True,
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "image": user.image
        }

    async def register_user(self, email: str, password: str, name: Optional[str] = None) -> Dict:
        """Registrar nuevo usuario"""
        try:
            # Verificar si el usuario ya existe
            existing_user = await self.get_user_by_email(email)
            if existing_user:
                return {
                    "success": False,
                    "message": "El email ya está registrado"
                }

            # Crear nuevo usuario
            user = await self.create_user(email=email, password=password, name=name)

            return {
                "success": True,
                "message": "Usuario registrado exitosamente",
                "user_id": user.id
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Error al registrar usuario: {str(e)}"
            }

    async def update_user(self, user_id: str, updates: Dict) -> bool:
        """Actualizar usuario"""
        # Hash password if being updated
        if 'password' in updates:
            updates['password_hash'] = bcrypt.hashpw(
                updates['password'].encode('utf-8'), 
                bcrypt.gensalt()
            ).decode('utf-8')
            del updates['password']
        
        updates["updated_at"] = datetime.utcnow().isoformat()
        
        result = self.client.table("users").update(updates).eq("id", user_id).execute()
        return len(result.data) > 0

    async def update_user_google_info(self, user_id: str, google_id: str, 
                                    name: Optional[str] = None, 
                                    image: Optional[str] = None) -> bool:
        """Actualizar información de Google del usuario"""
        updates = {
            "google_id": google_id,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if name:
            updates["name"] = name
        if image:
            updates["image"] = image
        
        result = self.client.table("users").update(updates).eq("id", user_id).execute()
        return len(result.data) > 0

    async def deactivate_user(self, user_id: str) -> bool:
        """Desactivar usuario"""
        updates = {
            "is_active": False,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = self.client.table("users").update(updates).eq("id", user_id).execute()
        return len(result.data) > 0

    async def delete_user(self, user_id: str) -> bool:
        """Eliminar usuario (hard delete)"""
        result = self.client.table("users").delete().eq("id", user_id).execute()
        return len(result.data) > 0

    def generate_jwt_token(self, user: User) -> str:
        """Generar JWT token para el usuario"""
        payload = {
            "user_id": user.id,
            "email": user.email,
            "exp": datetime.utcnow().timestamp() + (24 * 60 * 60)  # 24 horas
        }
        return jwt.encode(payload, self.jwt_secret, algorithm="HS256")

    def verify_jwt_token(self, token: str) -> Optional[Dict]:
        """Verificar JWT token"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=["HS256"])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    async def create_or_update_google_user(self, google_user_info: Dict) -> User:
        """Crear o actualizar usuario desde Google OAuth"""
        google_id = google_user_info.get("id")
        email = google_user_info.get("email")
        name = google_user_info.get("name")
        picture = google_user_info.get("picture")
        
        if not google_id or not email:
            raise Exception("Google user info is incomplete")
        
        # Check if user exists by Google ID
        existing_user = await self.get_user_by_google_id(google_id)
        if existing_user:
            # Update existing user info
            await self.update_user_google_info(existing_user.id, google_id, name, picture)
            return await self.get_user_by_id(existing_user.id)
        
        # Check if user exists by email
        existing_user = await self.get_user_by_email(email)
        if existing_user:
            # Link Google account to existing user
            await self.update_user_google_info(existing_user.id, google_id, name, picture)
            return await self.get_user_by_id(existing_user.id)
        
        # Create new user
        return await self.create_user(
            email=email,
            name=name,
            google_id=google_id,
            image=picture
        )

    async def register_user(self, email: str, password: str, name: Optional[str] = None) -> Dict:
        """Registrar un nuevo usuario - wrapper para compatibilidad"""
        try:
            user = await self.create_user(email=email, password=password, name=name)
            return {
                "success": True,
                "message": "Usuario registrado exitosamente",
                "user_id": user.id
            }
        except Exception as e:
            return {
                "success": False,
                "message": str(e),
                "user_id": None
            }

    async def login_user(self, email: str, password: str) -> Dict:
        """Login de usuario - wrapper para compatibilidad"""
        user = await self.verify_password(email, password)
        if user:
            return {
                "success": True,
                "id": user.id,
                "email": user.email,
                "name": user.name
            }
        else:
            return {
                "success": False,
                "message": "Email o contraseña incorrectos"
            }

    async def init_db(self):
        """Initialize database - Not needed for Supabase as tables are managed via SQL"""
        # This method is kept for compatibility with the original interface
        # but doesn't need to do anything as Supabase tables are created via SQL
        pass

    def _dict_to_user(self, data: Dict) -> User:
        """Convertir diccionario a User"""
        return User(
            id=data["id"],
            email=data["email"],
            name=data["name"],
            password_hash=data["password_hash"],
            google_id=data["google_id"],
            image=data["image"],
            is_active=data["is_active"],
            created_at=datetime.fromisoformat(data["created_at"].replace('Z', '+00:00')) if data["created_at"] else None,
            updated_at=datetime.fromisoformat(data["updated_at"].replace('Z', '+00:00')) if data["updated_at"] else None
        )