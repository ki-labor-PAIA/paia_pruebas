# auth_manager.py
import os
import hashlib
import uuid
from typing import Optional, Dict
from datetime import datetime
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import (
    MetaData, Table, Column, String, DateTime, Boolean, Text, UniqueConstraint, 
    select, insert, update, delete
)
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
    def __init__(self, database_url: str):
        self.engine = create_async_engine(database_url, echo=False, pool_pre_ping=True)
        self.Session = async_sessionmaker(self.engine, expire_on_commit=False)
        self.jwt_secret = os.getenv("JWT_SECRET", "your-secret-key-change-this")
        
        # Definir la tabla de usuarios usando SQLAlchemy Core (similar a long_term_store_pg.py)
        self.metadata = MetaData()
        self.users_table = Table(
            "users",
            self.metadata,
            Column("id", String(36), primary_key=True),
            Column("email", String(255), nullable=False, unique=True),
            Column("name", String(255), nullable=True),
            Column("password_hash", String(255), nullable=True),
            Column("google_id", String(255), nullable=True),
            Column("image", Text, nullable=True),
            Column("is_active", Boolean, default=True),
            Column("created_at", DateTime, nullable=False),
            Column("updated_at", DateTime, nullable=False),
        )

    async def init_db(self):
        """Inicializar la tabla de usuarios"""
        async with self.engine.begin() as conn:
            await conn.run_sync(self.metadata.create_all)

    def _hash_password(self, password: str) -> str:
        """Hash de contraseña usando bcrypt"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    def _verify_password(self, password: str, hashed: str) -> bool:
        """Verificar contraseña"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

    async def register_user(self, email: str, password: str, name: Optional[str] = None) -> Dict:
        """Registrar nuevo usuario con email y contraseña"""
        try:
            # Verificar si el usuario ya existe
            async with self.Session() as session:
                stmt = select(self.users_table.c.id).where(self.users_table.c.email == email)
                result = await session.execute(stmt)
                if result.fetchone():
                    return {"success": False, "message": "El email ya está registrado"}

                # Crear nuevo usuario
                user_id = str(uuid.uuid4())
                password_hash = self._hash_password(password)
                now = datetime.utcnow()

                stmt = insert(self.users_table).values(
                    id=user_id,
                    email=email,
                    name=name or email.split('@')[0],
                    password_hash=password_hash,
                    is_active=True,
                    created_at=now,
                    updated_at=now
                )
                await session.execute(stmt)
                await session.commit()

                return {
                    "success": True,
                    "message": "Usuario creado exitosamente",
                    "user_id": user_id
                }
        except Exception as e:
            return {"success": False, "message": f"Error al crear usuario: {str(e)}"}

    async def login_user(self, email: str, password: str) -> Dict:
        """Login con email y contraseña"""
        try:
            async with self.Session() as session:
                stmt = select(
                    self.users_table.c.id,
                    self.users_table.c.email,
                    self.users_table.c.name,
                    self.users_table.c.password_hash,
                    self.users_table.c.is_active
                ).where(self.users_table.c.email == email)
                
                result = await session.execute(stmt)
                user_row = result.fetchone()

                if not user_row:
                    return {"success": False, "message": "Usuario no encontrado"}

                if not user_row.is_active:
                    return {"success": False, "message": "Usuario desactivado"}

                if not self._verify_password(password, user_row.password_hash):
                    return {"success": False, "message": "Contraseña incorrecta"}

                return {
                    "success": True,
                    "id": user_row.id,
                    "email": user_row.email,
                    "name": user_row.name
                }
        except Exception as e:
            return {"success": False, "message": f"Error al iniciar sesión: {str(e)}"}

    async def google_signin(self, email: str, name: str, google_id: str, image: Optional[str] = None) -> Dict:
        """Login/registro con Google OAuth"""
        try:
            async with self.Session() as session:
                # Verificar si el usuario ya existe
                stmt = select(
                    self.users_table.c.id,
                    self.users_table.c.email,
                    self.users_table.c.name
                ).where(self.users_table.c.email == email)
                
                result = await session.execute(stmt)
                user_row = result.fetchone()

                if user_row:
                    # Usuario existe, actualizar información de Google
                    now = datetime.utcnow()
                    update_stmt = update(self.users_table).where(
                        self.users_table.c.id == user_row.id
                    ).values(
                        google_id=google_id,
                        image=image,
                        name=name,
                        updated_at=now
                    )
                    await session.execute(update_stmt)
                    await session.commit()

                    return {
                        "success": True,
                        "user_id": user_row.id,
                        "email": user_row.email,
                        "name": name
                    }
                else:
                    # Crear nuevo usuario con Google
                    user_id = str(uuid.uuid4())
                    now = datetime.utcnow()

                    stmt = insert(self.users_table).values(
                        id=user_id,
                        email=email,
                        name=name,
                        google_id=google_id,
                        image=image,
                        is_active=True,
                        created_at=now,
                        updated_at=now
                    )
                    await session.execute(stmt)
                    await session.commit()

                    return {
                        "success": True,
                        "user_id": user_id,
                        "email": email,
                        "name": name
                    }
        except Exception as e:
            return {"success": False, "message": f"Error en Google sign-in: {str(e)}"}

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Obtener usuario por ID"""
        try:
            async with self.Session() as session:
                stmt = select(self.users_table).where(self.users_table.c.id == user_id)
                result = await session.execute(stmt)
                user_row = result.fetchone()

                if user_row:
                    return User(
                        id=user_row.id,
                        email=user_row.email,
                        name=user_row.name,
                        password_hash=user_row.password_hash,
                        google_id=user_row.google_id,
                        image=user_row.image,
                        is_active=user_row.is_active,
                        created_at=user_row.created_at,
                        updated_at=user_row.updated_at
                    )
                return None
        except Exception as e:
            print(f"Error getting user by ID: {e}")
            return None

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Obtener usuario por email"""
        try:
            async with self.Session() as session:
                stmt = select(self.users_table).where(self.users_table.c.email == email)
                result = await session.execute(stmt)
                user_row = result.fetchone()

                if user_row:
                    return User(
                        id=user_row.id,
                        email=user_row.email,
                        name=user_row.name,
                        password_hash=user_row.password_hash,
                        google_id=user_row.google_id,
                        image=user_row.image,
                        is_active=user_row.is_active,
                        created_at=user_row.created_at,
                        updated_at=user_row.updated_at
                    )
                return None
        except Exception as e:
            print(f"Error getting user by email: {e}")
            return None