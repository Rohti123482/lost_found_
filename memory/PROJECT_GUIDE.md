# Findr — Final-Year Project Guide

> Complete reference for explaining and demonstrating the
> **Universal Lost & Found Recovery, Rescue & Community Coordination System**.

---

## 1. One-line elevator pitch

> A community-driven, mobile-first web platform that helps neighbours, rescue NGOs and volunteers find missing pets and people, using geolocation, intelligent matching and real-time browser notifications.

---

## 2. Tech stack (what to say in your viva)

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 19 + Tailwind CSS + shadcn/ui | Fast, component-based, mobile-responsive |
| Maps | Leaflet + react-leaflet + OpenStreetMap | Free, open-source, no API key |
| Backend | FastAPI (Python) | Async, type-checked, auto OpenAPI docs |
| Database | MongoDB (NoSQL) | Flexible schema (good for evolving social data); geo + text query support |
| Auth | JWT (JSON Web Tokens) in **httpOnly cookies** + bcrypt | Industry-standard; cookie storage prevents XSS token theft |
| File storage | Emergent Object Storage (S3-compatible) | Scalable image hosting |
| Notifications | Web Push (browser Notifications API) + polling | Works on phones without a native app |

**Why MongoDB over PostgreSQL?** Reports are document-shaped (variable-length `photo_urls`, optional fields, future-proofing). Mongo's flexibility means we can add fields like `verified` or `priority` without migrations.

---

## 3. Where is the database? How do I access it?

### Location
The database is **MongoDB running locally inside the container** at:
```
mongodb://localhost:27017
```
Database name: **`lostfound_db`**
Both values come from `/app/backend/.env`:
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="lostfound_db"
```

### Access from the terminal (live demo)

Open a shell and run:
```bash
mongosh
```
Then:
```javascript
use lostfound_db
show collections
// users, reports, notifications, matches, ngo_cases, files, login_attempts, password_reset_tokens

db.users.find().pretty()
db.reports.find({report_type: "lost"}).pretty()
db.reports.countDocuments()
```

### Access with a GUI (good for screenshots in your report)

Use **MongoDB Compass** (free, official):

1. Download from https://www.mongodb.com/products/compass
2. Connect with URI: `mongodb://localhost:27017`
3. Pick `lostfound_db` from the left sidebar
4. Browse collections, run queries, export to JSON for your report

> **Demo trick**: Have Compass open in a separate window during your viva. After you create a report on the website, switch to Compass, click `reports`, and click **Refresh** — examiners love seeing the row appear in the database in real-time.

### Useful queries to memorise

```javascript
// All lost dogs
db.reports.find({report_type: "lost", entity_type: "dog"})

// Unread notifications for a user
db.notifications.find({user_id: "USER_ID_HERE", is_read: false})

// Reports near a location (no $geoNear needed for demo size — Haversine in code)
db.reports.find({}, {name:1, latitude:1, longitude:1, report_type:1})

// User counts by role
db.users.aggregate([{$group: {_id: "$role", count: {$sum: 1}}}])

// Resolved (reunited) cases
db.reports.find({status: "resolved"})
```

---

## 4. Database schema (what to put in your report)

### `users`
```js
{
  _id: ObjectId,
  email: "user@example.com",          // unique index
  password_hash: "$2b$12$...",        // bcrypt hash (never plaintext)
  name: "Anita Sharma",
  role: "user" | "ngo" | "admin",
  ngo_name: "PawRescue NGO" | null,
  phone: "+91-...",
  alert_radius_km: 5,                 // notify within this radius
  alert_lat: 12.9716, alert_lng: 77.5946,
  is_banned: false,
  created_at: ISODate
}
```

