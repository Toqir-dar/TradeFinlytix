"""Minimal async in-memory Mongo stand-in for isolated pytest runs."""
from __future__ import annotations

import copy
import re
from functools import cmp_to_key
from typing import Any

from bson import ObjectId
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError


def _normalize_email(em: str) -> str:
    return em.strip().lower()


def _apply_projection(doc: dict[str, Any], projection: dict[str, Any] | None) -> dict[str, Any]:
    if not projection:
        return dict(doc)
    if all(isinstance(v, int) and v == 0 for v in projection.values()):
        out = dict(doc)
        for k in [k for k, v in projection.items() if v == 0]:
            out.pop(k, None)
        return out
    return dict(doc)


def _id_eq(doc_id: Any, q_id: Any) -> bool:
    if doc_id == q_id:
        return True
    try:
        if isinstance(doc_id, ObjectId) and isinstance(q_id, ObjectId):
            return doc_id == q_id
        if isinstance(q_id, ObjectId):
            return doc_id == q_id
        if isinstance(doc_id, ObjectId) and isinstance(q_id, str):
            return doc_id == ObjectId(q_id)
    except Exception:
        pass
    return False


def _matches_field(val: Any, constraint: Any) -> bool:
    if isinstance(constraint, dict):
        if "$regex" in constraint:
            patt = constraint["$regex"]
            opts = constraint.get("$options", "")
            flags = re.IGNORECASE if "i" in opts else 0
            try:
                return bool(re.search(patt, val or "", flags))
            except re.error:
                return False
        if "$gte" in constraint:
            return val >= constraint["$gte"]
        if "$eq" in constraint:
            return _matches_field(val, constraint["$eq"])
        if "$in" in constraint:
            return val in constraint["$in"]
    return val == constraint


class FakeCursor:
    def __init__(
        self, docs: list[dict[str, Any]], projection: dict[str, Any] | None
    ):
        raw = [_apply_projection(copy.deepcopy(d), projection) for d in docs]
        self._rows_before_slice = raw
        self._sort_specs: list[tuple[Any, int]] | None = None
        self._skip = 0
        self._limit: int | None = None

    @staticmethod
    def _cmp_values(va: Any, vb: Any, asc: bool) -> int:
        if va == vb:
            return 0
        try:
            less = va < vb
        except TypeError:
            sa, sb = str(va), str(vb)
            if sa == sb:
                return 0
            less = sa < sb
        if less:
            return -1 if asc else 1
        return 1 if asc else -1

    def sort(self, keyOrList: Any, direction: int | None = None):
        if isinstance(keyOrList, list):
            self._sort_specs = [(k, int(d)) for k, d in keyOrList]
        else:
            direc = direction if direction is not None else -1
            self._sort_specs = [(keyOrList, int(direc))]
        return self

    def skip(self, n: int):
        self._skip = n
        return self

    def limit(self, n: int | None):
        self._limit = n
        return self

    def _final(self) -> list[dict[str, Any]]:
        rows = copy.deepcopy(self._rows_before_slice)
        if self._sort_specs:

            def _cmp_docs(a: dict[str, Any], b: dict[str, Any]) -> int:
                for fld, direc in self._sort_specs or []:
                    asc = direc >= 0
                    c = FakeCursor._cmp_values(a.get(fld), b.get(fld), asc)
                    if c:
                        return c
                return 0

            rows.sort(key=cmp_to_key(_cmp_docs))
        slice_rows = rows[self._skip :]
        if self._limit is not None:
            slice_rows = slice_rows[: self._limit]
        return slice_rows

    def __aiter__(self):
        self._it = iter(self._final())
        return self

    async def __anext__(self):
        try:
            return next(self._it)
        except StopIteration:
            raise StopAsyncIteration


