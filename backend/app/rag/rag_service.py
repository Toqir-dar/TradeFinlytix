from __future__ import annotations
from typing import Any
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.config import settings
from app.core.http_client import get_http_client
from app.rag.retriever import search_logs

logger = logging.getLogger(__name__)

def _build_context(logs: list[dict[str, Any]]) -> str:
    lines = []
    for log in logs:
        line = (
            f"[{log.get('created_at', '')}] "
            f"event={log.get('event_type', '')} "
            f"user={log.get('user_id', '')} "
            f"ip={log.get('ip', '')} "
            f"path={log.get('path', '')} "
            f"score={log.get('_score', '')}"
        )
        lines.append(line)
    return "\n".join(lines)

async def _call_groq(question: str, context: str) -> str:
    try: 
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {"Authorization": f"Bearer {settings.groq_api_key}"}
        body = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {
                    "role": "system",
                    "content": "You are a security analyst. Answer only from the provided audit logs. Be concise."
                },
                {
                    "role": "user",
                    "content": f"Logs:\n{context}\n\nQuestion: {question}"
                }
            ]
        }

        client = get_http_client()
        response = await client.post(url, headers=headers, json=body, timeout=30.0)
        return response.json()["choices"][0]["message"]["content"].strip()

    except Exception as e:
        logger.warning("_call_groq failed: %s", e)
        return ""

async def answer_query(db: AsyncIOMotorDatabase, question: str, top_k: int = 10,) -> dict[str, Any]:

    logs = await search_logs(db, question, top_k=top_k)
    if not logs:
        return {"answer": "No relevant logs found.", "sources": []}
    context = _build_context(logs)
    answer = await _call_groq(question, context)

    return {"answer": answer, "sources": logs}



