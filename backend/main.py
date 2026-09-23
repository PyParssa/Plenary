import logging
import os
import re
import secrets
import time
import urllib.parse
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from supabase import Client, create_client

# Load environment variables from .env file if present
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("plenary.backend")

# Initialize FastAPI App
app = FastAPI(
    title="Plenary API",
    description="Production-ready FastAPI backend for Plenary inquiry and reflection engine.",
    version="1.0.0",
)

# Custom Exception Handler to return both 'detail' and 'error' keys
# to ensure compatibility with standard FastAPI consumers and the Plenary frontend.
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error": exc.detail},
    )

# Configure CORS
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    allowed_origins = [
        origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()
    ]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from admin import router as admin_router
from auth import extract_bearer_token, get_manager_emails, get_supabase_admin

# Mount routers
app.include_router(admin_router)


# ==========================================
# Helpers & Dependency Utilities
# ==========================================

def is_production() -> bool:
    env = (os.getenv("NODE_ENV") or os.getenv("ENVIRONMENT") or "").lower()
    return env == "production" or os.getenv("RENDER") is not None


# ==========================================
# Models
# ==========================================

class ApiSettings(BaseModel):
    provider: Optional[str] = None
    apiKey: Optional[str] = None
    model: Optional[str] = None


class CardItem(BaseModel):
    category: str = ""
    author: str = ""
    book: str = ""
    question: str = ""
    backstory: str = ""
    relatedInquiries: List[str] = Field(default_factory=list)


class ChatMessage(BaseModel):
    role: str
    content: str


class SocraticReflectRequest(BaseModel):
    apiSettings: Optional[ApiSettings] = None
    cards: Optional[List[CardItem]] = None
    messages: Optional[List[ChatMessage]] = None
    currentTurn: Optional[int] = None


class RequestCodeRequest(BaseModel):
    email: Optional[str] = None


class VerifyCodeRequest(BaseModel):
    email: Optional[str] = None
    code: Optional[str] = None
    selectedAtmospheres: Optional[List[Any]] = None


class PendingCode(BaseModel):
    code: str
    expires_at: float
    attempts: int = 0


# In-memory verification code store (email -> PendingCode)
pending_codes: Dict[str, PendingCode] = {}


def normalize_email(value: Any) -> Optional[str]:
    if not isinstance(value, str):
        return None
    email = value.strip().lower()
    if re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        return email
    return None


# ==========================================
# Endpoints
# ==========================================