### `reports`
```js
{
  _id: ObjectId,
  user_id: "<owner _id as string>",   // ownership for edit/delete
  owner_name: "Anita Sharma",
  report_type: "lost" | "found",
  entity_type: "dog" | "cat" | "person" | "object" | "bird" | "pet-other",
  name: "Bruno",
  description: "Friendly golden lab...",
  color: "golden",
  latitude: 12.9719, longitude: 77.6412,
  location_text: "Indiranagar, Bengaluru",
  contact: "+91-98860-12345",
  date: "2026-02-09",
  photo_urls: ["lostfound/uploads/<uid>/<uuid>.jpg", ...],
  status: "active" | "resolved",
  created_at: ISODate
}
```

### `notifications`
```js
{
  _id: ObjectId,
  user_id: "<recipient _id as string>",
  type: "match" | "nearby" | "ngo_update",
  title: "Possible match found (78% confidence)",
  body: "A found report may match yours.",
  report_id: "<report _id>",
  related_report_id: "<the other report>",  // for matches
  score: 78.4,
  distance_km: 1.2,
  is_read: false,
  created_at: ISODate
}
```

### `matches`
```js
{
  _id: ObjectId,
  report_a: "<lost report id>",
  report_b: "<found report id>",
  score: 78.4,
  factors: { entity_type: 30, color: 25, distance_km: 1.2, keywords: 12.5 },
  created_at: ISODate
}
```

### `ngo_cases`
```js
{
  _id: ObjectId,
  report_id: "<report id>",
  ngo_id: "<NGO user id>",
  status: "claimed" | "sheltered" | "reunified" | "closed",
  notes: "Sheltering at our facility",
  history: [{status, notes, at}],
  created_at: ISODate
}
```

### `files`
```js
{
  _id: ObjectId,
  storage_path: "lostfound/uploads/<uid>/<uuid>.jpg",
  user_id: "<uploader>",
  original_filename: "bruno.jpg",
  content_type: "image/jpeg",
  size: 38291,
  is_deleted: false,
  created_at: ISODate
}
```

### Indexes
```js
db.users.createIndex({email: 1}, {unique: true})
db.reports.createIndex({created_at: -1})
db.reports.createIndex({report_type: 1, entity_type: 1})
db.notifications.createIndex({user_id: 1, created_at: -1})
db.password_reset_tokens.createIndex({expires_at: 1}, {expireAfterSeconds: 0})  // TTL
```

---

## 5. The intelligent matching algorithm (your key talking point)

**File**: `/app/backend/server.py` → function `match_score()`

When a new report is created, we compare it against **every report of the opposite type** (a lost ↔ found pair). For each candidate we compute a weighted score:

| Factor | Max weight | Logic |
|---|---|---|
| Entity type match | **30** | `dog` matches `dog` (case-insensitive) |
| Colour match | **25** (exact) / 15 (substring) | "golden" ≈ "golden retriever" |
| Geographic distance | **25 / 18 / 10 / 5** | ≤1 km / ≤5 km / ≤15 km / ≤50 km — Haversine formula |
| Keyword overlap | **0–20** | Jaccard similarity over description + name keywords (stop-words removed) |

**Total**: capped at 100.

**Thresholds**:
- **Score ≥ 50** → automatically create match notifications for *both* report owners.
- **Score ≥ 30** → returned as a "possible match" suggestion (`/api/reports/{id}/matches`).

**Why no AI?** It's deterministic, explainable, fast, and **runs without any third-party API** — perfect for a college project where you must defend every line of code. (You can mention "future work: image-similarity using vision AI" as a P2 improvement.)

---

## 6. Authentication flow (security walkthrough)

```
1. User registers → password is bcrypt-hashed (never stored plaintext)
2. Server returns user data + sets two httpOnly cookies:
     access_token  (4 hours)
     refresh_token (7 days)
3. Subsequent requests automatically send cookies (browser does this)
4. Server validates the access_token signature using JWT_SECRET
5. If access_token expires → frontend calls /api/auth/refresh → new access cookie
6. Logout → server clears both cookies
```

**Why httpOnly cookies and not localStorage?**
- localStorage is readable by JavaScript → a single XSS bug = stolen tokens.
- httpOnly cookies cannot be read by JS → safer.

