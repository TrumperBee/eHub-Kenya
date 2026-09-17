const { canonicalStatus } = require('./orderStateMachine');
const { verificationStatusAt } = require('./verificationWindow');

/**
 * eHub Kenya — Phase 5: automatic escrow release decision (pure).
 *
 * Single source of truth for whether a PAID order is eligible for automatic
 * release. Purely derived — no Firestore reads, no auth, no scheduler. Kept
 * separate from the controller so the eligibility rule is unit-testable and so
 * both the stats-reconciler worker and the on-demand admin route agree.
 *
 * SCOPE GUARD (Phase-5 honesty contract):
 *   • This ONLY decides escrow release (hold → released), i.e. the escrow
 *     becomes payable to the seller. It does NOT and MUST NOT claim a Paystack
 *     Transfer/payout happened, because this backend has NO Paystack Transfer
 *     API wired (paystackService exposes only initialize/verify). A seller
 *     payout therefore remains "pending admin manual confirmation" — the exact
 *     language the existing escrow email flow already uses. Never report
 *     "seller paid" unless a real provider payout was actually executed.
 *
 * ELIGIBILITY (ALL must hold):
 *   1. escrow currently HELD (money actually parked in escrow).
 *   2. canonical status == 'credentials_submitted'.
 *   3. a verification deadline exists.
 *   4. the deadline has PASSED (nowMs >= deadline) — the 30-minute buyer
 *      verification window (§Phase 4) is over.
 *   5. NO open dispute: canonical status is not 'disputed' and disputeStatus is
 *      not an open/resolving value (an open/under_review dispute freezes
 *      escrow — automatic release is forbidden while a dispute is being
 *      reviewed; only an admin resolve may release after that).
 *
 * IDEMPOTENCY: an order whose escrow is no longer HELD (already released,
 * refunded, or completed) is NEVER eligible again. `escrowStatus` is the guard,
 * so a repeated worker pass or a concurrent admin route can never double-release.
 *
 * @returns {{ eligible: boolean, reason: string }}
 *   reason ∈ eligible | not_held | not_credentials_submitted | missing_deadline
 *            | not_expired | disputed | already_released
 */
function escrowAutoReleaseDecision(effectiveOrder, nowMs) {
  const status = canonicalStatus(effectiveOrder.status);
  const escrowStatus = (effectiveOrder.escrowStatus || '').toLowerCase();
  const deadline = effectiveOrder.verificationDeadline
    ? (effectiveOrder.verificationDeadline.toMillis
        ? effectiveOrder.verificationDeadline.toMillis()
        : effectiveOrder.verificationDeadline)
    : null;
  const disputeStatus = (effectiveOrder.disputeStatus || '').toLowerCase();

  if (escrowStatus !== 'held') {
    return { eligible: false, reason: escrowStatus === 'released' || escrowStatus === 'refunded' ? 'already_released' : 'not_held' };
  }

  if (status !== 'credentials_submitted') {
    return { eligible: false, reason: 'not_credentials_submitted' };
  }

  if (!deadline) {
    return { eligible: false, reason: 'missing_deadline' };
  }

  if (nowMs < deadline) {
    return { eligible: false, reason: 'not_expired' };
  }

  const disputed =
    status === 'disputed' ||
    (disputeStatus && disputeStatus !== 'none' && disputeStatus !== 'rejected');

  if (disputed) {
    return { eligible: false, reason: 'disputed' };
  }

  return { eligible: true, reason: 'eligible' };
}

const { adminDb, admin } = require('./firebaseAdmin');
const { assertValidTransition } = require('./orderStateMachine');

/**
 * eHub Kenya — Phase 5: automatic matured-release worker pass.
 *
 * Runs on the ONLY real server-side scheduler this backend has: the in-process
 * stats-reconciler interval (startStatsReconciler in server.js). NOT a browser
 * timer. Because Release (Render) keeps the web service process alive while it
 * is reachable, this pass executes unattended on the server just like the
 * existing homepage-stats reconciliation.
 *
 * IDEMPOTENCY / FIRST-WRITE-WINS:
 *   • The Firestore query only picks up orders still escrowStatus == 'held'
 *     AND canonical status == 'credentials_submitted'.
 *   • Inside a runTransaction the order is RE-READ and RE-DECIDED; a concurrent
 *     manual buyer release, admin resolve, or a second worker pass that already
 *     flipped escrowStatus -> 'released' makes the fresh decision ineligible
 *     (reason 'already_released') and the tx write is skipped. Two overlapping
 *     passes can therefore NEVER double-release or double-payout.
 *   • payoutStatus is derived from the existing order value and defaults to
 *     'payout_pending_admin_manual' — NEVER 'paid' unless the order already
 *     proved a real provider payout. This backend has NO Paystack Transfer API
 *     wired (paystackService exposes initialize/verify only), so automatic
 *     release only makes escrow payable to the seller; the actual money
 *     movement remains an admin manual confirmation — the exact language the
 *     escrow emails already use.
 *
 * DISPUTE FREEZE: eligibility denies any order whose canonical status is
 * 'disputed' or whose disputeStatus is open/under review (§5 / §6). A disputed
 * order is never auto-released — only an admin resolve may release it.
 */
async function runMaturedReleasePass({ limit = 100 } = {}) {
  const nowMs = Date.now();
  const snap = await adminDb
    .collection('orders')
    .where('escrowStatus', '==', 'held')
    .where('status', '==', 'credentials_submitted')
    .limit(limit)
    .get();

  const released = [];
  for (const doc of snap.docs) {
    await adminDb.runTransaction(async (tx) => {
      const freshSnap = await tx.get(doc.ref);
      if (!freshSnap.exists) return;
      const freshOrder = freshSnap.data();

      const decision = escrowAutoReleaseDecision(freshOrder, nowMs);
      if (!decision.eligible) return;

      assertValidTransition(freshOrder.status, 'completed');

      tx.update(doc.ref, {
        status: 'completed',
        escrowStatus: 'released',
        payoutStatus: freshOrder.payoutStatus === 'paid' ? 'paid' : 'payout_pending_admin_manual',
        autoReleasedAt: admin.firestore.FieldValue.serverTimestamp(),
        autoReleasedBy: 'system-worker',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (freshOrder.listingId) {
        tx.update(adminDb.collection('listings').doc(freshOrder.listingId), {
          status: 'sold',
          reservedById: admin.firestore.FieldValue.delete(),
          reservedAt: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      if (freshOrder.sellerId) {
        tx.update(adminDb.collection('users').doc(freshOrder.sellerId), {
          totalSales: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      released.push({ orderId: doc.id, reason: 'auto_released' });
    });
  }

  return { scanned: snap.size, released };
}

module.exports = { escrowAutoReleaseDecision, runMaturedReleasePass };
