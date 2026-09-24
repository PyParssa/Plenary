import os
import json
from supabase import create_client
from dotenv import load_dotenv

# load root .env
load_dotenv("../.env")

supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
# fallback to anon key for reading, but we need service key or anon key to write?
# if RLS allows public writes? No.
# let's check if the python backend can just use the anon key if we disable RLS temporarily or if manager role works.
