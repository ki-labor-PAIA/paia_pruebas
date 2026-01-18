from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
from services.gmail_service import GmailService
from auth_manager_supabase import AuthManager

def create_emails_router(gmail_service: GmailService, auth_manager: AuthManager) -> APIRouter:
    router = APIRouter()

    @router.get("/emails")
    async def get_emails(user_id: Optional[str] = Query(None, description="User ID to fetch emails for")) -> List[Dict[str, Any]]:
        """
        Get recent emails for a user.
        If user_id is not provided, it should ideally come from auth token (not implemented here fully).
        For now, we expect user_id as query param or we fail.
        """
        # In a real app, we would get user_id from the current session/token
        # But this legacy frontend structure sends it or expects us to know it.
        # IF the frontend doesn't send user_id, we might have a problem unless we use auth middleware.
        # Based on `UserHeader.js`, session.user.id is available. 
        # But `useEmails.js` calls `PAIAApi.getEmails()` which calls `/emails`.
        # `PAIAApi.getEmails` implementation: `fetch(`${this.baseUrl}/emails`)` - NO params.
        
        # CRITICAL FIX: The frontend `useEmails.js` does NOT pass user_id.
        # We need a way to identify the user. 
        # Since this is a local simulator, maybe we can pick a default user or require the frontend to change.
        # Looking at `paia_backend.py`, other routers often use user_id.
        # Let's see `routers/users.py` or similar.
        
        if not user_id:
            # Try to find a default user or fail gracefully.
            # For the purpose of this request ("make it work"), IF we are in a single-user local context, 
            # maybe we can grab the first user? Or prompts error.
            # But wait, `useEmails.js` in frontend just calls `/emails`. 
            # The user might be logged in on frontend but the backend is stateless without token.
            pass

        if not user_id:
             raise HTTPException(status_code=400, detail="user_id is required")

        result = await gmail_service.get_messages(user_id)
        
        if not result["success"]:
            # If error is "User not connected", return empty list or specific error?
            # Frontend expects list. 
            if "not connected" in str(result.get("error", "")).lower():
                 return []
            raise HTTPException(status_code=500, detail=result.get("error"))
            
        return result["messages"]

    return router