class FakeCollection:
    def __init__(self, name: str, unique_email: bool = False) -> None:
        self.name = name
        self.docs: list[dict[str, Any]] = []
        self.unique_email = unique_email

    async def insert_one(self, doc: dict[str, Any]):
        d = dict(doc)
        if "_id" not in d or d["_id"] is None:
            d["_id"] = ObjectId()
        if self.unique_email and self.name == "users":
            if d.get("email_hash"):
                for ex in self.docs:
                    if ex.get("email_hash") == d.get("email_hash"):
                        raise DuplicateKeyError("duplicate email_hash")
            elif d.get("email"):
                ek = _normalize_email(str(d["email"]))
                for ex in self.docs:
                    if _normalize_email(str(ex.get("email", ""))) == ek:
                        raise DuplicateKeyError("duplicate email")
        self.docs.append(d)
        return type("Ins", (), {"inserted_id": d["_id"]})()

    def _matches(self, doc: dict[str, Any], q: dict[str, Any]) -> bool:
        if not q:
            return True
        for field, constraint in q.items():
            if field == "_id":
                if not _id_eq(doc.get("_id"), constraint):
                    return False
                continue
            if not _matches_field(doc.get(field), constraint):
                return False
        return True

    def _indices(self, q: dict[str, Any]) -> list[int]:
        return [i for i, d in enumerate(self.docs) if self._matches(d, q)]

    async def find_one(
        self,
        q: dict[str, Any],
        projection: dict[str, Any] | None = None,
        sort: list[tuple[Any, Any]] | None = None,
    ) -> dict[str, Any] | None:
        idx = self._indices(q)
        if q and len(idx) == 0:
            return None
        mats = (
            copy.deepcopy([self.docs[i] for i in idx])
            if q
            else copy.deepcopy(list(self.docs))
        )
        if not mats:
            return None
        if sort:
            cur = FakeCursor(mats, None)
            cur.sort(sort if isinstance(sort, list) else [sort])
            final = cur._final()
            pick = final[0] if final else None
        else:
            pick = mats[0]
        return (
            copy.deepcopy(_apply_projection(pick, projection))
            if pick
            else None
        )

    async def count_documents(self, q: dict[str, Any]) -> int:
        return len(self._indices(q))

    def find(self, q: dict[str, Any], projection: dict[str, Any] | None = None):
        mats = [
            copy.deepcopy(self.docs[i]) for i in self._indices(q)
        ]
        return FakeCursor(mats, projection)

    def _apply_update(self, doc: dict[str, Any], upd: dict[str, Any]) -> None:
        for k, dx in upd.get("$inc", {}).items():
            doc[k] = doc.get(k, 0) + dx
        for k, vx in upd.get("$set", {}).items():
            doc[k] = vx

    async def update_one(self, filt: dict[str, Any], upd: dict[str, Any]):
        idx = self._indices(filt)
        if not idx:
            return type("MU", (), {"matched_count": 0})()
        self._apply_update(self.docs[idx[0]], upd)
        return type("MU", (), {"matched_count": 1})()

    async def update_many(self, filt: dict[str, Any], upd: dict[str, Any]):
        n = 0
        for i in self._indices(filt):
            self._apply_update(self.docs[i], upd)
            n += 1
        return type("MM", (), {"matched_count": n})()

    async def find_one_and_update(
        self,
        filt: dict[str, Any],
        upd: dict[str, Any],
        return_document: Any = False,
    ) -> dict[str, Any] | None:
        idx = self._indices(filt)
        if not idx:
            return None
        before = copy.deepcopy(self.docs[idx[0]])
        self._apply_update(self.docs[idx[0]], upd)
        after = copy.deepcopy(self.docs[idx[0]])
        if return_document == ReturnDocument.AFTER:
            return after
        return before


class FakeDatabase:
    def __init__(self) -> None:
        self._cols: dict[str, FakeCollection] = {
            "users": FakeCollection("users", unique_email=True),
            "refresh_tokens": FakeCollection("refresh_tokens"),
            "audit_logs": FakeCollection("audit_logs"),
            "anomaly_logs": FakeCollection("anomaly_logs"),
            "risk_snapshots": FakeCollection("risk_snapshots"),
        }

    def __getitem__(self, name: str) -> FakeCollection:
        if name not in self._cols:
            self._cols[name] = FakeCollection(name)
        return self._cols[name]

    async def command(self, _: Any) -> dict[str, Any]:
        return {"ok": 1.0}
