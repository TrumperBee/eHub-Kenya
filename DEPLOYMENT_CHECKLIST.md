# eFootball Hub Kenya — Deployment Checklist ⚽

## Frontend (Vercel / Netlify)

- [ ] `npm run build` succeeds (1882 modules, 0 errors)
- [ ] Set `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
      `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
      `VITE_FIREBASE_APP_ID`, `VITE_BACKEND_URL` (real URL) in dashboard env vars

## Backend (Railway / VPS)

- [ ] Set `PORT=5000`, `FRONTEND_URL` to deployed frontend URL
- [ ] Set Firebase Admin env vars: `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`,
      `FIREBASE_CLIENT_EMAIL`
- [ ] Set M-Pesa production credentials: `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`,
      `MPESA_SHORTCODE`, `MPESA_PASSKEY`
- [ ] Set `MPESA_ENV=production` (was `sandbox`)
- [ ] Set `MPESA_CALLBACK_URL=https://your-backend.com/api/payment/callback`
- [ ] Set Cloudflare R2: `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
      `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL`
- [ ] Set Email: `EMAIL_USER`, `EMAIL_PASS`

## Firebase Console

- [ ] Upload `backend/firestore.rules` as Firestore Security Rules
- [ ] Auth: enable Email/Password + Google sign-in
- [ ] Create composite indexes for any Firestore console warnings

## Post-Deployment

- [ ] M-Pesa callback URL must be HTTPS and publicly accessible
- [ ] Test full purchase flow end-to-end with real M-Pesa
- [ ] Verify Cloudflare R2 images load (not broken URLs)
- [ ] Verify admin at `/hub-command-af29x` works
- [ ] Verify Transfer Room accessible for approved sellers
