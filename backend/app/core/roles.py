"""
RBAC role definitions and permission matrix.
Roles:
  investor -> standard user
  admin    -> manage users, view audit logs
  ciso     -> full security access, anomaly dashboard
"""
from enum import Enum


class UserRole(str, Enum):
    INVESTOR = "investor"
    ADMIN = "admin"
    CISO = "ciso"


ROLE_PERMISSIONS: dict[UserRole, set[str]] = {
    UserRole.INVESTOR: {
        "predict:read",
        "portfolio:read",
        "portfolio:write",
        "alerts:read",
        "alerts:write",
        "screener:read",
    },
    UserRole.ADMIN: {
        "predict:read",
        "portfolio:read",
        "alerts:read",
        "alerts:write",
        "screener:read",
        "admin:read",
        "admin:write",
        "audit:read",
        "users:read",
        "users:write",
    },
    UserRole.CISO: {
        "predict:read",
        "alerts:read",
        "audit:read",
        "audit:write",
        "anomaly:read",
        "users:read",
        "admin:read",
    },
}


def has_permission(role: UserRole, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())

