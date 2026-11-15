// Web Push delivery (VAPID).
//
// Rules enforced here:
//   - Never throws: push is a side effect of an order event, so a push failure
//     must never break a payment, delivery or payout flow.
//   - Expired endpoints (410 Gone / 404 Not Found) are deleted from Firestore so
//     the subscription list self-cleans.
//   - Without VAPID keys configured, every send is skipped silently.
//   - Only safe metadata is logged (userId, counts) — never the payload or keys.

const webpush = require('web-push');
const { adminDb } = require('./firebaseAdmin');
const logger = require('../utils/logger');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:ochiengv250@gmail.com';

let configured = false;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    configured = true;
  } catch (err) {
    logger.error(`Web Push disabled — invalid VAPID configuration: ${err.message}`);
  }
} else {
  logger.warn('VAPID keys are not set — Web Push notifications are disabled (order flows keep working).');
}

const isPushConfigured = () => configured;

const subscriptionsRef = (userId) =>
  adminDb.collection('users').doc(userId).collection('pushSubscriptions');

/**
 * Send one notification to every device a user has registered.
 *
 * @param {string} userId Firestore users/{uid}
 * @param {{ title: string, body?: string, url?: string, icon?: string }} notification
 * @returns {Promise<{ sent: number, failed: number, removed: number }>}
 */
async function sendPushToUser(userId, { title, body, url, icon } = {}) {
  const result = { sent: 0, failed: 0, removed: 0 };

  if (!configured) return result;
  if (!userId || !title) return result;

  try {
    const snap = await subscriptionsRef(userId).get();
    if (snap.empty) return result;

    const payload = JSON.stringify({
      title,
      body: body || '',
      url: url || '/',
      icon: icon || '/logo.png',
    });

    await Promise.all(
      snap.docs.map(async (doc) => {
        const subscription = doc.data()?.subscription;
        if (!subscription || !subscription.endpoint) {
          await doc.ref.delete().catch(() => {});
          result.removed += 1;
          return;
        }

        try {
          await webpush.sendNotification(subscription, payload, { TTL: 60 * 60 * 24 });
          result.sent += 1;
        } catch (err) {
          result.failed += 1;
          // 404/410 mean the browser subscription is dead (uninstalled, cleared,
          // permission revoked). 403 means the key no longer matches.
          if ([404, 410].includes(err.statusCode)) {
            await doc.ref.delete().catch(() => {});
            result.removed += 1;
          } else {
            logger.warn(`push send failed for user ${userId}: ${err.statusCode || ''} ${err.message}`);
          }
        }
      })
    );

    if (result.sent > 0) {
      logger.info(`push sent to ${userId}: ${result.sent} delivered`);
    }
    return result;
  } catch (err) {
    logger.warn(`push lookup failed for user ${userId}: ${err.message}`);
    return result;
  }
}

module.exports = { sendPushToUser, isPushConfigured };
