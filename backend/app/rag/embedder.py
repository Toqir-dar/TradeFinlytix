from __future__ import annotations
from typing import Any
from app.security.anomaly_detection import _embedder

def _log_to_text(doc: dict[str,Any]) -> str:
    event_type = doc.get("event_type", "")
    user_id    = doc.get("user_id", "")
    ip         = doc.get("ip", "")
    path       = doc.get("path", "")
    payload    = str(doc.get("payload", ""))[:300]

    return f"event={event_type} user={user_id} ip={ip} path={path} payload={payload}"

def embed_log_document(doc: dict[str, Any]) -> list[float]:
    text = _log_to_text(doc)
    vector = _embedder.encode(text, normalize_embeddings=True)
    return vector.tolist()
