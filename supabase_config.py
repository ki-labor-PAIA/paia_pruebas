# supabase_config.py
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

class SupabaseConfig:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")
        
        if not self.url or not self.key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")
        
        self.client = create_client(self.url, self.key)
    
    def get_client(self) -> Client:
        return self.client

# Global instance
supabase_client = SupabaseConfig().get_client()