
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY')

supabase = create_client(url, key)

print("Checking full schema of users table...")
# Use an RPC if we had one, but let's try to infer from data
try:
    res = supabase.table('users').select("*").limit(1).execute()
    if res.data:
        uid = res.data[0]['id']
        print(f"ID value: '{uid}'")
        print(f"ID type in Python: {type(uid)}")
    else:
        print("Empty users table, cannot infer type from data")
except Exception as e:
    print(f"Error: {e}")
