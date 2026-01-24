# long_term_store_supabase.py
import os
import uuid
from typing import Dict, Optional
from datetime import datetime
from supabase_config import supabase_client

class LongTermStoreSupabase:
    def __init__(self):
        self.client = supabase_client

    async def get_all(self, memory_profile_id: str) -> Dict[str, str]:
        """Obtener todas las memorias de un perfil"""
        try:
            result = self.client.table("long_term_memories").select(
                "key, value"
            ).eq("memory_profile_id", memory_profile_id).execute()
            
            return {row["key"]: row["value"] for row in result.data}
        except Exception as e:
            print(f"Error getting memories for profile {memory_profile_id}: {e}")
            return {}

    async def set(self, memory_profile_id: str, key: str, value: str):
        """Establecer o actualizar una memoria"""
        now = datetime.utcnow()
        memory_id = str(uuid.uuid4())
        
        data = {
            "id": memory_id,
            "memory_profile_id": memory_profile_id,
            "key": key,
            "value": value,
            "updated_at": now.isoformat()
        }
        
        try:
            # Try to update existing record first
            existing = self.client.table("long_term_memories").select("id").eq(
                "memory_profile_id", memory_profile_id
            ).eq("key", key).execute()
            
            if existing.data:
                # Update existing record
                result = self.client.table("long_term_memories").update({
                    "value": value,
                    "updated_at": now.isoformat()
                }).eq("memory_profile_id", memory_profile_id).eq("key", key).execute()
            else:
                # Insert new record
                result = self.client.table("long_term_memories").insert(data).execute()
                
        except Exception as e:
            print(f"Error setting memory {key} for profile {memory_profile_id}: {e}")
            raise e

    async def get(self, memory_profile_id: str, key: str) -> Optional[str]:
        """Obtener una memoria específica"""
        try:
            result = self.client.table("long_term_memories").select(
                "value"
            ).eq("memory_profile_id", memory_profile_id).eq("key", key).execute()
            
            if result.data:
                return result.data[0]["value"]
            return None
            
        except Exception as e:
            print(f"Error getting memory {key} for profile {memory_profile_id}: {e}")
            return None

    async def delete(self, memory_profile_id: str, key: str) -> bool:
        """Eliminar una memoria específica"""
        try:
            result = self.client.table("long_term_memories").delete().eq(
                "memory_profile_id", memory_profile_id
            ).eq("key", key).execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            print(f"Error deleting memory {key} for profile {memory_profile_id}: {e}")
            return False

    async def delete_all(self, memory_profile_id: str) -> bool:
        """Eliminar todas las memorias de un perfil"""
        try:
            result = self.client.table("long_term_memories").delete().eq(
                "memory_profile_id", memory_profile_id
            ).execute()
            
            return True
            
        except Exception as e:
            print(f"Error deleting all memories for profile {memory_profile_id}: {e}")
            return False

    async def get_profiles(self) -> list:
        """Obtener todos los perfiles de memoria únicos"""
        try:
            result = self.client.table("long_term_memories").select(
                "memory_profile_id"
            ).execute()
            
            # Get unique profile IDs
            profiles = list(set(row["memory_profile_id"] for row in result.data))
            return profiles
            
        except Exception as e:
            print(f"Error getting memory profiles: {e}")
            return []

    async def get_profile_stats(self, memory_profile_id: str) -> Dict:
        """Obtener estadísticas de un perfil de memoria"""
        try:
            result = self.client.table("long_term_memories").select(
                "key, updated_at"
            ).eq("memory_profile_id", memory_profile_id).execute()
            
            if not result.data:
                return {
                    "total_memories": 0,
                    "last_updated": None,
                    "memory_keys": []
                }
            
            # Get the most recent update
            latest_update = max(
                datetime.fromisoformat(row["updated_at"].replace('Z', '+00:00')) 
                for row in result.data
            )
            
            return {
                "total_memories": len(result.data),
                "last_updated": latest_update,
                "memory_keys": [row["key"] for row in result.data]
            }
            
        except Exception as e:
            print(f"Error getting profile stats for {memory_profile_id}: {e}")
            return {
                "total_memories": 0,
                "last_updated": None,
                "memory_keys": []
            }

    async def search_memories(self, memory_profile_id: str, search_term: str) -> Dict[str, str]:
        """Buscar memorias que contengan un término específico"""
        try:
            # Supabase doesn't have full text search in the basic plan,
            # so we'll use ilike for pattern matching
            result = self.client.table("long_term_memories").select(
                "key, value"
            ).eq("memory_profile_id", memory_profile_id).or_(
                f"key.ilike.%{search_term}%,value.ilike.%{search_term}%"
            ).execute()
            
            return {row["key"]: row["value"] for row in result.data}
            
        except Exception as e:
            print(f"Error searching memories for profile {memory_profile_id}: {e}")
            return {}

    async def init_db(self):
        """Initialize database - Not needed for Supabase as tables are managed via SQL"""
        # This method is kept for compatibility with the original interface
        # but doesn't need to do anything as Supabase tables are created via SQL
        pass