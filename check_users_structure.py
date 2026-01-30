
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY')

supabase = create_client(url, key)

print("Checking users table structure...")
try:
    res = supabase.table('users').select("*").limit(1).execute()
    if res.data:
        print(f"Sample row: {res.data[0]}")
        print(f"Keys: {res.data[0].keys()}")
    else:
        print("Empty users table")
except Exception as e:
    print(f"Error: {e}")
