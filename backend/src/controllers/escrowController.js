const { admin, adminDb } = require('../services/firebaseAdmin');

async function release(req, res) {
  try {
    const { orderId } = req.body;
    const userId = req.user.uid;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }

    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = orderSnap.data();

    if (order.buyerId !== userId) {
      return res.status(403).json({ success: false, error: 'Only the buyer can release escrow' });
    }

    if (order.status !== 'payment_confirmed' && order.status !== 'in_transfer') {
      return res.status(400).json({ success: false, error: 'Order is not in a releasable state' });
    }

    await orderRef.update({
      status: 'completed',
      escrowStatus: 'released',
      buyerConfirmedReceipt: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (order.listingId) {
      await adminDb.collection('listings').doc(order.listingId).update({
        status: 'sold',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    if (order.sellerId) {
      await adminDb.collection('users').doc(order.sellerId).update({
        totalSales: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await adminDb.doc('stats/global').update({
      totalSalesCompleted: admin.firestore.FieldValue.increment(1),
    });

    const messagesRef = orderRef.collection('messages');
    await messagesRef.add({
      type: 'system',
      text: 'Buyer has confirmed receipt. Transaction complete. Escrow released.',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('Escrow release error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function dispute(req, res) {
  try {
    const { orderId, reason } = req.body;
    const userId = req.user.uid;

    if (!orderId || !reason) {
      return res.status(400).json({ success: false, error: 'orderId and reason are required' });
    }

    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = orderSnap.data();

    if (order.buyerId !== userId) {
      return res.status(403).json({ success: false, error: 'Only the buyer can raise a dispute' });
    }

    await orderRef.update({
      status: 'disputed',
      disputeReason: reason,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const messagesRef = orderRef.collection('messages');
    await messagesRef.add({
      type: 'system',
      text: `Buyer has raised a dispute: ${reason}. Admin has been notified. Escrow is frozen.`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('Escrow dispute error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { release, dispute };
