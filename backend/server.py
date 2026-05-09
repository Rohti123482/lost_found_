from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import math
import re
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
import requests
from bson import ObjectId
from fastapi import (
    APIRouter,
    FastAPI,
    File,
    Form,
    HTTPException,
    Header,
    Query,
    Request,
    Response,
    UploadFile,
)
from fastapi.responses import Response as FastAPIResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@findr.app")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
NGO_EMAIL = os.environ.get("NGO_EMAIL", "ngo@findr.app")
NGO_PASSWORD = os.environ.get("NGO_PASSWORD", "ngo123")
APP_NAME = os.environ.get("APP_NAME", "lostfound")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Universal Lost & Found Recovery API")
api = APIRouter(prefix="/api")

# ----------------------------------------------------------------------------
# Object Storage
# ----------------------------------------------------------------------------
storage_key: Optional[str] = None


def init_storage() -> Optional[str]:
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_LLM_KEY:
        logger.warning("EMERGENT_LLM_KEY not set — uploads will fail")
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Object storage initialized")
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Storage not available")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if resp.status_code == 403:
        # refresh key and retry once
        global storage_key
        storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Storage not available")
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 403:
        global storage_key
        storage_key = None
        key = init_storage()
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ----------------------------------------------------------------------------
# Auth helpers
# ----------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=4),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=4 * 3600, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=7 * 24 * 3600, path="/")


def clear_auth_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


def serialize_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name", ""),
        "role": user.get("role", "user"),
        "ngo_name": user.get("ngo_name"),
        "phone": user.get("phone"),
        "alert_radius_km": user.get("alert_radius_km", 5),
        "alert_lat": user.get("alert_lat"),
        "alert_lng": user.get("alert_lng"),
        "created_at": user.get("created_at").isoformat() if isinstance(user.get("created_at"), datetime) else user.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


def require_roles(user: dict, allowed: List[str]):
    if user.get("role") not in allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")


# ----------------------------------------------------------------------------
# Schemas
# ----------------------------------------------------------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: str = "user"  # "user" or "ngo"
    ngo_name: Optional[str] = None
    phone: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    alert_radius_km: Optional[float] = None
    alert_lat: Optional[float] = None
    alert_lng: Optional[float] = None


class ReportIn(BaseModel):
    report_type: str  # "lost" | "found"
    entity_type: str  # "pet" | "person" | "object" | "dog" | "cat"
    name: Optional[str] = None
    description: str
    color: Optional[str] = None
    latitude: float
    longitude: float
    location_text: Optional[str] = None
    contact: str
    date: Optional[str] = None
    photo_urls: List[str] = []


class ReportUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_text: Optional[str] = None
    contact: Optional[str] = None
    date: Optional[str] = None
    photo_urls: Optional[List[str]] = None
    status: Optional[str] = None  # active | resolved | sheltered


class CaseStatusIn(BaseModel):
    status: str  # claimed | sheltered | reunified | closed
    notes: Optional[str] = None


# ----------------------------------------------------------------------------
# Utilities — distance + matching
# ----------------------------------------------------------------------------
def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


_STOPWORDS = set("the a an and or for with of to in on at is are was were have has had it its".split())


def keywords(text: str) -> set:
    if not text:
        return set()
    words = re.findall(r"[a-zA-Z]+", text.lower())
    return {w for w in words if len(w) > 2 and w not in _STOPWORDS}


def match_score(a: dict, b: dict) -> dict:
    """Score from 0-100 based on entity_type, color, distance, keyword overlap."""
    score = 0.0
    factors = {}
    # Entity type — must match for any reasonable score
    if (a.get("entity_type") or "").lower() == (b.get("entity_type") or "").lower():
        score += 30
        factors["entity_type"] = 30
    # Color
    if a.get("color") and b.get("color"):
        ac = a["color"].lower()
        bc = b["color"].lower()
        if ac == bc:
            score += 25
            factors["color"] = 25
        elif ac in bc or bc in ac:
            score += 15
            factors["color"] = 15
    # Distance
    d_km = haversine_km(a["latitude"], a["longitude"], b["latitude"], b["longitude"])
    factors["distance_km"] = round(d_km, 2)
    if d_km <= 1:
        score += 25
    elif d_km <= 5:
        score += 18
    elif d_km <= 15:
        score += 10
    elif d_km <= 50:
        score += 5
    # Keyword overlap on description + name
    ak = keywords(" ".join([a.get("description", ""), a.get("name") or ""]))
    bk = keywords(" ".join([b.get("description", ""), b.get("name") or ""]))
    if ak and bk:
        overlap = len(ak & bk) / max(1, len(ak | bk))
        kw = round(overlap * 20, 1)
        score += kw
        factors["keywords"] = kw
    return {"score": round(min(score, 100), 1), "factors": factors, "distance_km": round(d_km, 2)}


