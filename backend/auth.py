import os
from typing import Optional
from fastapi import Header, HTTPException, Depends, status
from pydantic import BaseModel
from supabase import Client, create_client


def get_supabase_admin() -> Client:
    """Returns an authenticated Supabase admin client using the service role key."""
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_role_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase is not configured on the server.",
        )
    return create_client(supabase_url, service_role_key)


def get_manager_emails() -> set:
    """Returns the set of email addresses configured with manager privileges."""
    raw = os.getenv("VITE_MANAGER_EMAILS") or os.getenv("MANAGER_EMAILS") or ""
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def extract_bearer_token(authorization: Optional[str]) -> str:
    """Extracts the Bearer token string from an Authorization header."""
    if not authorization:
        return ""
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    if authorization.startswith("Bearer "):
        return authorization[7:].strip()
    return ""


class AuthenticatedUser(BaseModel):
    """Represents a verified user extracted from Supabase JWT and profiles table."""
    id: str
    email: str
    role: str = "user"


async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> AuthenticatedUser:
    """Extract and verify user from Bearer token. Returns AuthenticatedUser."""
    token = extract_bearer_token(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Bearer token"
        )
    
    admin_client: Client = get_supabase_admin()
    
    try:
        user_response = admin_client.auth.get_user(token)
        user = getattr(user_response, "user", None)
        if not user or not getattr(user, "id", None):
            raise ValueError("No user found")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user_id = str(user.id)
    user_email = (getattr(user, "email", "") or "").strip().lower()
    manager_emails = get_manager_emails()

    # If user's email is in manager_emails environment variable, grant full manager privileges
    if user_email and user_email in manager_emails:
        role = "manager"
    else:
        # Fetch role from profiles table
        role = "user"
        try:
            profile_res = (
                admin_client.table("profiles")
                .select("role")
                .eq("id", user_id)
                .maybe_single()
                .execute()
            )
            if profile_res.data and isinstance(profile_res.data, dict):
                role = profile_res.data.get("role", "user") or "user"
        except Exception:
            pass
    
    return AuthenticatedUser(
        id=user_id,
        email=user_email,
        role=role
    )


async def require_manager(
    user: AuthenticatedUser = Depends(get_current_user)
) -> AuthenticatedUser:
    """Dependency that enforces manager role. Returns 403 if not manager."""
    manager_emails = get_manager_emails()
    is_manager = (user.email.strip().lower() in manager_emails) or (user.role == "manager")
    if not is_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager role required"
        )
    return user


