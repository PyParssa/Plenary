with open("backend/main.py", "r") as f:
    content = f.read()

new_endpoint = """
@app.get("/api/discovery")
async def get_discovery():
    \"\"\"Return the discovery configuration JSON.\"\"\"
    db = get_supabase_admin()
    res = db.table("app_settings").select("value").eq("key", "discovery").maybe_single().execute()
    if res.data and "value" in res.data:
        return res.data["value"]
    
    # Fallback to default if not found (or return empty)
    return {"authors": [], "categories": []}
"""

if "/api/discovery" not in content:
    content = content.replace(
        "@app.get(\"/\")\n@app.get(\"/api/health\")",
        new_endpoint + "\n\n@app.get(\"/\")\n@app.get(\"/api/health\")"
    )
    with open("backend/main.py", "w") as f:
        f.write(content)
    print("Patched main.py")
else:
    print("Already patched")