def serialize_report(r: dict) -> dict:
    return {
        "id": str(r["_id"]),
        "user_id": str(r.get("user_id", "")),
        "owner_name": r.get("owner_name", ""),
        "report_type": r.get("report_type"),
        "entity_type": r.get("entity_type"),
        "name": r.get("name"),
        "description": r.get("description"),
        "color": r.get("color"),
        "latitude": r.get("latitude"),
        "longitude": r.get("longitude"),
        "location_text": r.get("location_text"),
        "contact": r.get("contact"),
        "date": r.get("date"),
        "photo_urls": r.get("photo_urls", []),
        "status": r.get("status", "active"),
        "created_at": r.get("created_at").isoformat() if isinstance(r.get("created_at"), datetime) else r.get("created_at"),
    }


# ----------------------------------------------------------------------------
# Auth Endpoints
# ----------------------------------------------------------------------------
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    role = payload.role if payload.role in ("user", "ngo") else "user"
    doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name.strip(),
        "role": role,
        "ngo_name": payload.ngo_name if role == "ngo" else None,
        "phone": payload.phone,
        "alert_radius_km": 5,
        "alert_lat": None,
        "alert_lng": None,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(doc)
    user_id = str(result.inserted_id)
    access = create_access_token(user_id, email, role)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    doc["_id"] = result.inserted_id
    return serialize_user(doc)


@api.post("/auth/login")
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower().strip()
    ip = request.client.host if request.client else "?"
    identifier = f"{ip}:{email}"
    attempts = await db.login_attempts.find_one({"identifier": identifier})
    now = datetime.now(timezone.utc)
    if attempts and attempts.get("locked_until") and attempts["locked_until"] > now:
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        new_count = (attempts.get("count", 0) if attempts else 0) + 1
        update = {"count": new_count, "last_attempt": now}
        if new_count >= 5:
            update["locked_until"] = now + timedelta(minutes=15)
            update["count"] = 0
        await db.login_attempts.update_one(
            {"identifier": identifier}, {"$set": update}, upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_one({"identifier": identifier})
    user_id = str(user["_id"])
    access = create_access_token(user_id, email, user.get("role", "user"))
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return serialize_user(user)


@api.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(request: Request):
    user = await get_current_user(request)
    return serialize_user(user)


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(str(user["_id"]), user["email"], user.get("role", "user"))
        refresh_new = create_refresh_token(str(user["_id"]))
        set_auth_cookies(response, access, refresh_new)
        return serialize_user(user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@api.put("/auth/profile")
async def update_profile(payload: ProfileUpdate, request: Request):
    user = await get_current_user(request)
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if update:
        await db.users.update_one({"_id": user["_id"]}, {"$set": update})
        user = await db.users.find_one({"_id": user["_id"]})
    return serialize_user(user)


# ----------------------------------------------------------------------------
# Uploads
# ----------------------------------------------------------------------------
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@api.post("/uploads")
async def upload_file(request: Request, file: UploadFile = File(...)):
    user = await get_current_user(request)
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only image files allowed")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 8MB)")
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    path = f"{APP_NAME}/uploads/{str(user['_id'])}/{uuid.uuid4()}.{ext}"
    result = put_object(path, data, content_type)
    await db.files.insert_one(
        {
            "storage_path": result["path"],
            "user_id": str(user["_id"]),
            "original_filename": file.filename,
            "content_type": content_type,
            "size": result.get("size", len(data)),
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc),
        }
    )
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}


