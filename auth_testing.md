# Auth Testing Playbook

## Step 1: MongoDB Verification
```
mongosh
use lostfound_db
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})
```
Verify:
- bcrypt hash starts with `$2b$`
- Index on `users.email` (unique)
- TTL index on `password_reset_tokens.expires_at`

## Step 2: API Testing
```
curl -c c.txt -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@findr.app","password":"admin123"}'
curl -b c.txt http://localhost:8001/api/auth/me
```
Login returns user object & sets `access_token` + `refresh_token` cookies. /me uses cookie.