@app.get("/")
@app.get("/api/health")
async def health_check():
    """Health status endpoint."""
    return {
        "status": "ok",
        "time": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/account/bootstrap", status_code=status.HTTP_204_NO_CONTENT)
async def account_bootstrap(authorization: Optional[str] = Header(None)):
    """
    Authenticate Bearer access_token with Supabase admin client.
    Upsert user into the 'profiles' table with id, email, display_name, updated_at.
    """
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    access_token = extract_bearer_token(authorization)

    if not access_token or not supabase_url or not service_role_key:
        if not supabase_url or not service_role_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Account bootstrap is not configured on the server.",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session is invalid or missing an email.",
        )

    try:
        admin_client = create_client(supabase_url, service_role_key)
        user_res = admin_client.auth.get_user(access_token)
        user = getattr(user_res, "user", None)
    except Exception as e:
        logger.error(f"Account bootstrap user retrieval error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session is invalid or missing an email.",
        )

    if not user or not getattr(user, "email", None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session is invalid or missing an email.",
        )

    user_metadata = getattr(user, "user_metadata", None) or {}
    display_name = (
        user_metadata.get("display_name")
        if isinstance(user_metadata.get("display_name"), str)
        else (
            user_metadata.get("full_name")
            if isinstance(user_metadata.get("full_name"), str)
            else None
        )
    )

    manager_emails = get_manager_emails()
    is_env_manager = user.email.strip().lower() in manager_emails

    upsert_data = {
        "id": str(user.id),
        "email": user.email,
        "display_name": display_name,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if is_env_manager:
        upsert_data["role"] = "manager"

    try:
        admin_client.table("profiles").upsert(upsert_data).execute()
    except Exception as e:
        logger.error(f"Profiles upsert error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post("/api/account/delete", status_code=status.HTTP_204_NO_CONTENT)
async def account_delete(authorization: Optional[str] = Header(None)):
    """
    Authenticate Bearer access_token.
    Delete cards created by user and delete the user via admin auth.
    """
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    access_token = extract_bearer_token(authorization)

    if not access_token or not supabase_url or not service_role_key:
        if not supabase_url or not service_role_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Account deletion is not configured on the server.",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session is invalid or expired.",
        )

    try:
        admin_client = create_client(supabase_url, service_role_key)
        user_res = admin_client.auth.get_user(access_token)
        user = getattr(user_res, "user", None)
    except Exception as e:
        logger.error(f"Account delete user retrieval error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session is invalid or expired.",
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session is invalid or expired.",
        )

    user_id = str(user.id)
    try:
        admin_client.table("cards").delete().eq("created_by", user_id).execute()
    except Exception as e:
        logger.error(f"Failed deleting cards for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

    try:
        admin_client.auth.admin.delete_user(user_id)
    except Exception as e:
        logger.error(f"Failed deleting auth user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ==========================================
# Socratic AI Providers
# ==========================================

async def call_openai(
    client: httpx.AsyncClient,
    api_key: str,
    model: str,
    system_prompt: str,
    messages: List[ChatMessage],
) -> str:
    formatted_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        role = "assistant" if msg.role == "model" else "user"
        formatted_messages.append({"role": role, "content": msg.content})

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": formatted_messages,
    }
    response = await client.post(
        "https://api.openai.com/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=60.0,
    )
    data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
    if not response.is_success:
        err_msg = data.get("error", {}).get("message") if isinstance(data.get("error"), dict) else None
        raise RuntimeError(err_msg or f"OpenAI returned {response.status_code}")

    choices = data.get("choices") or []
    if choices and choices[0].get("message", {}).get("content"):
        return choices[0]["message"]["content"]
    return "The model returned an empty reflection."


async def call_anthropic(
    client: httpx.AsyncClient,
    api_key: str,
    model: str,
    system_prompt: str,
    messages: List[ChatMessage],
) -> str:
    formatted_messages = []
    for msg in messages:
        role = "assistant" if msg.role == "model" else "user"
        formatted_messages.append({"role": role, "content": msg.content})

    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
        "anthropic-dangerous-direct-browser-access": "true",
    }
    payload = {
        "model": model,
        "max_tokens": 700,
        "system": system_prompt,
        "messages": formatted_messages,
    }
    response = await client.post(
        "https://api.anthropic.com/v1/messages",
        headers=headers,
        json=payload,
        timeout=60.0,
    )
    data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
    if not response.is_success:
        err_msg = data.get("error", {}).get("message") if isinstance(data.get("error"), dict) else None
        raise RuntimeError(err_msg or f"Anthropic returned {response.status_code}")

    content_list = data.get("content") or []
    parts = [part.get("text", "") for part in content_list if isinstance(part, dict)]
    return "".join(parts) or "The model returned an empty reflection."


async def call_gemini(
    client: httpx.AsyncClient,
    api_key: str,
    model: str,
    system_prompt: str,
    messages: List[ChatMessage],
) -> str:
    formatted_contents = []
    for msg in messages:
        role = "model" if msg.role == "model" else "user"
        formatted_contents.append({"role": role, "parts": [{"text": msg.content}]})

    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": formatted_contents,
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{urllib.parse.quote(model)}:generateContent?key={urllib.parse.quote(api_key)}"
    headers = {"Content-Type": "application/json"}

    response = await client.post(url, headers=headers, json=payload, timeout=60.0)
    data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
    if not response.is_success:
        err_msg = data.get("error", {}).get("message") if isinstance(data.get("error"), dict) else None
        raise RuntimeError(err_msg or f"Gemini returned {response.status_code}")

    candidates = data.get("candidates") or []
    if candidates and isinstance(candidates[0], dict):
        content = candidates[0].get("content") or {}
        parts = content.get("parts") or []
        text_parts = [p.get("text", "") for p in parts if isinstance(p, dict)]
        return "".join(text_parts) or "The model returned an empty reflection."
    return "The model returned an empty reflection."


@app.post("/api/socratic-reflect")
async def socratic_reflect(req: SocraticReflectRequest):
    """
    Handle Socratic reflection request by constructing prompt from card context
    and invoking the selected AI provider (OpenAI, Anthropic, or Gemini).
    """
    api_settings = req.apiSettings
    provider = (api_settings.provider or "").strip().lower() if api_settings else ""
    api_key = (api_settings.apiKey or "").strip() if api_settings else ""
    model = (api_settings.model or "").strip() if api_settings else ""
    cards = req.cards or []

    if (
        not api_key
        or not model
        or not cards
        or provider not in ("openai", "anthropic", "gemini")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Add a provider, model, and API key in Account before starting reflection.",
        )

    card_context_lines = []
    for idx, card in enumerate(cards):
        related = " | ".join(card.relatedInquiries)
        card_context_lines.append(
            f"{idx + 1}. [{card.category}] {card.author}, {card.book}: {card.question}\n"
            f"Context: {card.backstory}\n"
            f"Related: {related}"
        )
    card_context = "\n\n".join(card_context_lines)

    system_prompt = (
        f"You are a critical thinker and a Plenary Socratic AI. These are the inquiry cards the user vouched for:\n\n"
        f"{card_context}\n\n"
        f"Talk with the user through these cards. Ask precise, challenging Socratic questions, identify assumptions, "
        f"test contradictions, and connect their answers to the cards without preaching or giving shallow advice. "
        f"Keep each response focused and conversational. Do not claim to be a therapist or make clinical judgments."
    )

    messages = req.messages or []

    try:
        async with httpx.AsyncClient() as client:
            if provider == "openai":
                reply = await call_openai(client, api_key, model, system_prompt, messages)
            elif provider == "anthropic":
                reply = await call_anthropic(client, api_key, model, system_prompt, messages)
            else:
                reply = await call_gemini(client, api_key, model, system_prompt, messages)

        return {"reply": reply}
    except Exception as e:
        logger.error(f"Socratic AI provider error ({provider}): {e}")
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={"error": "The selected AI provider could not complete the reflection."},
        )


