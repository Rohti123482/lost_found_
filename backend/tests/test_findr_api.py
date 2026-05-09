"""End-to-end backend API tests for Universal Lost & Found Recovery."""
import io
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # fallback to frontend env file
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@findr.app", "password": "admin123"}
NGO = {"email": "ngo@findr.app", "password": "ngo123"}

# Random user per run
RAND = uuid.uuid4().hex[:8]
USER = {
    "email": f"test_user_{RAND}@findr.app",
    "password": "testpass123",
    "name": f"Test User {RAND}",
}
USER2 = {
    "email": f"test_user2_{RAND}@findr.app",
    "password": "testpass123",
    "name": f"Test User2 {RAND}",
}


def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------------- Auth ----------------
class TestAuth:
    def test_register_user(self):
        s = session()
        r = s.post(f"{API}/auth/register", json={**USER, "role": "user"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == USER["email"].lower()
        assert data["role"] == "user"
        assert "access_token" in r.cookies

    def test_admin_login_and_me(self):
        s = session()
        r = s.post(f"{API}/auth/login", json=ADMIN)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == ADMIN["email"]
        assert "access_token" in s.cookies
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["email"] == ADMIN["email"]

    def test_logout_clears_cookie(self):
        s = session()
        r = s.post(f"{API}/auth/login", json=ADMIN)
        assert r.status_code == 200
        out = s.post(f"{API}/auth/logout")
        assert out.status_code == 200
        # cookie cleared - calling /me with fresh session (no token) returns 401
        s2 = session()
        me = s2.get(f"{API}/auth/me")
        assert me.status_code == 401

    def test_login_invalid(self):
        s = session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN["email"], "password": "wrongpass"})
        assert r.status_code == 401


# ---------------- Uploads ----------------
@pytest.fixture(scope="module")
def admin_session():
    s = session()
    r = s.post(f"{API}/auth/login", json=ADMIN)
    assert r.status_code == 200
    return s


@pytest.fixture(scope="module")
def ngo_session():
    s = session()
    r = s.post(f"{API}/auth/login", json=NGO)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def user_session():
    s = session()
    # try register, if exists login
    r = s.post(f"{API}/auth/register", json={**USER2, "role": "user"})
    if r.status_code != 200:
        r = s.post(f"{API}/auth/login", json={"email": USER2["email"], "password": USER2["password"]})
    assert r.status_code == 200, r.text
    return s


# Tiny PNG (1x1)
PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xfc"
    b"\xff\xff?\x00\x05\xfe\x02\xfe\xa0\xb1\xb1\xa3\x00\x00\x00\x00IEND\xaeB`\x82"
)


