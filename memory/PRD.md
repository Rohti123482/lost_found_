# Findr — Universal Lost & Found Recovery, Rescue & Community Coordination

## Original problem statement
Build a community-driven full-stack app to report, locate, rescue and reunite missing pets and missing people, with geolocation, intelligent matching, notifications and NGO coordination. (Originally specified as Streamlit + Supabase + Folium; user accepted adaptation to React + FastAPI + MongoDB + Leaflet + Emergent object storage.)

## Architecture
- **Frontend:** React 19 + Tailwind + shadcn/ui + react-leaflet
- **Backend:** FastAPI (Python), Motor (async Mongo), bcrypt + PyJWT (httpOnly cookies)
- **Database:** MongoDB (collections: users, reports, files, notifications, matches, ngo_cases, login_attempts)
- **Image storage:** Emergent object storage (`EMERGENT_LLM_KEY`)
- **Maps:** Leaflet + OpenStreetMap, custom drop-pins (terracotta = lost, sage = found, blue = you)
- **Design:** Light "Organic & Earthy" palette, Outfit (display) + Manrope (body)

## User personas
1. **Community member (user)** — reports lost or found cases, browses, gets nearby alerts and match notifications.
2. **NGO partner (ngo)** — claims found cases, coordinates shelter, drives cases to reunification.
3. **Admin** — moderates content, manages users (foundation in place for future expansion).

## Core requirements (static)
- Auth (signup/login/logout, JWT cookies, role-based)
- Lost & Found reporting with multi-image upload + map picker
- Interactive map (Leaflet) with colored markers
- Geolocation ("Use my location"), distance-based filters
- Search & filter (keyword/type/color/distance)
- Intelligent rule-based matching (entity type + color + keyword + distance)
- Notifications (match + nearby + NGO updates)
- NGO portal (claim case, status workflow: claimed → sheltered → reunified/closed)
- My Reports (edit/delete/mark-resolved)
- **(v2)** Public shareable report page (`/share/:id`) + WhatsApp/Twitter/Copy share buttons
- **(v2)** Profile page with map-based alert location + radius slider
- **(v2)** Auto-seeded demo data across 6 Indian cities for college presentations

## What's been implemented (2026-02-09)
- Full auth flow with seeded admin and NGO accounts
- Reports CRUD + ownership checks (403 for non-owner)
- Multi-image upload via Emergent object storage with public read serve
- Live map with terracotta/sage/blue pins; click-to-pick on report form
- Filters with case-insensitive keyword + radius_km via Haversine
- Match score & match notifications (threshold 50 for alerts, 30 for showing)
- Nearby alerts via configurable user `alert_lat/lng/radius_km`
- NGO dashboard with claim + status update workflow
- Earthy "Findr" landing with bento grid and hero image
- 22/22 backend pytest cases passing; full frontend smoke tested

### v2 additions (2026-02-09 — same session)
- 14 demo reports auto-seeded across Bengaluru, Mumbai, Delhi, Pune, Chennai, Hyderabad — designed so several lost/found pairs auto-match (great for the demo)
- Profile page (`/profile`) with shadcn Slider + map picker
- Public share page (`/share/:id`) — no auth required, optimized for sharing
- WhatsApp / Twitter / Copy link buttons on report detail + public page
- Header now has Profile button next to Logout

## P1 / P2 backlog
- **P1**: Admin moderation page (delete spammy reports, ban users)
- **P1**: Geospatial 2dsphere index + bounding-box prefilter for scale
- **P2**: AI image-similarity matching (Gemini Nano Banana / GPT vision)
- **P2**: Email/SMS push for match notifications (SendGrid/Twilio)
- **P2**: Tighten CORS to explicit origin; remove demo creds from /login

## Next tasks
- Light admin moderation tools
- Optional: AI image matching (with Emergent LLM key)
- Optional: Email digest of nearby reports (SendGrid)
