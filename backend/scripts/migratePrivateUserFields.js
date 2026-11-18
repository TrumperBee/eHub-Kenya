#!/usr/bin/env node
/**
 * One-off migration: move private contact fields off the public user document.
 *
 * Before the 2026-11-18 security audit, users/{uid} held `email`, `phoneNumber`
 * and `sellerWhatsapp`. Firestore rules cannot restrict fields on a read, so any
 * visitor who could read a user document could harvest contact details.
 * Those fields now live in users/{uid}/private/contact (owner + admin only).
 *
 * This script:
 *   1. strips contact fields from public listing documents (defence in depth)
 *   2. copies email/phoneNumber/sellerWhatsapp into users/{uid}/private/contact
 *   3. deletes those fields from the public user document
 *   4. backfills sellerPhone/sellerWhatsapp on existing orders from the new
 *      contact documents, so buyers/sellers can still reach each other
 *
 * SAFE BY DEFAULT — it prints what it would do and writes nothing.
 *
 * Usage:
 *   node scripts/migratePrivateUserFields.js            # dry run
 *   node scripts/migratePrivateUserFields.js --apply    # perform writes
 *   node scripts/migratePrivateUserFields.js --apply --skip-orders
 *
 * Requires the same FIREBASE_* environment variables as the server.
 */

require('dotenv').config();

const { admin, adminDb } = require('../src/services/firebaseAdmin');

const APPLY = process.argv.includes('--apply');
const SKIP_ORDERS = process.argv.includes('--skip-orders');
const BATCH_SIZE = 400;

const PRIVATE_FIELDS = ['email', 'phoneNumber', 'sellerWhatsapp'];

function log(action, detail) {
  console.log(`[${APPLY ? 'apply' : 'dry-run'}] ${action}: ${detail}`);
}

async function commitInBatches(operations) {
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const batch = adminDb.batch();
    operations.slice(i, i + BATCH_SIZE).forEach((op) => op(batch));
    if (APPLY) await batch.commit();
  }
}

async function migrateUsers() {
  const snap = await adminDb.collection('users').get();
  const contactByUid = new Map();
  const operations = [];
  let migrated = 0;
  let alreadyClean = 0;

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    // Skip non-profile docs such as `users/emails` (admin allowlist).
    if (!data.uid && doc.id === 'emails') continue;

    const contact = {};
    if (typeof data.email === 'string' && data.email.trim()) contact.email = data.email.trim();
    if (typeof data.phoneNumber === 'string' && data.phoneNumber.trim()) {
      contact.phoneNumber = data.phoneNumber.trim();
    }
    if (typeof data.sellerWhatsapp === 'string' && data.sellerWhatsapp.trim()) {
      contact.whatsappNumber = data.sellerWhatsapp.trim();
    }

    contactByUid.set(doc.id, contact);

    const hasPrivateOnPublic = PRIVATE_FIELDS.some((field) => field in data);
    if (!hasPrivateOnPublic) {
      alreadyClean += 1;
      continue;
    }

    if (Object.keys(contact).length > 0) {
      log('contact copy', `${doc.id} -> ${Object.keys(contact).join(', ')}`);
      operations.push((batch) => {
        const ref = adminDb.doc(`users/${doc.id}/private/contact`);
        batch.set(ref, { ...contact, migratedAt: new Date() }, { merge: true });
      });
    }

    const deletes = {};
    PRIVATE_FIELDS.forEach((field) => {
      if (field in data) deletes[field] = admin.firestore.FieldValue.delete();
    });
    log('public cleanup', `${doc.id} -> remove ${Object.keys(deletes).join(', ')}`);
    operations.push((batch) => batch.update(adminDb.doc(`users/${doc.id}`), deletes));

    migrated += 1;
  }

  await commitInBatches(operations);

  console.log(
    `[users] ${snap.size} scanned, ${migrated} with private fields, ${alreadyClean} already clean`
  );
  return contactByUid;
}

async function backfillOrders(contactByUid) {  const snap = await adminDb.collection('orders').get();
  const operations = [];
  let updated = 0;

  for (const doc of snap.docs) {
    const order = doc.data() || {};
    if (!order.sellerId) continue;
    if (order.sellerPhone && order.sellerWhatsapp) continue;

    let contact = contactByUid.get(order.sellerId);
    if (!contact) {
      const snapContact = await adminDb.doc(`users/${order.sellerId}/private/contact`).get();
      contact = snapContact.exists ? snapContact.data() : {};
    }

    const sellerPhone = order.sellerPhone || contact.phoneNumber || '';
    const sellerWhatsapp =
      order.sellerWhatsapp || contact.whatsappNumber || contact.sellerWhatsapp || '';

    if (!sellerPhone && !sellerWhatsapp) continue;

    log('order backfill', `${doc.id} (seller ${order.sellerId})`);
    operations.push((batch) =>
      batch.update(adminDb.doc(`orders/${doc.id}`), {
        sellerPhone,
        sellerWhatsapp,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    );
    updated += 1;
  }

  await commitInBatches(operations);
  console.log(`[orders] ${snap.size} scanned, ${updated} backfilled`);
}

async function cleanListings() {
  const snap = await adminDb.collection('listings').get();
  const operations = [];
  let updated = 0;

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const deletes = {};
    // SECURITY: public listings must never carry the seller's contact details.
    ['sellerWhatsapp', 'sellerPhone', 'sellerEmail', 'phoneNumber'].forEach((field) => {
      if (field in data) deletes[field] = admin.firestore.FieldValue.delete();
    });

    if (Object.keys(deletes).length === 0) continue;

    log('listing cleanup', `${doc.id} -> remove ${Object.keys(deletes).join(', ')}`);
    operations.push((batch) => batch.update(adminDb.doc(`listings/${doc.id}`), deletes));
    updated += 1;
  }

  await commitInBatches(operations);
  console.log(`[listings] ${snap.size} scanned, ${updated} cleaned`);
}

async function main() {
  console.log('Private user-field migration');
  console.log(APPLY ? 'Mode: APPLY (writes will happen)' : 'Mode: DRY RUN (no writes)');
  if (SKIP_ORDERS) console.log('Orders: skipped');

  await cleanListings();
  const contactByUid = await migrateUsers();

  if (!SKIP_ORDERS) {
    await backfillOrders(contactByUid);
  }

  if (!APPLY) {
    console.log('\nRe-run with --apply to perform these writes.');
  }
  console.log('Done.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
