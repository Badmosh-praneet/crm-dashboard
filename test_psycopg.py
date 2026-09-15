import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
dsn = os.getenv("DATABASE_URL")

print(f"Connecting to: {dsn}")
try:
    with psycopg.connect(dsn, connect_timeout=10) as conn:
        print("Connected successfully!")
except Exception as e:
    print(f"Connection failed: {e}")
