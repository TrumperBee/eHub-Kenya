# eFootball Hub Kenya — Deployment Checklist ⚽

## Frontend (Vercel / Netlify)

- [ ] `npm run build` succeeds (1882 modules, 0 errors)
- [ ] Set `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
      `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
      `VITE_FIREBASE_APP_ID`, `VITE_BACKEND_URL` (real URL) in dashboard env vars
- [ ] Set `VITE_PAYSTACK_PUBLIC_KEY` to your Paystack publishable key

## Backend (Render / VPS)

- [ ] Set `PORT=5000`, `FRONTEND_URL` to deployed frontend URL
- [ ] Set Firebase Admin env vars: `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`,
      `FIREBASE_CLIENT_EMAIL`
- [ ] Set Paystack credentials: `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`
- [ ] Set `PAYSTACK_CALLBACK_URL=https://your-backend.com/api/payment/paystack/callback`
- [ ] Set Cloudflare R2: `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
      `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL`
- [ ] Set Email: `EMAIL_USER`, `EMAIL_PASS`
- [ ] Set Gemini: `GEMINI_API_KEY`

## Paystack Dashboard

- [ ] Toggle **Test mode** while developing
- [ ] Set Webhook URL to `https://your-backend.com/api/payment/paystack/webhook`
      (signature verified with `PAYSTACK_SECRET_KEY`)
- [ ] In production, use live `sk_live_` / `pk_live_` keys

## Firebase Console

- [ ] Upload `backend/firestore.rules` as Firestore Security Rules
- [ ] Auth: enable Email/Password + Google sign-in
- [ ] Create composite indexes for any Firestore console warnings

## Post-Deployment

- [ ] Paystack webhook URL must be HTTPS and publicly accessible
- [ ] Test full purchase flow end-to-end with Paystack test card `4084 0840 8408 4081` (CVV `408`, any future expiry)
- [ ] Verify Cloudflare R2 images load (not broken URLs)
- [ ] Verify admin at `/hub-command-af29x` works
- [ ] Verify Transfer Room accessible for approved sellers
