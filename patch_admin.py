with open("backend/admin.py", "r") as f:
    content = f.read()

new_endpoint = """
@router.put("/discovery")
async def update_discovery(
    payload: dict,
    user: AuthenticatedUser = Depends(require_manager),
):
    \"\"\"Update the discovery configuration JSON.\"\"\"
    db = get_supabase_admin()
    
    upsert_data = {
        "key": "discovery",
        "value": payload
    }
    
    try:
        res = db.table("app_settings").upsert(upsert_data).execute()
        return {"ok": True, "data": res.data}
    except Exception as e:
        logger.error(f"Failed to update discovery settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to update discovery settings: {e}"
        )
"""

if "/discovery" not in content:
    content = content + "\n\n" + new_endpoint
    with open("backend/admin.py", "w") as f:
        f.write(content)
    print("Patched admin.py")
else:
    print("Already patched")
