# FleetOS Fixes TODO

## Goal
Fix login page issues, fix companies display, fix site slowness, and set up MongoDB integration.

## Tasks
- [x] 1. `server/src/controllers/companyController.js` — fix broken syntax (unclosed res.json swallowing getCompany).
- [x] 2. `server/src/server.js` — default to fixed port 5000 when PORT unset.
- [x] 3. `server/src/config/db.js` — add MongoDB connection timeout for fail-fast.
- [x] 4. `server/.env.example` — add MONGODB_URI, JWT_SECRET, PORT config.
- [x] 5. Create `server/.env` with sensible defaults (JWT_SECRET, PORT; MongoDB optional).
- [x] 6. Update `server/src/data/bootstrap.js` to seed into MongoDB when connected.
- [ ] 7. Verify server starts and login/companies endpoints work.
