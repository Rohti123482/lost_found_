# Findr — How to Run & Access Everything

> Complete reference for accessing the database, running locally, and deploying.

---

## Part 1 — Database access (right now, in this Emergent container)

**MongoDB is already running** inside the container at:
- URI: `mongodb://localhost:27017`
- Database: `lostfound_db`
- Collections: `users`, `reports`, `notifications`, `matches`, `ngo_cases`, `files`, `login_attempts`, `password_reset_tokens`

### Open the Mongo shell from this container (right now)

Click the **Shell** / **Terminal** button in the Emergent interface, then:

```bash
mongosh lostfound_db
```

Once inside `mongosh`:

```javascript
show collections
db.users.find().pretty()
db.reports.countDocuments()
db.reports.find({report_type: "lost", entity_type: "dog"}).pretty()

// All Bengaluru reports
db.reports.find({location_text: /Bengaluru/i})

// Active reports near a specific lat/lng (manual radius check)
db.reports.find({status: "active"}, {name:1, latitude:1, longitude:1, _id:0})

// User counts by role
db.users.aggregate([{$group: {_id: "$role", count: {$sum: 1}}}])
```

### Run quick reports for your viva

```javascript
// How many cases were created in the last 24 hours?
db.reports.countDocuments({
  created_at: { $gte: new Date(Date.now() - 86400*1000) }
})

// Average match score across the system
db.matches.aggregate([
  {$group: {_id: null, avg: {$avg: "$score"}, count: {$sum: 1}}}
])

// Count reports per entity type
db.reports.aggregate([
  {$group: {_id: "$entity_type", count: {$sum: 1}}},
  {$sort: {count: -1}}
])
```

### Export the data (for your project report screenshots)

```bash
mongoexport --db=lostfound_db --collection=reports --out=/tmp/reports.json --pretty
mongoexport --db=lostfound_db --collection=users --out=/tmp/users.json --pretty
```

---

## Part 2 — Running on your own laptop (step-by-step)

You'll need: **Python 3.10+**, **Node 18+**, **yarn**, and **MongoDB** (locally or MongoDB Atlas free tier).

### Step 1 — Get the code

Either:
- **Push to GitHub** from Emergent ("Save to GitHub" button) and `git clone` on your laptop, OR
- **Download** via the VS Code view in Emergent

You should end up with the same `/app` structure on your laptop.

### Step 2 — Install MongoDB

**Option A: Local MongoDB (easiest for college submission)**

- macOS: `brew install mongodb-community && brew services start mongodb-community`
- Ubuntu: follow https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/
- Windows: download MongoDB Community installer from https://www.mongodb.com/try/download/community

Verify: `mongosh` should connect without errors.

**Option B: MongoDB Atlas free tier (cloud, no install)**

1. Sign up at https://www.mongodb.com/atlas
2. Create a free **M0** cluster.
3. Create a database user, then click **Connect → Drivers** to get a URI like:
   ```
   mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/lostfound_db?retryWrites=true&w=majority
   ```
4. Use that URI in `backend/.env` instead of `mongodb://localhost:27017`.

### Step 3 — Configure environment files

#### `backend/.env`

```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="lostfound_db"
CORS_ORIGINS="http://localhost:3000"
JWT_SECRET="<generate with: python -c 'import secrets; print(secrets.token_hex(32))'>"
ADMIN_EMAIL="admin@findr.app"
ADMIN_PASSWORD="admin123"
APP_NAME="lostfound"
EMERGENT_LLM_KEY="<your key from Emergent dashboard, only needed for image upload>"
```

> **Note**: If you don't have `EMERGENT_LLM_KEY`, image upload will fail but everything else works. To swap in local file storage instead, replace `put_object`/`get_object` in `server.py` with simple file I/O to a `uploads/` folder.

#### `frontend/.env`

```env
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=3000
```

### Step 4 — Install dependencies

Open **two terminals**.

**Terminal 1 — backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Terminal 2 — frontend:**
```bash
cd frontend
yarn install
# If yarn isn't installed: npm install -g yarn
```

### Step 5 — Run the apps

