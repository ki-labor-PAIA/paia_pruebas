
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY')

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found in .env")
    exit(1)

supabase = create_client(url, key)

tables_to_check = ['users', 'user_credentials', 'agents']

for table in tables_to_check:
    print(f"Checking table: {table}")
    try:
        res = supabase.table(table).select("*").limit(1).execute()
        print(f"  Result: Found {len(res.data)} rows (Success)")
    except Exception as e:
        print(f"  Error: {e}")
