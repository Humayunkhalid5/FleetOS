# FleetOS Refactor TODO

## Goal
Fix login-after-signup bug and remove the non-functional phone verification flow.

## Tasks
- [x] 1. `server/src/middleware/authMiddleware.js` — remove invalid `.select('-password')` call on plain object.
- [x] 2. `client/src/pages/public/Register/Register.jsx` — remove phone verification step; navigate straight to dashboard after signup.
- [x] 3. `server/src/app.js` — remove verification routes import/usage.
- [x] 4. `server/src/routes/verificationRoutes.js` — delete file.
- [x] 5. `server/src/controllers/verificationController.js` — delete file.
- [x] 6. Restart server and verify signup → dashboard → protected API calls work.