@api.get("/files/{path:path}")
async def serve_file(path: str, request: Request, auth: Optional[str] = Query(None)):
    # Allow either cookie auth or query token (for <img> tags)
    if not request.cookies.get("access_token"):
        if auth:
            try:
                jwt.decode(auth, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            except jwt.PyJWTError:
                raise HTTPException(status_code=401, detail="Invalid token")
        # Allow public read for now (community feature) — files are user-uploaded photos for public reports
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, content_type = get_object(path)
    return FastAPIResponse(content=data, media_type=record.get("content_type") or content_type)


# ----------------------------------------------------------------------------
# Reports
# ----------------------------------------------------------------------------
@api.post("/reports")
async def create_report(payload: ReportIn, request: Request):
    user = await get_current_user(request)
    if payload.report_type not in ("lost", "found"):
        raise HTTPException(status_code=400, detail="report_type must be lost or found")
    doc = payload.model_dump()
    doc.update(
        {
            "user_id": str(user["_id"]),
            "owner_name": user.get("name", ""),
            "status": "active",
            "created_at": datetime.now(timezone.utc),
        }
    )
    result = await db.reports.insert_one(doc)
    doc["_id"] = result.inserted_id
    # Create match notifications
    await create_match_notifications(doc)
    # Create nearby alerts
    await create_nearby_alerts(doc)
    return serialize_report(doc)


@api.get("/reports")
async def list_reports(
    report_type: Optional[str] = None,
    entity_type: Optional[str] = None,
    color: Optional[str] = None,
    q: Optional[str] = None,
    status_f: Optional[str] = Query(None, alias="status"),
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: Optional[float] = None,
    limit: int = 200,
):
    query: dict = {}
    if report_type in ("lost", "found"):
        query["report_type"] = report_type
    if entity_type:
        query["entity_type"] = {"$regex": f"^{re.escape(entity_type)}$", "$options": "i"}
    if color:
        query["color"] = {"$regex": re.escape(color), "$options": "i"}
    if status_f:
        query["status"] = status_f
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"description": rx}, {"name": rx}, {"color": rx}, {"entity_type": rx}]
    cursor = db.reports.find(query).sort("created_at", -1).limit(limit)
    items = []
    async for r in cursor:
        item = serialize_report(r)
        if lat is not None and lng is not None:
            d = haversine_km(lat, lng, r["latitude"], r["longitude"])
            item["distance_km"] = round(d, 2)
            if radius_km is not None and d > radius_km:
                continue
        items.append(item)
    return items


@api.get("/reports/me/list")
async def my_reports(request: Request):
    user = await get_current_user(request)
    cursor = db.reports.find({"user_id": str(user["_id"])}).sort("created_at", -1)
    return [serialize_report(r) async for r in cursor]


