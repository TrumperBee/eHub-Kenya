# eFootball Hub Kenya — Deployment Checklist ⚽

## Frontend (Vercel / Netlify)

- [ ] `npm run build` succeeds (1882 modules, 0 errors)
- [ ] Set `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
      `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
      `VITE_FIREBASE_APP_ID`, `VITE_BACKEND_URL` (real URL) in dashboard env vars
- [ ] Set `VITE_ADMIN_EMAIL` to the same address as the backend `ADMIN_EMAIL`
      (the Command Center route refuses any other account)

## Backend (Render / VPS)

- [ ] Set `NODE_ENV=production` (drops localhost from CORS and enforces the
      admin/payment secrets at startup)
- [ ] Set `PORT=5000`, `FRONTEND_URL` to deployed frontend URL
- [ ] Set Firebase Admin env vars: `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`,
      `FIREBASE_CLIENT_EMAIL` (required — the server exits if any is missing)
- [ ] Set `ADMIN_EMAIL` (required in production — the server exits without it)
- [ ] Set ZetuPay credentials: `ZETUPAY_SECRET_KEY`
      (server-side only; signs webhooks via `x-zetupay-signature`)
- [ ] Optional: `JWT_SECRET` / `REQUIRE_JWT_SECRET` — only needed if a JWT layer
      is added later; authentication uses Firebase ID tokens
- [ ] Optional: `ZETUPAY_WEBHOOK_SECRET` if `ZETUPAY_SECRET_KEY` is a test key,
      and `ZETUPAY_CHANNEL_ID` if the wallet settles into a specific paybill/till
- [ ] Set Web Push: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
      `VAPID_SUBJECT=mailto:ochiengv250@gmail.com`
- [ ] Set Cloudflare R2: `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
      `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL`
- [ ] Set Email: `EMAIL_USER`, `EMAIL_PASS`
- [ ] Set Gemini: `GEMINI_API_KEY`

## ZetuPay Dashboard

- [ ] Toggle **Test mode** while developing
- [ ] Set the Transaction Callback URL to
      `https://your-backend.com/api/payment/zetupay/callback`
- [ ] In production, use live `sk_live_` keys

## Firebase Console

- [ ] Upload `backend/firestore.rules` as Firestore Security Rules
- [ ] Auth: enable Email/Password + Google sign-in
- [ ] Create composite indexes for any Firestore console warnings
- [ ] Run the private-field migration once, BEFORE letting users browse:
      `node backend/scripts/migratePrivateUserFields.js` (dry run), then
      `node backend/scripts/migratePrivateUserFields.js --apply`
      It moves email/phone/WhatsApp into `users/{uid}/private/contact`, strips
      contact fields from public listings and backfills order contact snapshots.

## Post-Deployment

- [ ] ZetuPay callback URL must be HTTPS and publicly accessible
- [ ] Test full purchase flow end-to-end in the ZetuPay sandbox (M-Pesa STK Push)
- [ ] Verify Cloudflare R2 images load (not broken URLs)
- [ ] Verify admin at `/hub-command-af29x` works
- [ ] Verify Transfer Room accessible for approved sellers