**Brute-force protection**: 5 failed login attempts on the same `IP+email` triggers a 15-minute lockout (recorded in `login_attempts` collection).

**Roles & permissions**:
- `user` — create/edit/delete own reports.
- `ngo` — claim cases, update case statuses.
- `admin` — moderate everything (delete any report, ban users).

Banned users (`is_banned: true`) get a 403 on every authenticated request.

---

## 7. The notification system (how it actually delivers alerts)

The system uses **two layers**, working together:

### Layer 1 — Server-side fan-out (when does a notification get created?)

When a new report is posted, `server.py` runs two helpers:
1. **`create_match_notifications()`** — scores against all opposite-type reports. If score ≥ 50, inserts a `notification` row for both owners.
2. **`create_nearby_alerts()`** — checks every user with `alert_lat/lng` set; if the new report is inside their `alert_radius_km`, inserts a `notification` row for them.

NGO actions (claim, sheltered, reunified) also create notifications for the report's owner.

### Layer 2 — Client-side delivery (how does the user actually see it?)

In the React app, `useNotifications` hook (`/app/frontend/src/hooks/useNotifications.js`):

```javascript
1. Polls GET /api/notifications every 30 seconds
2. Updates the unread badge on the bell icon (top-right + bottom nav)
3. For any notification ID we haven't seen before, fires a
   browser Notification (with permission) — this is the same API
   that powers PWA / mobile push notifications
4. On Android Chrome, this triggers a real push popup with sound + vibration
```

### How to demo it in your viva

1. Open the app on **two devices** (or two browser windows / one window + one incognito).
2. Log in as Admin in window 1.
3. Sign up as a user in window 2; on the Profile page, set their alert location to **Bengaluru** with radius **20 km**.
4. Allow notifications when the browser prompts.
5. From window 1, post a new "found dog" report in Bengaluru.
6. Within 30 seconds, window 2 will:
   - Show a red badge on the bell icon
   - Pop up a browser notification (on phone, also sound/vibration)

> **No native app required** — the Web Notifications API is supported on Android Chrome, iOS 16.4+ Safari (with PWA install), and all desktop browsers.

---

## 8. Mobile-first design (they said it — explain why)

The app is **designed for phone-first** because that's where people are when they spot a lost pet on the street:

- A persistent **bottom navigation bar** (Home / Browse / **Report+** / Map / Alerts) — same pattern as Instagram/Twitter, instantly familiar.
- Centre **Report** button is raised and prominent — the most common action.
- Top-right **bell icon** with red unread badge.
- Map page uses 100% width on mobile.
- Forms stack vertically on small screens; all inputs are touch-sized (`py-2.5+`).
- Browser push notifications work on Android phones in real-time.
- Add to Home Screen (PWA-style) gives an "app icon" experience.

> You can extend this into a real PWA later (manifest.json + service worker) — that's a strong "future work" bullet for your report.

---

## 9. Project file structure

