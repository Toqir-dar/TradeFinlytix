from __future__ import annotations
from typing import Any
import logging
import asyncio
import numpy as np
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.rag.embedder import embed_log_document
from app.utils.mongo_json import json_safe_document

logger = logging.getLogger(__name__)

async def store_embedding(db: AsyncIOMotorDatabase, doc_id, doc: dict[str, Any]) -> None:
    try:
        loop = asyncio.get_event_loop()
        embedding = await loop.run_in_executor(None, embed_log_document, doc)
        await db["audit_logs"].update_one(
                {"_id": doc_id},
                {"$set": {"embedding": embedding}}
            )
    except Exception as e:
            logger.warning("store_embedding failed: %s", e)

def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:

    denom = np.linalg.norm(a) * np.linalg.norm(b)

    if denom == 0:
        return 0.0

    return float(np.dot(a,b)/denom)

async def search_logs(db: AsyncIOMotorDatabase, query: str, top_k: int = 10, candidate_limit: int = 500,) -> list[dict[str,Any]]:

    loop = asyncio.get_event_loop()
    query_vec = np.array(
        await loop.run_in_executor(None,embed_log_document, {"event_type":query, "payload":query})
        )

    cursor = db["audit_logs"].find(
        {"embedding": {"$exists":True}}
    ).limit(candidate_limit)


    scored = []
    async for doc in cursor:
        vec = np.array(doc["embedding"])
        score = _cosine_sim(query_vec, vec)
        scored.append((score, doc))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:top_k]

    results = []
    for score, doc in top:
        doc.pop("embedding", None)
        doc["_score"] = round(score,4)
        results.append(json_safe_document(doc))

    return results