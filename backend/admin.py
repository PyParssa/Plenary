import csv
import io
import json
import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field

from auth import AuthenticatedUser, get_manager_emails, get_supabase_admin, require_manager

logger = logging.getLogger("plenary.admin")

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ==========================================
# Pydantic Request & Response Models
# ==========================================

class AdminCardUpdate(BaseModel):
    question: Optional[str] = None
    backstory: Optional[str] = None
    category: Optional[str] = None
    author: Optional[str] = None
    author_avatar: Optional[str] = None
    author_bio: Optional[str] = None
    book: Optional[str] = None
    related_inquiries: Optional[List[str]] = None
    published: Optional[bool] = None


class BulkImportCard(BaseModel):
    category: str
    author: str
    author_avatar: str = "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80"
    author_bio: Optional[str] = ""
    book: str
    question: str
    backstory: str
    related_inquiries: List[str] = Field(default_factory=list)
    published: bool = True


class BulkImportRequest(BaseModel):
    cards: List[BulkImportCard]


class RoleUpdateRequest(BaseModel):
    role: str


# ==========================================
# Card Management Endpoints
# ==========================================

@router.get("/cards")
async def list_cards(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    category: Optional[str] = Query(None),
    author: Optional[str] = Query(None),
    published: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    user: AuthenticatedUser = Depends(require_manager),
):
    """
    List cards with pagination, sorting, and filters.
    Requires manager role. Returns both published and unpublished cards.
    """
    db = get_supabase_admin()
    
    # Allowed sort fields
    allowed_sorts = {"created_at", "vouch_count", "author", "category", "question", "book"}
    sort_column = sort_by if sort_by in allowed_sorts else "created_at"
    descending = sort_order.lower() == "desc"
    # Execute query with graceful fallback if table lacks published or other columns
    res = None
    try:
        query = db.table("cards").select(
            "id, category, author, author_avatar, author_bio, book, question, backstory, related_inquiries, vouch_count, published, created_by, created_at",
            count="exact"
        )
        if category and category != "All Inquiries":
            query = query.eq("category", category)
        if published is not None:
            query = query.eq("published", published)
        if author:
            query = query.ilike("author", f"%{author.strip()}%")
        if search:
            s = search.strip()
            query = query.or_(f"question.ilike.%{s}%,backstory.ilike.%{s}%,book.ilike.%{s}%,author.ilike.%{s}%")

        query = query.order(sort_column, desc=descending)
        offset = (page - 1) * per_page
        query = query.range(offset, offset + per_page - 1)
        res = query.execute()
    except Exception as e:
        logger.warning(f"Admin list_cards specific select failed: {e}. Falling back to select('*').")
        try:
            fallback_query = db.table("cards").select("*", count="exact")
            if category and category != "All Inquiries":
                fallback_query = fallback_query.eq("category", category)
            if author:
                fallback_query = fallback_query.ilike("author", f"%{author.strip()}%")
            if search:
                s = search.strip()
                fallback_query = fallback_query.or_(f"question.ilike.%{s}%,backstory.ilike.%{s}%,book.ilike.%{s}%,author.ilike.%{s}%")
            fallback_query = fallback_query.order(sort_column, desc=descending)
            offset = (page - 1) * per_page
            fallback_query = fallback_query.range(offset, offset + per_page - 1)
            res = fallback_query.execute()
        except Exception as e2:
            logger.error(f"Admin list_cards fallback failed: {e2}")
            res = db.table("cards").select("*").execute()

    total = getattr(res, "count", None) if getattr(res, "count", None) is not None else len(res.data or [])

    # Map database row format to API response format
    cards = []
    for row in (res.data or []):
        cards.append({
            "id": row.get("id"),
            "category": row.get("category"),
            "author": row.get("author"),
            "authorAvatar": row.get("author_avatar") or "",
            "authorBio": row.get("author_bio") or "",
            "book": row.get("book"),
            "question": row.get("question"),
            "backstory": row.get("backstory"),
            "relatedInquiries": row.get("related_inquiries") or [],
            "vouchCount": row.get("vouch_count", 0),
            "published": row.get("published", True) if row.get("published") is not None else True,
            "createdBy": row.get("created_by"),
            "createdAt": row.get("created_at"),
            "vouched": False,
        })

    return {
        "cards": cards,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.patch("/cards/{card_id}")
async def update_card(
    card_id: str,
    updates: AdminCardUpdate,
    user: AuthenticatedUser = Depends(require_manager),
):
    """Update fields of an existing card (or toggle published status)."""
    db = get_supabase_admin()
    
    update_data: Dict[str, Any] = {}
    if updates.question is not None:
        update_data["question"] = updates.question
    if updates.backstory is not None:
        update_data["backstory"] = updates.backstory
    if updates.category is not None:
        update_data["category"] = updates.category
    if updates.author is not None:
        update_data["author"] = updates.author
    if updates.author_avatar is not None:
        update_data["author_avatar"] = updates.author_avatar
    if updates.author_bio is not None:
        update_data["author_bio"] = updates.author_bio
    if updates.book is not None:
        update_data["book"] = updates.book
    if updates.related_inquiries is not None:
        update_data["related_inquiries"] = updates.related_inquiries
    if updates.published is not None:
        update_data["published"] = updates.published

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided to update.")

    res = db.table("cards").update(update_data).eq("id", card_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Card not found.")

    return {"ok": True, "card": res.data[0]}


@router.delete("/cards/{card_id}")
async def delete_card(
    card_id: str,
    user: AuthenticatedUser = Depends(require_manager),
):
    """Permanently delete a card. Cascades to card vouches and reflections."""
    db = get_supabase_admin()
    
    # Explicitly clean up relations if not cascaded by DB
    try:
        db.table("card_vouches").delete().eq("card_id", card_id).execute()
        db.table("reflection_sessions").delete().eq("card_id", card_id).execute()
    except Exception as e:
        logger.warning(f"Error cleaning up card relations for {card_id}: {e}")

    res = db.table("cards").delete().eq("id", card_id).execute()
    return {"ok": True, "id": card_id}


@router.post("/cards/import")
async def bulk_import_cards(
    payload: BulkImportRequest,
    user: AuthenticatedUser = Depends(require_manager),
):
    """Bulk import cards from JSON payload. Validates each card and inserts."""
    db = get_supabase_admin()
    
    imported = 0
    failed = 0
    errors: List[Dict[str, Any]] = []

    ts = int(time.time())
    for index, item in enumerate(payload.cards):
        try:
            if not item.question.strip() or not item.author.strip() or not item.book.strip() or not item.category.strip():
                raise ValueError("Missing required fields (question, author, book, or category)")

            card_id = f"q-import-{ts}-{index + 1}"
            card_row = {
                "id": card_id,
                "category": item.category.strip(),
                "author": item.author.strip(),
                "author_avatar": item.author_avatar or "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80",
                "author_bio": item.author_bio.strip() if item.author_bio else "",
                "book": item.book.strip(),
                "question": item.question.strip(),
                "backstory": item.backstory.strip(),
                "related_inquiries": item.related_inquiries or [],
                "published": item.published,
                "vouch_count": 0,
                "created_by": user.id,
            }
            db.table("cards").insert(card_row).execute()
            imported += 1
        except Exception as e:
            failed += 1
            errors.append({"index": index, "message": str(e)})

    return {
        "imported": imported,
        "failed": failed,
        "errors": errors,
    }


@router.get("/cards/export")
async def export_cards(
    format: str = Query("json", pattern="^(json|csv)$"),
    category: Optional[str] = Query(None),
    published: Optional[bool] = Query(None),
    user: AuthenticatedUser = Depends(require_manager),
):
    """Export cards as JSON or CSV file download."""
    db = get_supabase_admin()
    
    query = db.table("cards").select("*").order("created_at", desc=True)
    if category and category != "All Inquiries":
        query = query.eq("category", category)
    if published is not None:
        query = query.eq("published", published)

    res = query.execute()
    data = res.data or []

    if format.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "id", "category", "author", "author_avatar", "author_bio",
            "book", "question", "backstory", "related_inquiries",
            "vouch_count", "published", "created_at"
        ])
        for row in data:
            inquiries = row.get("related_inquiries")
            inquiries_str = json.dumps(inquiries) if isinstance(inquiries, (list, dict)) else str(inquiries or "")
            writer.writerow([
                row.get("id", ""),
                row.get("category", ""),
                row.get("author", ""),
                row.get("author_avatar", ""),
                row.get("author_bio", ""),
                row.get("book", ""),
                row.get("question", ""),
                row.get("backstory", ""),
                inquiries_str,
                row.get("vouch_count", 0),
                row.get("published", True),
                row.get("created_at", ""),
            ])
        csv_content = output.getvalue()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=plenary_cards.csv"}
        )

    # JSON export
    json_content = json.dumps(data, indent=2)
    return Response(
        content=json_content,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=plenary_cards.json"}
    )


