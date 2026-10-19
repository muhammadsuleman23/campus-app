# What changed in this update

## 1. Registration + Gmail OTP verification

**New files:**
- `backend/models/Otp.js` — generates/verifies/resends OTP codes (hashed, 10-minute expiry, 60s resend cooldown, 5 max wrong attempts)
- `backend/config/mailer.js` — sends the OTP email via Gmail SMTP (nodemailer)
- `frontend/src/pages/VerifyOtp.jsx` — the 6-digit code entry page

**Changed files:**
- `backend/config/schema.sql` — added an `otp_codes` table (your existing `users.is_verified` column and `User.setVerified()` were already there and are now actually used)
- `backend/controllers/userController.js` — `registerUser` now creates + emails an OTP instead of logging the user in immediately; added `verifyOtp` and `resendOtp`; `loginUser` now blocks unverified accounts
- `backend/routes/userRoutes.js` — added `POST /api/users/verify-otp` and `POST /api/users/resend-otp`
- `backend/.env` — added `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_APP_PASSWORD`, `EMAIL_FROM` (placeholders — **you must fill these in**, see below)
- `backend/package.json` — added `nodemailer`
- `frontend/src/pages/Signup.jsx` — after registering, redirects to `/verify-otp` instead of `/login`
- `frontend/src/pages/Login.jsx` — if login says the account isn't verified, redirects to `/verify-otp`
- `frontend/src/App.jsx` — added the `/verify-otp` route

### ⚠️ You must set up a Gmail App Password before this works

Regular Gmail passwords don't work for SMTP. Steps:
1. Go to your Google Account → Security → turn on **2-Step Verification** (required first).
2. Go to https://myaccount.google.com/apppasswords, create an app password (name it anything, e.g. "Campus App").
3. Copy the 16-character password Google gives you.
4. Open `backend/.env` and fill in:
   ```
   EMAIL_USER=your_real_gmail@gmail.com
   EMAIL_APP_PASSWORD=the16charpassword
   EMAIL_FROM="Campus App <your_real_gmail@gmail.com>"
   ```

### Database migration

Your `schema.sql` uses `CREATE TABLE IF NOT EXISTS`, so it's safe to re-run against
your existing Neon database:
```
npm run init-db
```
This only adds the new `otp_codes` table — nothing in your existing tables/data changes.

---

## 2. Login

No structural change beyond the verification gate described above. Existing
JWT/`protect` middleware, admin login, and all other auth behavior are untouched.

---

## 3. Light theme

Converted from the dark glassmorphism theme to a light SaaS-style theme across
all 18 pages/components. Backgrounds are white/gray-50, text is dark gray on
light surfaces, buttons/accents keep their brand colors with proper contrast,
cards use subtle borders + shadows instead of glass blur. Layout, animations,
and all functionality are unchanged — this was a visual-only pass.

`frontend/src/pages/Dashboard.jsx`, `Login.jsx`, and `Signup.jsx` were rewritten
by hand. The remaining 15 files were converted with a scripted pass (color
mapping) followed by a manual review pass to fix contrast issues and leftover
hardcoded dark colors. `npm run build` completes cleanly with no errors.

---

## How to run

```bash
# Backend
cd backend
npm install
npm run init-db      # safe to re-run, only adds the otp_codes table
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

## What to test

1. Register with a real Gmail address → check inbox for the OTP email.
2. Enter the code on the verify page → should log you straight into the dashboard.
3. Try wrong code → clear error, doesn't consume the correct attempt.
4. Wait 10+ minutes (or manually expire the row in `otp_codes`) → confirm rejection.
5. Use "Resend code" → confirm the 60s cooldown, then that the new code works.
6. Log in with an unverified account → redirected to verify page, no token issued.
7. Log in with a verified account → normal login, unchanged.
8. Click through pages on desktop + mobile width → check contrast/readability.
