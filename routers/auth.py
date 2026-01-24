"""
Authentication routers for PAIA Backend.
Handles user registration, login, and Google OAuth.
"""
from typing import Dict, Any
from fastapi import APIRouter, HTTPException


def create_auth_router(auth_manager: Any) -> APIRouter:
    """
    Create authentication router with dependencies.

    Args:
        auth_manager: AuthManager instance for user authentication

    Returns:
        Configured APIRouter with authentication endpoints
    """
    router = APIRouter()

    @router.post("/auth/register")
    async def register_user(request: dict) -> Dict[str, Any]:
        """
        Registrar nuevo usuario.

        Args:
            request: Dictionary containing email, password, and name

        Returns:
            Success message and user_id

        Raises:
            HTTPException: If email/password missing or registration fails
        """
        email = request.get("email")
        password = request.get("password")
        name = request.get("name")

        if not email or not password:
            raise HTTPException(status_code=400, detail="Email y contraseña son requeridos")

        result = await auth_manager.register_user(email, password, name)

        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])

        return {"message": result["message"], "user_id": result["user_id"]}

    @router.post("/auth/login")
    async def login_user(request: dict) -> Dict[str, Any]:
        """
        Login con email y contraseña.

        Args:
            request: Dictionary containing email and password

        Returns:
            User information (id, email, name)

        Raises:
            HTTPException: If credentials are invalid
        """
        email = request.get("email")
        password = request.get("password")

        if not email or not password:
            raise HTTPException(status_code=400, detail="Email y contraseña son requeridos")

        result = await auth_manager.login_user(email, password)

        if not result["success"]:
            raise HTTPException(status_code=401, detail=result["message"])

        return {
            "id": result["id"],
            "email": result["email"],
            "name": result["name"]
        }

    @router.post("/auth/google-signin")
    async def google_signin(request_data: dict) -> Dict[str, Any]:
        """
        Handle Google OAuth sign-in from NextAuth.

        Args:
            request_data: Dictionary containing google_id, email, name, and image

        Returns:
            User ID and success message

        Raises:
            HTTPException: If required fields are missing or operation fails
        """
        try:
            google_id = request_data.get('google_id')
            email = request_data.get('email')
            name = request_data.get('name')
            image = request_data.get('image')

            if not google_id or not email:
                raise HTTPException(status_code=400, detail="google_id and email are required")

            user = await auth_manager.get_user_by_google_id(google_id)

            if user:
                return {"user_id": user.id, "message": "User logged in successfully"}

            user = await auth_manager.get_user_by_email(email)

            if user:
                await auth_manager.update_user_google_info(user.id, google_id, name, image)
                return {"user_id": user.id, "message": "Google account linked successfully"}

            user = await auth_manager.create_user(
                email=email,
                name=name,
                google_id=google_id,
                image=image
            )

            return {"user_id": user.id, "message": "User created successfully"}

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/auth/user/{user_id}")
    async def get_user(user_id: str) -> Dict[str, Any]:
        """
        Obtener información del usuario.

        Args:
            user_id: User ID to retrieve

        Returns:
            User information

        Raises:
            HTTPException: If user not found
        """
        user = await auth_manager.get_user_by_id(user_id)

        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "image": user.image,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }

    return router
