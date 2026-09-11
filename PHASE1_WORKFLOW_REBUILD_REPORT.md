# PHASE 1 — Order/Escrow Workflow Rebuild

**Commit:** `8a1ef3c` — pushed to `main`  
**Date:** 2026-09-11  
**Status:** Complete and verified

---

## State Machine

```
active ──(buyer pays)──▶ reserved (listing)
   │
   ▼
pending_payment ──(webhook verified)──▶ awaiting_seller_delivery
                                          │
                                          ▼
                                    credentials_submitted ──(buyer confirms)──▶ completed
                                          │
                                          ▼
                                    disputed ──(admin release)──▶ completed
                                    disputed ──(admin refund)──▶ refunded
                                          │
                                    awaiting_seller_delivery ──(cancel)──▶ cancelled
                                    pending_payment ──(cancel)──▶ cancelled
                                    pending_payment ──(webhook fail)──▶ cancelled
```

**Legacy statuses kept read-only for existing orders:** `payment_confirmed`, `in_transfer`  
→ `stepIndexFor()` maps them to correct step index.

**Key decision:** `buyer_verifying` merged into `credentials_submitted` — one single state  
for "account details received, buyer verifying." Documented in `orderMachine.js` helpers.

---

## Listing Locking

| Action | Listing change |
|--------|---------------|
| Buyer pays (`initializePayment`) | `active` → `reserved` (atomic, Firestore transaction) |
| Buyer cancels / payment fails | `reserved` → `active` (via `cancelPendingOrder`) |
| Buyer confirms receipt / admin release | `reserved` → `sold` |
| Admin refunds | `reserved` → `active` |

**Double-purchase prevention:** `initializePayment` uses a Firestore transaction to set `status:'reserved'`,  
`reservedById`, `reservedAt` — rejects if listing is not `active`. All marketplace queries (`where('status','==','active')`)  
automatically exclude reserved listings from Browse, Home, Search, and Friday Drops.

**Reserved fields cleared on resolution:** `reservedById: deleteField()`, `reservedAt: deleteField()`  
prevents stale lock from blocking re-listing.

---

## Credential Delivery

**Never in chat, URLs, localStorage, console, or admin tables.**

- **Storage:** `orders/{orderId}/delivery` subcollection — documents with `accountEmail`, `accountPassword`,  
  `submittedById`, `submittedByName`, `submittedAt`.
- **Write:** backend only (`POST /api/escrow/delivery` via Admin SDK).
- **Read:** buyer (buyerDashboard/OrderDetailPage), seller (OrderDetailPage `<details>`), admin.
- **Firestore rules:** `allow read: if isLoggedIn() && (order.buyerId==uid || order.sellerId==uid || isAdmin())`  
  `allow create, update, delete: false` (backend-only writes).
- **Reveal toggle:** frontend `CredentialsList` component — password hidden by default, one-click reveal.

---

## Notifications (all 4 events)

| Event | Recipients | Title | Backend |
|-------|-----------|-------|---------|
| Payment verified | Seller + Buyer | "Your eFootball account just got a buyer!" / "Payment received!" | `paystackController.processSuccessfulPayment` |
| Credentials submitted | Buyer | "Your account details are ready" | `escrowController.submitDelivery` |
| Delivery confirmed | Seller | "Account confirmed by buyer!" | `escrowController.release` |
| Dispute raised | Seller + Admin | "Dispute opened — order under review" | `escrowController.dispute` |

Admin UID resolved via `admin.auth().getUserByEmail(ADMIN_EMAIL)` (`ochiengv250@gmail.com`).  
Admin notifications: look up in the Notifications bell using the admin email.

---

## Backend Files Changed

| File | What changed |
|------|-------------|
| `backend/src/controllers/paystackController.js` | Transactional `initializePayment` (listing lock), `cancelPayment`, `handlePaystackCancel` (GET `/api/payment/paystack/cancel`), `processSuccessfulPayment` sets `awaiting_seller_delivery`, `idempotency guard` updated, callback-failure releases listing |
| `backend/src/routes/payment.routes.js` | Added `POST /cancel` (auth), `GET /paystack/cancel` |
| `backend/src/controllers/escrowController.js` | `submitDelivery` (POST `/api/escrow/delivery`), release clears reserved fields, dispute notifies seller+admin, `ADMIN_EMAIL` helper |
| `backend/src/routes/escrow.routes.js` | Added `POST /delivery` (auth) |
| `backend/firestore.rules` | `orders/{orderId}/delivery` subcollection rules (read-only for parties) |
| `backend/src/controllers/aiController.js` | "How Selling Works" + "Account Transfer Process" rewritten for credential flow |
| `backend/.env.example` | Added `ADMIN_EMAIL` |