# ==========================================
# Email Verification & Waitlist Code Store
# ==========================================

@app.post("/api/auth/request-code")
async def request_code(body: RequestCodeRequest):
    """
    Generate a 6-digit verification code (10 min expiry) and send via Resend API.
    In development or when RESEND_API_KEY is missing, return developmentCode.
    """
    email = normalize_email(body.email)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enter a valid email address.",
        )

    code = f"{secrets.randbelow(900000) + 100000}"
    pending_codes[email] = PendingCode(
        code=code,
        expires_at=time.time() + 10 * 60,
        attempts=0,
    )

    resend_api_key = os.getenv("RESEND_API_KEY")
    resend_from_email = os.getenv("RESEND_FROM_EMAIL")
    prod = is_production()

    # If email service is not configured
    if not resend_api_key or not resend_from_email:
        if not prod:
            return {"ok": True, "developmentCode": code}
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email delivery is not configured yet.",
        )

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": resend_from_email,
                    "to": [email],
                    "subject": "Your Plenary verification code",
                    "text": f"Your Plenary verification code is {code}. It expires in 10 minutes.",
                },
                timeout=10.0,
            )
            if not res.is_success:
                raise RuntimeError(f"Resend returned {res.status_code}: {res.text}")

        resp_payload: Dict[str, Any] = {"ok": True}
        if not prod and not resend_api_key:
            resp_payload["developmentCode"] = code
        return resp_payload
    except Exception as e:
        logger.error(f"Verification email error: {e}")
        if not prod:
            return {"ok": True, "developmentCode": code, "deliveryFallback": True}
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email delivery is not configured yet.",
        )


@app.post("/api/auth/verify-code")
async def verify_code(body: VerifyCodeRequest):
    """
    Validate email and 6-digit code.
    If valid, post signup webhook to Google Sheets, consume code, and return {ok: True, email}.
    """
    email = normalize_email(body.email)
    code = (body.code or "").strip()
    raw_atmospheres = body.selectedAtmospheres if isinstance(body.selectedAtmospheres, list) else []
    selected_atmospheres = [
        item for item in raw_atmospheres if isinstance(item, str)
    ][:3]

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That code is invalid or expired.",
        )

    pending = pending_codes.get(email)
    now = time.time()
    if (
        not pending
        or pending.expires_at < now
        or pending.attempts >= 5
        or code != pending.code
    ):
        if pending:
            pending.attempts += 1
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That code is invalid or expired.",
        )

    webhook_url = os.getenv("GOOGLE_SHEETS_WEBHOOK_URL") or os.getenv("GOOGLE_APPS_SCRIPT_WEBHOOK_URL")
    secret = os.getenv("GOOGLE_SHEETS_WEBHOOK_SECRET") or ""
    prod = is_production()

    if webhook_url:
        try:
            async with httpx.AsyncClient() as client:
                webhook_payload = {
                    "action": "append_signup",
                    "secret": secret,
                    "email": email,
                    "selectedAtmospheres": selected_atmospheres,
                    "createdAt": datetime.now(timezone.utc).isoformat(),
                }
                headers = {
                    "Content-Type": "application/json",
                    "X-Plenary-Webhook-Secret": secret,
                }
                res = await client.post(
                    webhook_url,
                    json=webhook_payload,
                    headers=headers,
                    timeout=15.0,
                )
                if not res.is_success:
                    details = res.text[:240]
                    raise RuntimeError(f"Google Sheets webhook returned {res.status_code}: {details}")
        except Exception as e:
            logger.error(f"Signup sheet error: {e}")
            err_msg = (
                f"Your code was correct, but signup storage failed: {e}"
                if not prod
                else "Your code was correct, but signup storage is unavailable."
            )
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=err_msg,
            )

    # Consume pending code
    pending_codes.pop(email, None)
    return {"ok": True, "email": email}