```
/app
├── backend/
│   ├── server.py              ← all backend code in one file (intentional, easier to explain)
│   ├── requirements.txt       ← Python deps
│   ├── .env                   ← MongoDB URL, JWT secret, admin creds, EMERGENT_LLM_KEY
│   └── tests/
│       └── test_findr_api.py  ← 22 pytest cases (auto-run by testing agent)
├── frontend/
│   ├── public/index.html      ← Outfit + Manrope font links + Leaflet CSS
│   └── src/
│       ├── App.js             ← all routes + AuthProvider
│       ├── lib/api.js         ← axios with withCredentials
│       ├── contexts/
│       │   └── AuthContext.jsx
│       ├── hooks/
│       │   └── useNotifications.js   ← polling + Web Push API
│       ├── components/
│       │   ├── AppLayout.jsx         ← header + mobile bottom nav
│       │   ├── MobileBottomNav.jsx
│       │   ├── ProtectedRoute.jsx
│       │   ├── FindrMap.jsx          ← Leaflet wrapper
│       │   ├── ReportCard.jsx
│       │   ├── ImageUploader.jsx
│       │   ├── ShareButtons.jsx
│       │   └── ui/                   ← shadcn primitives (Button, Input, Slider, etc.)
│       └── pages/
│           ├── LandingPage.jsx       ← public hero + bento grid
│           ├── LoginPage.jsx
│           ├── SignupPage.jsx        ← user OR NGO
│           ├── DashboardPage.jsx
│           ├── ReportFormPage.jsx    ← /report/lost  /report/found
│           ├── ReportsPage.jsx       ← filters + grid
│           ├── ReportDetailPage.jsx  ← gallery + matches
│           ├── MapPage.jsx           ← live Leaflet map
│           ├── MyReportsPage.jsx
│           ├── NotificationsPage.jsx
│           ├── NgoDashboardPage.jsx  ← claim / status workflow
│           ├── ProfilePage.jsx       ← alert location + radius
│           ├── PublicReportPage.jsx  ← /share/:id (no login)
│           └── AdminPage.jsx         ← moderation (users + reports)
└── memory/
    ├── PRD.md                 ← product spec
    ├── PROJECT_GUIDE.md       ← this file
    └── test_credentials.md    ← admin login
```

---

## 10. Complete API reference

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account (user or ngo) |
| POST | `/api/auth/login` | — | Log in |
| POST | `/api/auth/logout` | — | Clear cookies |
| GET | `/api/auth/me` | cookie | Current user |
| POST | `/api/auth/refresh` | refresh cookie | New access token |
| PUT | `/api/auth/profile` | cookie | Update name/phone/alert location |
| POST | `/api/uploads` | cookie + multipart | Upload one image, returns `{path, url}` |
| GET | `/api/files/{path:path}` | — | Serve image (public) |
| POST | `/api/reports` | cookie | Create lost/found report |
| GET | `/api/reports` | — | List with filters: `report_type`, `entity_type`, `color`, `q`, `lat`, `lng`, `radius_km` |
| GET | `/api/reports/{id}` | — | Single report (used by /share too) |
| PUT | `/api/reports/{id}` | cookie + owner | Update |
| DELETE | `/api/reports/{id}` | cookie + owner | Delete |
| GET | `/api/reports/me/list` | cookie | My reports |
| GET | `/api/reports/{id}/matches` | — | Possible matches sorted by score |
| GET | `/api/notifications` | cookie | List my notifications |
| GET | `/api/notifications/unread-count` | cookie | Just the number |
| POST | `/api/notifications/{id}/read` | cookie | Mark one read |
| POST | `/api/notifications/read-all` | cookie | Mark all read |
| GET | `/api/ngo/cases` | ngo/admin | My claimed cases |
| POST | `/api/ngo/cases/{report_id}/claim` | ngo/admin | Claim a case |
| POST | `/api/ngo/cases/{case_id}/status` | ngo/admin | Change status |
| GET | `/api/admin/stats` | admin | System stats |
| GET | `/api/admin/users` | admin | All users |
| POST | `/api/admin/users/{id}/ban` | admin | Toggle ban |
| DELETE | `/api/admin/reports/{id}` | admin | Delete any report |
| GET | `/api/stats` | — | Public stats |

> FastAPI auto-generates interactive docs at `/docs` (Swagger UI). Open the backend URL with `/docs` appended to demo it.

---

## 11. The 10-minute viva demo script

