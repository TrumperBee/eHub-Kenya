# eFootball Hub Kenya ⚽

A Kenyan-first eFootball account marketplace with M-Pesa STK Push payments, Firestore database, Cloudflare R2 image storage, real-time chat, escrow protection, and an admin panel.

## Tech Stack

- **Frontend:** React 19, Vite 8, Tailwind CSS 3
- **Backend:** Node.js, Express, Firebase Admin SDK
- **Database:** Firestore (Firebase)
- **Auth:** Firebase Authentication (Email/Password + Google)
- **Payments:** Daraja M-Pesa STK Push
- **Storage:** Cloudflare R2 (S3-compatible)
- **Chat:** Real-time via Firestore `onSnapshot`
- **Email:** Nodemailer (Gmail SMTP)

## Features

- Browse & purchase eFootball accounts with M-Pesa
- Seller dashboard ("Transfer Room") for listing management
- Real-time chat between buyer and seller per order
- Escrow protection — funds held until buyer confirms receipt
- Admin command center for moderation
- Role-based access control (buyer, seller, admin)

## Getting Started

1. Clone the repo
2. Install dependencies: `cd frontend && npm install` and `cd backend && npm install`
3. Set up `.env` files (see `.env.example` patterns)
4. Run frontend: `npm run dev` (port 5173)
5. Run backend: `npm start` (port 5000)

## Deployment

See `DEPLOYMENT_CHECKLIST.md` for production setup.