@api.get("/reports/{report_id}")
async def get_report(report_id: str):
    try:
        r = await db.reports.find_one({"_id": ObjectId(report_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    return serialize_report(r)


@api.put("/reports/{report_id}")
async def update_report(report_id: str, payload: ReportUpdate, request: Request):
    user = await get_current_user(request)
    try:
        r = await db.reports.find_one({"_id": ObjectId(report_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    if r.get("user_id") != str(user["_id"]) and user.get("role") not in ("admin",):
        raise HTTPException(status_code=403, detail="Forbidden")
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if update:
        await db.reports.update_one({"_id": ObjectId(report_id)}, {"$set": update})
    r = await db.reports.find_one({"_id": ObjectId(report_id)})
    return serialize_report(r)


@api.delete("/reports/{report_id}")
async def delete_report(report_id: str, request: Request):
    user = await get_current_user(request)
    try:
        r = await db.reports.find_one({"_id": ObjectId(report_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    if r.get("user_id") != str(user["_id"]) and user.get("role") not in ("admin",):
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.reports.delete_one({"_id": ObjectId(report_id)})
    await db.notifications.delete_many({"report_id": report_id})
    await db.matches.delete_many({"$or": [{"report_a": report_id}, {"report_b": report_id}]})
    return {"ok": True}


@api.get("/reports/{report_id}/matches")
async def report_matches(report_id: str):
    try:
        r = await db.reports.find_one({"_id": ObjectId(report_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    other_type = "found" if r["report_type"] == "lost" else "lost"
    cursor = db.reports.find({"report_type": other_type, "status": {"$ne": "resolved"}})
    out = []
    async for o in cursor:
        m = match_score(r, o)
        if m["score"] >= 30:
            out.append({"report": serialize_report(o), **m})
    out.sort(key=lambda x: x["score"], reverse=True)
    return out[:30]


# ----------------------------------------------------------------------------
# Matching + Notifications
# ----------------------------------------------------------------------------
async def create_match_notifications(new_report: dict):
    other_type = "found" if new_report["report_type"] == "lost" else "lost"
    cursor = db.reports.find({"report_type": other_type, "status": {"$ne": "resolved"}})
    async for o in cursor:
        m = match_score(new_report, o)
        if m["score"] >= 50:
            # Notify both owners
            for target_user_id, related_id in [
                (new_report["user_id"], str(o["_id"])),
                (o["user_id"], str(new_report["_id"])),
            ]:
                await db.notifications.insert_one(
                    {
                        "user_id": target_user_id,
                        "type": "match",
                        "title": f"Possible match found ({int(m['score'])}% confidence)",
                        "body": f"A {other_type if target_user_id == new_report['user_id'] else new_report['report_type']} report may match yours.",
                        "report_id": str(new_report["_id"]),
                        "related_report_id": related_id,
                        "score": m["score"],
                        "is_read": False,
                        "created_at": datetime.now(timezone.utc),
                    }
                )
            await db.matches.insert_one(
                {
                    "report_a": str(new_report["_id"]),
                    "report_b": str(o["_id"]),
                    "score": m["score"],
                    "factors": m["factors"],
                    "created_at": datetime.now(timezone.utc),
                }
            )


async def create_nearby_alerts(new_report: dict):
    cursor = db.users.find(
        {
            "alert_lat": {"$ne": None},
            "alert_lng": {"$ne": None},
            "_id": {"$ne": ObjectId(new_report["user_id"])},
        }
    )
    async for u in cursor:
        radius = u.get("alert_radius_km", 5) or 5
        d = haversine_km(u["alert_lat"], u["alert_lng"], new_report["latitude"], new_report["longitude"])
        if d <= radius:
            await db.notifications.insert_one(
                {
                    "user_id": str(u["_id"]),
                    "type": "nearby",
                    "title": f"New {new_report['report_type']} report nearby",
                    "body": f"A {new_report['entity_type']} reported {new_report['report_type']} within {round(d, 1)} km of your area.",
                    "report_id": str(new_report["_id"]),
                    "score": None,
                    "distance_km": round(d, 2),
                    "is_read": False,
                    "created_at": datetime.now(timezone.utc),
                }
            )


@api.get("/notifications")
async def list_notifications(request: Request):
    user = await get_current_user(request)
    cursor = db.notifications.find({"user_id": str(user["_id"])}).sort("created_at", -1).limit(100)
    out = []
    async for n in cursor:
        out.append(
            {
                "id": str(n["_id"]),
                "type": n.get("type"),
                "title": n.get("title"),
                "body": n.get("body"),
                "report_id": n.get("report_id"),
                "related_report_id": n.get("related_report_id"),
                "score": n.get("score"),
                "distance_km": n.get("distance_km"),
                "is_read": n.get("is_read", False),
                "created_at": n.get("created_at").isoformat() if isinstance(n.get("created_at"), datetime) else n.get("created_at"),
            }
        )
    return out


@api.post("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, request: Request):
    user = await get_current_user(request)
    await db.notifications.update_one(
        {"_id": ObjectId(notif_id), "user_id": str(user["_id"])}, {"$set": {"is_read": True}}
    )
    return {"ok": True}


@api.post("/notifications/read-all")
async def mark_all_read(request: Request):
    user = await get_current_user(request)
    await db.notifications.update_many({"user_id": str(user["_id"])}, {"$set": {"is_read": True}})
    return {"ok": True}


# ----------------------------------------------------------------------------
# NGO cases
# ----------------------------------------------------------------------------
@api.get("/ngo/cases")
async def ngo_cases(request: Request):
    user = await get_current_user(request)
    require_roles(user, ["ngo", "admin"])
    cursor = db.ngo_cases.find({"ngo_id": str(user["_id"])}).sort("created_at", -1)
    out = []
    async for c in cursor:
        report = await db.reports.find_one({"_id": ObjectId(c["report_id"])})
        out.append(
            {
                "id": str(c["_id"]),
                "report_id": c["report_id"],
                "ngo_id": c["ngo_id"],
                "status": c.get("status", "claimed"),
                "notes": c.get("notes"),
                "history": c.get("history", []),
                "report": serialize_report(report) if report else None,
                "created_at": c.get("created_at").isoformat() if isinstance(c.get("created_at"), datetime) else c.get("created_at"),
            }
        )
    return out


@api.post("/ngo/cases/{report_id}/claim")
async def claim_case(report_id: str, request: Request):
    user = await get_current_user(request)
    require_roles(user, ["ngo", "admin"])
    try:
        r = await db.reports.find_one({"_id": ObjectId(report_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    existing = await db.ngo_cases.find_one({"report_id": report_id, "ngo_id": str(user["_id"])})
    if existing:
        return {"id": str(existing["_id"]), "status": existing.get("status")}
    doc = {
        "report_id": report_id,
        "ngo_id": str(user["_id"]),
        "status": "claimed",
        "history": [{"status": "claimed", "at": datetime.now(timezone.utc).isoformat()}],
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.ngo_cases.insert_one(doc)
    # notify reporter
    await db.notifications.insert_one(
        {
            "user_id": r["user_id"],
            "type": "ngo_update",
            "title": "An NGO has claimed your report",
            "body": f"{user.get('ngo_name') or user.get('name')} is coordinating the case.",
            "report_id": report_id,
            "is_read": False,
            "created_at": datetime.now(timezone.utc),
        }
    )
    return {"id": str(res.inserted_id), "status": "claimed"}


@api.post("/ngo/cases/{case_id}/status")
async def update_case_status(case_id: str, payload: CaseStatusIn, request: Request):
    user = await get_current_user(request)
    require_roles(user, ["ngo", "admin"])
    try:
        c = await db.ngo_cases.find_one({"_id": ObjectId(case_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    if c["ngo_id"] != str(user["_id"]) and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    history = c.get("history", [])
    history.append(
        {"status": payload.status, "notes": payload.notes, "at": datetime.now(timezone.utc).isoformat()}
    )
    await db.ngo_cases.update_one(
        {"_id": ObjectId(case_id)},
        {"$set": {"status": payload.status, "notes": payload.notes, "history": history}},
    )
    # Update report status if reunified/closed
    if payload.status in ("reunified", "closed"):
        await db.reports.update_one(
            {"_id": ObjectId(c["report_id"])}, {"$set": {"status": "resolved"}}
        )
    # notify reporter
    report = await db.reports.find_one({"_id": ObjectId(c["report_id"])})
    if report:
        await db.notifications.insert_one(
            {
                "user_id": report["user_id"],
                "type": "ngo_update",
                "title": f"Case status updated to {payload.status}",
                "body": payload.notes or f"NGO updated the case to '{payload.status}'.",
                "report_id": c["report_id"],
                "is_read": False,
                "created_at": datetime.now(timezone.utc),
            }
        )
    return {"ok": True, "status": payload.status}


# ----------------------------------------------------------------------------
# Stats
# ----------------------------------------------------------------------------
@api.get("/stats")
async def stats():
    total = await db.reports.count_documents({})
    lost = await db.reports.count_documents({"report_type": "lost"})
    found = await db.reports.count_documents({"report_type": "found"})
    resolved = await db.reports.count_documents({"status": "resolved"})
    users_count = await db.users.count_documents({})
    ngos = await db.users.count_documents({"role": "ngo"})
    return {
        "total_reports": total,
        "lost": lost,
        "found": found,
        "resolved": resolved,
        "users": users_count,
        "ngos": ngos,
    }


@api.get("/")
async def root():
    return {"app": "Universal Lost & Found Recovery", "ok": True}


# ----------------------------------------------------------------------------
# Startup — indexes + admin/NGO seed
# ----------------------------------------------------------------------------
async def seed_user(email: str, password: str, name: str, role: str, ngo_name: Optional[str] = None):
    existing = await db.users.find_one({"email": email})
    hashed = hash_password(password)
    if not existing:
        await db.users.insert_one(
            {
                "email": email,
                "password_hash": hashed,
                "name": name,
                "role": role,
                "ngo_name": ngo_name,
                "phone": None,
                "alert_radius_km": 5,
                "alert_lat": None,
                "alert_lng": None,
                "created_at": datetime.now(timezone.utc),
            }
        )
        logger.info(f"Seeded {role}: {email}")
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hashed, "role": role}})
        logger.info(f"Updated password for {email}")


# ----------------------------------------------------------------------------
# Demo data — auto-seeded once for college-presentation showcases.
# ----------------------------------------------------------------------------
DEMO_REPORTS = [
    {
        "report_type": "lost", "entity_type": "dog", "name": "Bruno",
        "description": "Friendly golden labrador, wearing a blue collar. Slipped out during evening walk near Indiranagar 12th main.",
        "color": "golden", "latitude": 12.9719, "longitude": 77.6412,
        "location_text": "Indiranagar 12th Main, Bengaluru", "contact": "+91-98860-12345",
        "photo_urls": ["https://images.unsplash.com/photo-1552053831-71594a27632d?w=900&q=80"],
    },
    {
        "report_type": "found", "entity_type": "dog", "name": None,
        "description": "Found a friendly golden retriever wagging tail near Domlur. Wearing a faded blue collar, looks well-fed.",
        "color": "golden", "latitude": 12.9608, "longitude": 77.6387,
        "location_text": "Domlur Layout, Bengaluru", "contact": "+91-99023-87765",
        "photo_urls": ["https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=900&q=80"],
    },
    {
        "report_type": "lost", "entity_type": "cat", "name": "Mochi",
        "description": "Black and white tuxedo cat, very shy, has a small notch on left ear. Last seen near our balcony in Koramangala.",
        "color": "black and white", "latitude": 12.9352, "longitude": 77.6245,
        "location_text": "Koramangala 4th Block, Bengaluru", "contact": "+91-98452-44120",
        "photo_urls": ["https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=900&q=80"],
    },
    {
        "report_type": "found", "entity_type": "cat", "name": None,
        "description": "Spotted a black-and-white cat hiding under a parked car near Forum Mall area. Won't come close.",
        "color": "black and white", "latitude": 12.9352, "longitude": 77.6175,
        "location_text": "Forum Mall, Koramangala", "contact": "+91-90080-99001",
        "photo_urls": ["https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=900&q=80"],
    },
    {
        "report_type": "lost", "entity_type": "dog", "name": "Coco",
        "description": "Small brown beagle puppy, very playful, missing red harness. Got separated near HSR Layout park.",
        "color": "brown", "latitude": 12.9116, "longitude": 77.6371,
        "location_text": "HSR Layout, Bengaluru", "contact": "+91-99000-22189",
        "photo_urls": ["https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=900&q=80"],
    },
    {
        "report_type": "found", "entity_type": "dog", "name": None,
        "description": "Found an Indian street dog with a torn ear and friendly disposition. Currently sheltering at home in Bandra West.",
        "color": "white and brown", "latitude": 19.0596, "longitude": 72.8295,
        "location_text": "Bandra West, Mumbai", "contact": "+91-98201-00921",
        "photo_urls": ["https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=900&q=80"],
    },
    {
        "report_type": "lost", "entity_type": "person", "name": "Mr. Rajesh Kumar (72)",
        "description": "Elderly gentleman with mild dementia, wearing white kurta and grey shawl. Missing since morning from Dadar station area.",
        "color": "—", "latitude": 19.0186, "longitude": 72.8442,
        "location_text": "Dadar Station, Mumbai", "contact": "+91-98199-83372",
        "photo_urls": ["https://images.unsplash.com/photo-1559563458-527698bf5295?w=900&q=80"],
    },
    {
        "report_type": "lost", "entity_type": "cat", "name": "Whiskey",
        "description": "Orange tabby, very vocal, microchipped. Last seen on the rooftop of our building in CR Park.",
        "color": "orange tabby", "latitude": 28.5396, "longitude": 77.2495,
        "location_text": "Chittaranjan Park, Delhi", "contact": "+91-98109-66552",
        "photo_urls": ["https://images.unsplash.com/photo-1571566882372-1598d88abd90?w=900&q=80"],
    },
    {
        "report_type": "found", "entity_type": "cat", "name": None,
        "description": "Orange-coloured cat seen meowing loudly near a parked Honda. Looks lost and hungry.",
        "color": "orange", "latitude": 28.5429, "longitude": 77.2431,
        "location_text": "GK-II, Delhi", "contact": "+91-99536-44210",
        "photo_urls": ["https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=900&q=80"],
    },
    {
        "report_type": "lost", "entity_type": "dog", "name": "Pepper",
        "description": "Black and tan dachshund, slightly limping on hind leg, wearing pink collar with bell.",
        "color": "black and tan", "latitude": 18.5204, "longitude": 73.8567,
        "location_text": "FC Road, Pune", "contact": "+91-98220-55410",
        "photo_urls": ["https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=900&q=80"],
    },
    {
        "report_type": "found", "entity_type": "dog", "name": None,
        "description": "Spotted a small dachshund near JM Road. Has a pink collar, but no name tag. Currently with us.",
        "color": "black", "latitude": 18.5230, "longitude": 73.8475,
        "location_text": "JM Road, Pune", "contact": "+91-98905-71289",
        "photo_urls": ["https://images.unsplash.com/photo-1587764379873-97837921fd44?w=900&q=80"],
    },
    {
        "report_type": "found", "entity_type": "object", "name": "Backpack with school books",
        "description": "Found a navy-blue school backpack with class 7 textbooks and a water bottle. Looking for the owner.",
        "color": "navy blue", "latitude": 13.0827, "longitude": 80.2707,
        "location_text": "T. Nagar, Chennai", "contact": "+91-94440-87122",
        "photo_urls": ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&q=80"],
    },
    {
        "report_type": "lost", "entity_type": "object", "name": "MacBook in grey sleeve",
        "description": "Lost a MacBook Air in a grey neoprene sleeve. Reward offered. Has stickers including a small cat sticker.",
        "color": "silver", "latitude": 13.0625, "longitude": 80.2376,
        "location_text": "Anna Nagar, Chennai", "contact": "+91-94440-12321",
        "photo_urls": ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900&q=80"],
    },
    {
        "report_type": "found", "entity_type": "dog", "name": None,
        "description": "A friendly indie dog has been hanging around our gate for two days. Looks healthy, very social.",
        "color": "brown", "latitude": 17.4435, "longitude": 78.3772,
        "location_text": "Hitec City, Hyderabad", "contact": "+91-94400-55831",
        "photo_urls": ["https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=900&q=80"],
    },
]


async def seed_demo_reports():
    if await db.reports.count_documents({}) > 0:
        return
    admin = await db.users.find_one({"email": ADMIN_EMAIL})
    ngo = await db.users.find_one({"email": NGO_EMAIL})
    if not admin:
        return
    now = datetime.now(timezone.utc)
    for i, base in enumerate(DEMO_REPORTS):
        owner = ngo if (ngo and i % 3 == 0) else admin
        doc = {
            **base,
            "user_id": str(owner["_id"]),
            "owner_name": owner.get("name", ""),
            "status": "active",
            "date": (now - timedelta(days=i % 7)).date().isoformat(),
            "created_at": now - timedelta(hours=i * 5),
        }
        await db.reports.insert_one(doc)
    logger.info(f"Seeded {len(DEMO_REPORTS)} demo reports")


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.reports.create_index([("created_at", -1)])
    await db.reports.create_index([("report_type", 1), ("entity_type", 1)])
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    await db.login_attempts.create_index("identifier")
    init_storage()
    await seed_user(ADMIN_EMAIL, ADMIN_PASSWORD, "Admin", "admin")
    await seed_user(NGO_EMAIL, NGO_PASSWORD, "PawRescue NGO", "ngo", ngo_name="PawRescue NGO")
    await seed_demo_reports()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ----------------------------------------------------------------------------
# Mount
# ----------------------------------------------------------------------------
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