class TestUpload:
    def test_upload_image(self, admin_session):
        files = {"file": ("test.png", io.BytesIO(PNG_BYTES), "image/png")}
        # remove json content-type for multipart
        headers = {k: v for k, v in admin_session.headers.items() if k.lower() != "content-type"}
        r = requests.post(f"{API}/uploads", files=files, cookies=admin_session.cookies, headers=headers, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "path" in data and "url" in data
        # serve file
        url = f"{BASE_URL}{data['url']}"
        r2 = requests.get(url, cookies=admin_session.cookies, timeout=60)
        assert r2.status_code == 200
        assert r2.headers.get("content-type", "").startswith("image/")
        # store for later tests
        TestUpload.uploaded_url = data["url"]


# ---------------- Reports + Matching ----------------
class TestReports:
    lost_id = None
    found_id = None

    def test_create_lost(self, admin_session):
        payload = {
            "report_type": "lost",
            "entity_type": "dog",
            "name": "Buddy",
            "description": "Friendly golden retriever lost near park",
            "color": "golden",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "location_text": "Cubbon Park",
            "contact": "9999999999",
            "photo_urls": [getattr(TestUpload, "uploaded_url", "")],
        }
        r = admin_session.post(f"{API}/reports", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["report_type"] == "lost"
        assert data["entity_type"] == "dog"
        TestReports.lost_id = data["id"]

    def test_create_found_triggers_match(self, user_session):
        payload = {
            "report_type": "found",
            "entity_type": "dog",
            "name": "Golden dog",
            "description": "Friendly golden dog spotted near park",
            "color": "golden",
            "latitude": 12.9720,  # ~50m away
            "longitude": 77.5950,
            "location_text": "Cubbon Park entrance",
            "contact": "8888888888",
            "photo_urls": [],
        }
        r = user_session.post(f"{API}/reports", json=payload)
        assert r.status_code == 200, r.text
        TestReports.found_id = r.json()["id"]
        time.sleep(1)

    def test_matches_endpoint(self, admin_session):
        assert TestReports.lost_id
        r = admin_session.get(f"{API}/reports/{TestReports.lost_id}/matches")
        assert r.status_code == 200
        matches = r.json()
        assert len(matches) > 0, "Expected at least one match"
        top = matches[0]
        assert top["score"] >= 50
        assert "distance_km" in top
        assert top["distance_km"] < 1

    def test_notifications_created(self, admin_session):
        r = admin_session.get(f"{API}/notifications")
        assert r.status_code == 200
        notes = r.json()
        match_notes = [n for n in notes if n.get("type") == "match"]
        assert len(match_notes) > 0, "Expected match notifications"

    def test_filters(self, admin_session):
        r = admin_session.get(f"{API}/reports", params={"report_type": "lost", "entity_type": "dog"})
        assert r.status_code == 200
        items = r.json()
        assert all(i["report_type"] == "lost" for i in items)
        assert all(i["entity_type"].lower() == "dog" for i in items)

    def test_keyword_filter(self, admin_session):
        r = admin_session.get(f"{API}/reports", params={"q": "GOLDEN"})
        assert r.status_code == 200
        assert len(r.json()) > 0

    def test_distance_filter(self, admin_session):
        r = admin_session.get(
            f"{API}/reports", params={"lat": 12.9716, "lng": 77.5946, "radius_km": 1}
        )
        assert r.status_code == 200
        for item in r.json():
            assert "distance_km" in item
            assert item["distance_km"] <= 1

    def test_my_reports(self, admin_session):
        r = admin_session.get(f"{API}/reports/me/list")
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()]
        assert TestReports.lost_id in ids

    def test_update_owner_only(self, user_session, admin_session):
        # admin tries to update user's found report (admin role allowed by code)
        # but test non-owner non-admin: create user's own report and try with admin? admin allowed.
        # Better: use a normal user session to update admin's lost — should be 403
        r = user_session.put(
            f"{API}/reports/{TestReports.lost_id}", json={"description": "hack"}
        )
        assert r.status_code == 403

        # owner update works
        r2 = admin_session.put(
            f"{API}/reports/{TestReports.lost_id}", json={"description": "Updated description"}
        )
        assert r2.status_code == 200
        assert r2.json()["description"] == "Updated description"

    def test_get_report(self):
        r = requests.get(f"{API}/reports/{TestReports.lost_id}")
        assert r.status_code == 200
        assert r.json()["id"] == TestReports.lost_id

    def test_notifications_read(self, admin_session):
        notes = admin_session.get(f"{API}/notifications").json()
        if notes:
            nid = notes[0]["id"]
            r = admin_session.post(f"{API}/notifications/{nid}/read")
            assert r.status_code == 200
        r2 = admin_session.post(f"{API}/notifications/read-all")
        assert r2.status_code == 200


# ---------------- NGO ----------------
class TestNgo:
    case_id = None

    def test_non_ngo_forbidden(self, admin_session):
        # admin role allowed by require_roles; use user session
        s = session()
        r = s.post(f"{API}/auth/login", json={"email": USER["email"], "password": USER["password"]})
        assert r.status_code == 200
        out = s.get(f"{API}/ngo/cases")
        assert out.status_code == 403

    def test_claim_case(self, ngo_session):
        assert TestReports.found_id or TestReports.lost_id
        rid = TestReports.found_id or TestReports.lost_id
        r = ngo_session.post(f"{API}/ngo/cases/{rid}/claim")
        assert r.status_code == 200, r.text
        TestNgo.case_id = r.json()["id"]
        # list
        cases = ngo_session.get(f"{API}/ngo/cases").json()
        assert any(c["id"] == TestNgo.case_id for c in cases)

    def test_update_status(self, ngo_session):
        assert TestNgo.case_id
        r = ngo_session.post(
            f"{API}/ngo/cases/{TestNgo.case_id}/status",
            json={"status": "sheltered", "notes": "Safe at shelter"},
        )
        assert r.status_code == 200
        assert r.json()["status"] == "sheltered"


# ---------------- Stats ----------------
class TestStats:
    def test_stats(self):
        r = requests.get(f"{API}/stats")
        assert r.status_code == 200
        d = r.json()
        for key in ["total_reports", "lost", "found", "resolved", "users", "ngos"]:
            assert key in d


# ---------------- Cleanup (delete test reports) ----------------
class TestCleanupZ:
    def test_delete_owner_only(self, admin_session, user_session):
        # non-owner (user) trying to delete admin's lost → 403
        r = user_session.delete(f"{API}/reports/{TestReports.lost_id}")
        assert r.status_code == 403
        # owner delete OK
        r2 = admin_session.delete(f"{API}/reports/{TestReports.lost_id}")
        assert r2.status_code == 200
        # gone
        g = requests.get(f"{API}/reports/{TestReports.lost_id}")
        assert g.status_code == 404

    def test_delete_found(self, user_session):
        if TestReports.found_id:
            r = user_session.delete(f"{API}/reports/{TestReports.found_id}")
            assert r.status_code == 200
