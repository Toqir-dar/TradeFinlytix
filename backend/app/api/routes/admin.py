"""Admin-only user management endpoints.

RBAC: separate from CISO-only audit/anomaly dashboards — admins manage accounts;
fraud/audit chain tooling remains under `/ciso/*` (fine-grained object-level ACL
can extend this later beyond role ceilings).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request

from app.api.dependencies import require_permission
from app.core.database import get_db
from app.rag.retriever import store_embedding
from app.schemas.admin_schema import PaginatedUsers, PasswordResetResponse, UserSummary
from app.services.admin_service import AdminService
from app.utils.helpers import get_client_ip

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    responses={
        401: {"description": "Missing/invalid bearer token"},
        403: {"description": "Role **admin** required, or forbidden target user"},
    },
)


def _svc(db) -> AdminService:
    return AdminService(db)


@router.get("/users", response_model=PaginatedUsers)
async def list_users(
    _: dict = Depends(require_permission("admin:read")),
    db=Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    role: str | None = None,
    is_active: bool | None = None,
    q: str | None = None,
):
    """Paginated directory of users (investor-facing fields only — no password hashes)."""
    return await _svc(db).list_users(
        skip=skip, limit=limit, role=role, is_active=is_active, q=q
    )


@router.get("/users/{user_id}", response_model=UserSummary)
async def get_user(user_id: str, _: dict = Depends(require_permission("admin:read")), db=Depends(get_db)):
    return await _svc(db).get_user(user_id)


@router.post("/users/{user_id}/deactivate", response_model=UserSummary)
async def deactivate_user(
    user_id: str,
    request: Request,
    admin: dict = Depends(require_permission("admin:write")),
    db=Depends(get_db),
):
    ip = get_client_ip(request)
    return await _svc(db).deactivate_user(
        actor=admin,
        target_id=user_id,
        actor_ip=ip,
        actor_path=request.url.path,
    )


@router.post("/users/{user_id}/activate", response_model=UserSummary)
async def activate_user(
    user_id: str,
    request: Request,
    admin: dict = Depends(require_permission("admin:write")),
    db=Depends(get_db),
):
    ip = get_client_ip(request)
    return await _svc(db).activate_user(
        actor=admin,
        target_id=user_id,
        actor_ip=ip,
        actor_path=request.url.path,
    )


@router.post("/users/{user_id}/reset-password", response_model=PasswordResetResponse)
async def reset_user_password(
    user_id: str,
    request: Request,
    admin: dict = Depends(require_permission("admin:write")),
    db=Depends(get_db),
):
    ip = get_client_ip(request)
    return await _svc(db).reset_password(
        actor=admin,
        target_id=user_id,
        actor_ip=ip,
        actor_path=request.url.path,
    )


@router.get("/users/{user_id}/activity")
async def user_activity(
    user_id: str,
    _: dict = Depends(require_permission("admin:read")),
    db=Depends(get_db),
    limit: int = Query(50, ge=1, le=500),
):
    return await _svc(db).user_activity(user_id, limit=limit)


@router.post("/audit/backfill-embeddings")
async def backfill_audit_embeddings(
    _: dict = Depends(require_permission("admin:write")),
    db=Depends(get_db),
    limit: int = Query(1000, ge=1, le=10000, description="Max documents to backfill"),
):
    """Backfill embedding vectors for audit_log documents that are missing them."""
    cursor = db["audit_logs"].find(
        {"embedding": {"$exists": False}},
        projection={"embedding": 0},
    ).limit(limit)

    queued = 0
    async for doc in cursor:
        doc_id = doc["_id"]
        await store_embedding(db, doc_id, doc)
        queued += 1

    return {"backfilled": queued}


@router.get("/audit/rag-status")
async def rag_status(
    _: dict = Depends(require_permission("admin:read")),
    db=Depends(get_db),
):
    """Diagnose RAG search — shows document and embedding counts."""
    total = await db["audit_logs"].count_documents({})
    with_embedding = await db["audit_logs"].count_documents({"embedding": {"$exists": True}})
    without_embedding = total - with_embedding
    sample = await db["audit_logs"].find_one({"embedding": {"$exists": True}}, {"embedding": 0})
    return {
        "total_audit_docs": total,
        "docs_with_embedding": with_embedding,
        "docs_without_embedding": without_embedding,
        "rag_will_find_results": with_embedding > 0,
        "sample_doc_fields": list(sample.keys()) if sample else [],
    }
