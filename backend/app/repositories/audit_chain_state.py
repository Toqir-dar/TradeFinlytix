"""
Process-local flag: when strict mode is enabled, audit log appends can be halted
after a failed chain verification (startup or explicit verify).
"""

from __future__ import annotations

_chain_trusted: bool = True


def set_audit_chain_trusted(ok: bool) -> None:
    global _chain_trusted
    _chain_trusted = ok


def audit_chain_append_allowed() -> bool:
    """If False (chain known broken), record() becomes a no-op when strict."""
    global _chain_trusted
    return _chain_trusted


def reset_audit_chain_trusted() -> None:
    global _chain_trusted
    _chain_trusted = True