1. **Landing page** — *"Mobile-first web app, no install needed."*
2. **Sign up as a community member** named "Demo User".
3. **Profile page** → click on the map (Bengaluru), set radius **15 km**, save. *"This is what wires the nearby-alert system."*
4. **Allow browser notifications** when prompted.
5. **Log out → log in as admin** (`admin@findr.app / admin123`).
6. **Dashboard** — point out 14 reports already seeded across 6 cities.
7. **Map page** — show terracotta (lost) and sage (found) pins; click Bruno (Bengaluru lost golden lab).
8. **Report Detail** — show description, photo gallery, and the "Possible matches" section that already shows the matching found-dog. *"This is the rule-based matching algorithm — same species, same colour, < 5 km apart."*
9. **Click "WhatsApp share"** — show the prefilled message that opens.
10. **Open Compass** in the side panel → click `reports` → show data is real.
11. **Post a new found-dog report** in Bengaluru with the same colour as Bruno → submit.
12. Switch to your other tab (the demo user) — within 30 seconds, the **bell badge appears** and a **browser notification pops up** (on a phone: sound + vibration).
13. **Open `/admin`** → show user list (with the demo user we created) → demonstrate the **Ban** button. *"Banned users get 403 on every authenticated request — the ownership check is in `get_current_user`."*
14. **Sign up as an NGO** → show the **NGO Dashboard** → claim a found case → mark it `sheltered` → show the new notification fired to the original reporter.
15. **Show the database directly** — `mongosh` → `use lostfound_db` → `db.reports.findOne({name:"Bruno"})` → done.

---

## 12. Common viva questions & how to answer

**Q: Why not Firebase / Supabase?**
A: Self-hosted gives full control over data, no vendor lock-in, no recurring cost, and matches the syllabus emphasis on building each layer.

**Q: How does it scale?**
A: Stateless FastAPI workers behind a load balancer + MongoDB replica set. Add a `2dsphere` geospatial index on `reports.location` so `find()` with `$geoWithin` becomes O(log n) instead of scanning all reports.

**Q: How do you prevent fake reports?**
A: Three layers:
1. Phone number is mandatory for contact (social pressure).
2. Admin moderation page deletes spam in one click.
3. Banned users can't log in. (Future: SMS OTP verification before posting.)

**Q: What about privacy?**
A: Personal contact info is shown on a report by the user's choice. Photos are stored in object storage with content-type validation and size limits (8 MB). JWT secrets and DB URI are in `.env`, never committed. Passwords are bcrypt-hashed.

**Q: Why don't you store the password directly?**
A: Bcrypt is a one-way hash with built-in salting. Even if the DB leaks, attackers can't recover plaintext passwords. Each hash also takes ~250 ms to verify, defeating brute-force.

**Q: Why MongoDB and not SQL?**
A: Reports have variable shape (`photo_urls` is a list, `name` is optional, NGO cases have a nested `history` array). Mongo's document model fits naturally, and there are no migrations as we evolve the schema.

**Q: How would you turn this into a native mobile app?**
A: It's already a Progressive Web App in spirit — bottom nav, mobile-first layouts, browser push. To go native: add `manifest.json` + service worker for offline. Or wrap with React Native + Expo and reuse the FastAPI backend as-is.

---

## 13. What's still on the roadmap (good for "future work" slide)

- **AI image similarity** for matching (Gemini Nano Banana / GPT vision)
- **Geospatial 2dsphere index** + bounding-box prefilter for scale
- **SMS / Email** notifications via Twilio / SendGrid
- **PWA manifest + service worker** for offline support and installable icon
- **Real-time** websocket channel instead of 30-second polling
- **Sighting trail** — multiple users can pin sightings of the same lost pet, drawing a heat-map of last-seen locations
- **Heat-map analytics** for cities with the most lost-pet density (good for NGOs)

---

## 14. Quick troubleshooting

| Issue | Fix |
|---|---|
| `mongosh` not installed | `apt install mongodb-mongosh` or use Compass |
| Backend not responding | `sudo supervisorctl status backend && tail /var/log/supervisor/backend.err.log` |
| "Failed to upload" | Check `EMERGENT_LLM_KEY` in `/app/backend/.env` and restart backend |
| Map shows blank | Check internet (OSM tiles are external); check browser console for Leaflet CSS load |
| Login says "Account is banned" | An admin banned this user; unban via `/admin` |
| Notifications never appear | (1) Permission must be **granted** in browser settings; (2) The other user must have `alert_lat/lng` set in their profile |