---

## Frontend Files Changed

| File | What changed |
|------|-------------|
| `frontend/src/utils/constants.js` | ORDER_STATUS: + `awaiting_seller_delivery` (yellow), + `credentials_submitted` (purple) |
| **`frontend/src/utils/orderMachine.js`** | **NEW** — `PAID_AND_PENDING_STATUSES`, `isPaidStatus`, `isTerminalStatus`, `sellerCanDeliver`, `buyerCanConfirm`, `buyerCanDispute` |
| `frontend/src/services/paymentService.js` | + `cancelPayment`, + `submitDelivery` |
| `frontend/src/services/ordersService.js` | + `getOrderDeliveries`, + `subscribeToDeliveries` |
| `frontend/src/pages/buyer/OrderDetailPage.jsx` | Fully rewritten — role-aware, seller delivery form, buyer waiting panel, credentials list with reveal, confirm modal, dispute form, `stepIndexFor()` legacy mapping, `STEPS` updated, payment-success banner gated |
| `frontend/src/components/checkout/PayNowButton.jsx` | `cancelPayment` on close/dismiss, disabled unless listing `status==='active'` |
| `frontend/src/pages/seller/tabs/OrdersTab.jsx` | Fully rewritten — filter pending/submitted, action-required callouts, "Submit Details" CTA, updated HOW ORDERS WORK guide |
| `frontend/src/components/chat/ChatWindow.jsx` | Status messages for new statuses; `refunded` disables input |
| `frontend/src/pages/buyer/MyOrdersPage.jsx` | `ACTIVE_STATUSES` includes new statuses |
| `frontend/src/pages/buyer/BuyerDashboardPage.jsx` | `inProgress` includes new statuses; label/color via ORDER_STATUS |
| `frontend/src/pages/buyer/SavedListingsPage.jsx` | Live-status enrichment — only shows `active` listings |
| `frontend/src/pages/public/FridayDropsPage.jsx` | Hides drops for non-active listings |
| `frontend/src/pages/public/ListingDetailPage.jsx` | Reserved banner + unavailable gating + `howItWorksSteps` updated |
| `frontend/src/components/listings/ListingCard.jsx` | Reserved overlay (`RESERVED` vs `SOLD`) |
| `frontend/src/pages/seller/tabs/ListingsTab.jsx` | Reserved badge + filter tab, pause/delete disabled for reserved |
| `frontend/src/pages/seller/tabs/OverviewTab.jsx` | New status colors + seller guide updated (credential flow text) |
| `frontend/src/pages/seller/tabs/EarningsTab.jsx` | `PAID_AND_PENDING_STATUSES` import |
| `frontend/src/pages/buyer/AccountPage.jsx` | Active order filter includes new statuses |
| `frontend/src/pages/admin/AdminDisputesPage.jsx` | Refund restores listing to `active` + clears reserved fields + notify buyer+seller; release → sold + notify |
| `frontend/src/pages/admin/AdminOrdersPage.jsx` | Full release/refund workflow (listing update, seller totalSales, notifications, chat system message) |
| `frontend/src/components/home/HowItWorksSection.jsx` | Step 4: "Seller sends login details via your order" |
| `frontend/src/pages/public/HowItWorksPage.jsx` | Receive-account step rewritten for credential delivery |

---

## Verification

| Check | Result |
|-------|--------|
| `npm run build` (frontend) | ✅ Clean build, no errors |
| `npm test` (frontend, 24 tests) | ✅ 24/24 pass |
| `node --check` (all backend .js) | ✅ All files syntax clean |

---

## What Remains (Phase 2 / polish)

- **Admin manual payout workflow:** `AdminDisputesPage` prompt for seller payout phone, track payout status.
- **Order auto-cancel timeout:** e.g., cancel orders stuck in `awaiting_seller_delivery` > 24h.
- **Email notifications:** all events currently only create Firestore notification docs — no email push.
- **Review/rating system:** buyer leaves review after confirmed delivery.
- **Seller dashboard stats:** `awaiting_seller_delivery` / `credentials_submitted` broken down.
- **Saved listings badge:** count badge on heart icon (live sync).
