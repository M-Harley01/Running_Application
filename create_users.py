from supabase import create_client, Client

SUPABASE_URL = "https://bovysxoljjwihxmkdzbi.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvdnlzeG9samp3aWh4bWtkemJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTgzNzA3OCwiZXhwIjoyMDg3NDEzMDc4fQ.XqdT7MyRsSWxNBCcSQ-G-AZVTxLuNkxr040xRkJE808"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

users = [
    {"email": "test1@example.com", "password": "Password123!"},
    {"email": "test2@example.com", "password": "Password123!"},
    {"email": "test3@example.com", "password": "Password123!"},
    {"email": "test4@example.com", "password": "Password123!"},
    {"email": "test5@example.com", "password": "Password123!"},
    {"email": "test6@example.com", "password": "Password123!"},
]

for user in users:
    try:
        response = supabase.auth.admin.create_user({
            "email": user["email"],
            "password": user["password"],
            "email_confirm": True,
        })
        print(f"Created: {user['email']}")
    except Exception as e:
        print(f"Failed: {user['email']} -> {e}")