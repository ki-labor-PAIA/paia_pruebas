
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY')

supabase = create_client(url, key)

# We can't easily get table structure via client, 
# but we can try to get one row and see types or use RPC if exists.
# Better yet, let's just try to create the table with reasonable types.

sql = """
CREATE TABLE IF NOT EXISTS public.user_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    credentials JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, provider)
);

-- Indice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON public.user_credentials(user_id);

COMMENT ON TABLE user_credentials IS 'Almacena credenciales OAuth (tokens) de los usuarios para diferentes proveedores';
"""

print("Please run the following SQL in the Supabase SQL Editor:")
print(sql)