# ==========================================
# User Management Endpoints
# ==========================================

@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    role: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    user: AuthenticatedUser = Depends(require_manager),
):
    """List registered users with activity stats (vouches, reflections, cards created)."""
    db = get_supabase_admin()
    
    descending = sort_order.lower() == "desc"
    allowed_sorts = {"created_at", "email", "role"}
    sort_column = sort_by if sort_by in allowed_sorts else "created_at"

    res = None
    try:
        query = db.table("profiles").select("id, email, display_name, role, created_at, updated_at", count="exact")
        if role:
            query = query.eq("role", role)
        if search:
            s = search.strip()
            query = query.or_(f"email.ilike.%{s}%,display_name.ilike.%{s}%")
        query = query.order(sort_column, desc=descending)
        offset = (page - 1) * per_page
        query = query.range(offset, offset + per_page - 1)
        res = query.execute()
    except Exception as e:
        logger.warning(f"Admin list_users select failed: {e}. Falling back to basic profile fields.")
        try:
            fallback_query = db.table("profiles").select("id, email, display_name, created_at", count="exact")
            if search:
                s = search.strip()
                fallback_query = fallback_query.or_(f"email.ilike.%{s}%,display_name.ilike.%{s}%")
            fallback_query = fallback_query.order("created_at", desc=descending)
            offset = (page - 1) * per_page
            fallback_query = fallback_query.range(offset, offset + per_page - 1)
            res = fallback_query.execute()
        except Exception as e2:
            logger.error(f"Admin list_users fallback failed: {e2}")
            res = db.table("profiles").select("*").execute()

    profiles = res.data or []
    total = getattr(res, "count", None) if getattr(res, "count", None) is not None else len(profiles)

    # Fetch stats for the users in current page
    user_ids = [p["id"] for p in profiles if "id" in p]
    
    vouch_counts: Dict[str, int] = {}
    reflection_counts: Dict[str, int] = {}
    card_counts: Dict[str, int] = {}

    if user_ids:
        try:
            # Vouches count
            v_res = db.table("card_vouches").select("user_id").in_("user_id", user_ids).execute()
            for row in v_res.data or []:
                uid = row.get("user_id")
                vouch_counts[uid] = vouch_counts.get(uid, 0) + 1

            # Reflections count
            r_res = db.table("reflection_sessions").select("user_id").in_("user_id", user_ids).execute()
            for row in r_res.data or []:
                uid = row.get("user_id")
                reflection_counts[uid] = reflection_counts.get(uid, 0) + 1

            # Cards created count
            c_res = db.table("cards").select("created_by").in_("created_by", user_ids).execute()
            for row in c_res.data or []:
                uid = row.get("created_by")
                if uid:
                    card_counts[uid] = card_counts.get(uid, 0) + 1
        except Exception as e:
            logger.warning(f"Error fetching user stats: {e}")

    manager_emails = get_manager_emails()
    users_with_stats = []
    for p in profiles:
        uid = p.get("id")
        user_email = (p.get("email") or "").strip().lower()
        user_role = "manager" if user_email in manager_emails else p.get("role", "user")
        users_with_stats.append({
            "id": uid,
            "email": p.get("email"),
            "displayName": p.get("display_name"),
            "role": user_role,
            "createdAt": p.get("created_at"),
            "vouchCount": vouch_counts.get(uid, 0),
            "reflectionCount": reflection_counts.get(uid, 0),
            "cardsCreated": card_counts.get(uid, 0),
        })

    return {
        "users": users_with_stats,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    payload: RoleUpdateRequest,
    current_user: AuthenticatedUser = Depends(require_manager),
):
    """Update user role. Enforces valid roles and prevents self-demotion."""
    valid_roles = {"user", "creator", "manager"}
    target_role = payload.role.strip().lower()
    if target_role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )

    # Prevent manager from demoting themselves
    if current_user.id == user_id and target_role != "manager":
        raise HTTPException(
            status_code=400,
            detail="You cannot remove the manager role from your own account."
        )

    db = get_supabase_admin()
    manager_emails = get_manager_emails()

    # Prevent demoting any user configured in manager_emails environment variable
    target_profile_res = db.table("profiles").select("email").eq("id", user_id).maybe_single().execute()
    if target_profile_res.data:
        target_email = (target_profile_res.data.get("email") or "").strip().lower()
        if target_email in manager_emails and target_role != "manager":
            raise HTTPException(
                status_code=400,
                detail="Cannot demote an administrator configured in manager emails environment."
            )

    res = db.table("profiles").update({
        "role": target_role,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", user_id).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="User profile not found.")

    return {"ok": True, "id": user_id, "role": target_role}


# ==========================================
# Analytics Overview Endpoint
# ==========================================

@router.get("/analytics")
async def get_analytics(user: AuthenticatedUser = Depends(require_manager)):
    """Return dashboard analytics overview."""
    db = get_supabase_admin()
    
    # Total registered users
    users_res = db.table("profiles").select("id", count="exact").execute()
    total_users = users_res.count if users_res.count is not None else 0

    # Total & published card counts
    cards_res = db.table("cards").select("id, published", count="exact").execute()
    total_cards = cards_res.count if cards_res.count is not None else 0
    
    published_res = db.table("cards").select("id", count="exact").eq("published", True).execute()
    published_cards = published_res.count if published_res.count is not None else 0
    unpublished_cards = max(0, total_cards - published_cards)

    # Vouches total, today, this week
    vouches_res = db.table("card_vouches").select("id, created_at", count="exact").execute()
    total_vouches = vouches_res.count if vouches_res.count is not None else 0

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_start = (now - timedelta(days=7)).isoformat()

    try:
        today_vouches_res = db.table("card_vouches").select("user_id", count="exact").gte("created_at", today_start).execute()
        vouches_today = today_vouches_res.count if today_vouches_res.count is not None else 0
    except Exception:
        vouches_today = 0

    try:
        week_vouches_res = db.table("card_vouches").select("user_id", count="exact").gte("created_at", week_start).execute()
        vouches_this_week = week_vouches_res.count if week_vouches_res.count is not None else 0
    except Exception:
        vouches_this_week = 0

    # Top 10 cards by vouch_count
    top_cards_res = (
        db.table("cards")
        .select("id, question, author, category, vouch_count, published")
        .order("vouch_count", desc=True)
        .limit(10)
        .execute()
    )
    top_cards = []
    for c in top_cards_res.data or []:
        top_cards.append({
            "id": c.get("id"),
            "question": c.get("question"),
            "author": c.get("author"),
            "category": c.get("category"),
            "vouchCount": c.get("vouch_count", 0),
            "published": c.get("published", True),
        })

    # Most active reflectors (top 10 by session count)
    most_active_reflectors = []
    try:
        reflections = db.table("reflection_sessions").select("user_id").execute()
        user_ref_counts: Dict[str, int] = {}
        for r in reflections.data or []:
            uid = r.get("user_id")
            if uid:
                user_ref_counts[uid] = user_ref_counts.get(uid, 0) + 1
        
        sorted_reflectors = sorted(user_ref_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        reflector_ids = [uid for uid, _ in sorted_reflectors]
        
        email_map: Dict[str, str] = {}
        if reflector_ids:
            p_res = db.table("profiles").select("id, email, display_name").in_("id", reflector_ids).execute()
            for p in p_res.data or []:
                email_map[p["id"]] = p.get("display_name") or p.get("email") or "Anonymous"

        for uid, count in sorted_reflectors:
            most_active_reflectors.append({
                "id": uid,
                "email": email_map.get(uid, "Unknown User"),
                "reflectionCount": count,
            })
    except Exception as e:
        logger.warning(f"Error computing top reflectors: {e}")

    return {
        "totalUsers": total_users,
        "totalCards": total_cards,
        "publishedCards": published_cards,
        "unpublishedCards": unpublished_cards,
        "totalVouches": total_vouches,
        "vouchesToday": vouches_today,
        "vouchesThisWeek": vouches_this_week,
        "topCards": top_cards,
        "mostActiveReflectors": most_active_reflectors,
    }