**Terminal 1 — backend (port 8001):**
```bash
cd backend
source venv/bin/activate
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

You should see:
```
Object storage initialized
Seeded admin: admin@findr.app
Seeded 14 demo reports
Application startup complete.
```

**Terminal 2 — frontend (port 3000):**
```bash
cd frontend
yarn start
```

Browser opens automatically at http://localhost:3000.

### Step 6 — Log in

- Email: `admin@findr.app`
- Password: `admin123`

You'll see 14 demo reports across 6 Indian cities. Done.

### Quick troubleshooting

| Problem | Fix |
|---|---|
| `MONGO_URL` connection error | Make sure MongoDB is running. `brew services start mongodb-community` (macOS) or `sudo service mongod start` (Linux). Test with `mongosh`. |
| `bcrypt` install error on Windows | Install Microsoft C++ Build Tools, or use `pip install bcrypt --no-binary bcrypt`. |
| Image upload fails | `EMERGENT_LLM_KEY` not set. The rest of the app still works. |
| Frontend can't reach backend | Check that `REACT_APP_BACKEND_URL` in `frontend/.env` points to `http://localhost:8001` and there's no trailing slash. |
| CORS error | Set `CORS_ORIGINS="http://localhost:3000"` in backend `.env` and restart the backend. |
| Port already in use | `lsof -i :8001` then `kill <pid>` (Mac/Linux), or change the port and update `REACT_APP_BACKEND_URL` accordingly. |

---

## Part 3 — Deployment options

### Option A: Deploy on Emergent (one click)

- Click **Deploy** in the Emergent interface.
- Costs **50 credits/month**, includes managed MongoDB, public HTTPS URL, environment management, rollback, custom domain.
- Takes 10–15 minutes the first time.

### Option B: Push to GitHub + deploy elsewhere (free path)

1. **Push to GitHub** — click "Save to GitHub" in the Emergent chat (requires paid plan).
2. **Free MongoDB**: MongoDB Atlas M0 (512 MB, free forever).
3. **Free hosting** for full-stack:
   - **Render.com** — free tier; deploy backend (FastAPI) + frontend (React) as two services.
   - **Railway.app** — $5/month free credit; great for both backend + Mongo.
   - **Vercel** (frontend only) + **Render/Railway** (backend) — best UX for frontend.

### Option C: Download and run on a college server / local intranet

- Download via Emergent's **VS Code view**.
- Run on a small VM (1 vCPU / 2 GB RAM is enough for demo).
- Use `pm2`/`systemd` for backend, `nginx` to serve frontend `build/` folder.

### Recommended path for your final-year project

1. **Demo from Emergent's preview URL** during your viva — it's already live, no setup needed.
2. **Push to GitHub** so your professor can browse the code and you have version control on your CV.
3. **Add screenshots + this guide + the PROJECT_GUIDE.md** to your project report.

You don't *need* to deploy publicly for a college project. The preview URL from Emergent is enough for the demo, and the GitHub link is enough for "where can I see the code?" questions.

---

## Part 4 — What to put in your project submission folder

```
your-project-folder/
├── README.md                  ← short overview (use the one in /app)
├── PROJECT_GUIDE.md           ← copy from /app/memory/
├── HOW_TO_RUN.md              ← copy this file
├── backend/                   ← entire backend folder
├── frontend/                  ← entire frontend folder (delete node_modules and build first!)
├── screenshots/               ← landing, dashboard, map, mobile, admin panel, share page
├── architecture.png           ← draw the architecture diagram (see below)
└── presentation.pdf           ← your viva slides
```

### Architecture diagram you can draw on paper or in draw.io

```
┌─────────────────┐         HTTPS         ┌──────────────────┐
│   React 19 SPA  │  ◄─── cookies ────►   │  FastAPI Backend │
│  + react-leaflet │                       │  + JWT + bcrypt  │
│  Mobile-first UI │                       │  + matching algo │
└────────┬────────┘                       └─────────┬────────┘
         │                                          │
   Web Push API                                MongoDB Driver
   (notifications)                                  │
                                                    ▼
                                          ┌──────────────────┐
                                          │   MongoDB        │
                                          │   - users        │
                                          │   - reports      │
                                          │   - notifications│
                                          │   - matches      │
                                          │   - ngo_cases    │
                                          └──────────────────┘
                                                    │
                              Emergent Object Storage
                              (image hosting via S3-compatible API)
```

---

## Quick reference card (memorise for viva)

| What | Where |
|---|---|
| Database type | MongoDB (NoSQL document store) |
| Database URL | `mongodb://localhost:27017` |
| Database name | `lostfound_db` |
| Backend port | 8001 |
| Frontend port | 3000 |
| Backend URL prefix | `/api` (e.g., `/api/reports`) |
| Auth method | JWT in httpOnly cookies |
| Password hashing | bcrypt (with salt, ~250ms per verify) |
| Maps | Leaflet + OpenStreetMap tiles (free) |
| Notifications | 30s polling + Web Push API |
| Admin login | `admin@findr.app` / `admin123` |
| Demo seed | 14 reports across 6 Indian cities |
