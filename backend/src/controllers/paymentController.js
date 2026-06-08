const { stkPush, handleCallback } = require('../services/mpesaService');
const { admin, adminDb } = require('../services/firebaseAdmin');

function validatePhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) return '254' + cleaned.slice(1);
  if (cleaned.startsWith('254') && cleaned.length === 12) return cleaned;
  if (cleaned.startsWith('7') && cleaned.length === 9) return '254' + cleaned;
  return null;
}

async function initiate(req, res) {
  try {
    const { phone, amount, orderId, listingId, listingTitle } = req.body;
    const buyerId = req.user.uid;

    if (!phone || !amount || !orderId) {
      return res.status(400).json({ success: false, error: 'Phone, amount, and orderId are required' });
    }

    const formattedPhone = validatePhone(phone);
    if (!formattedPhone) {
      return res.status(400).json({ success: false, error: 'Invalid Safaricom phone number. Use format: 0712345678 or 254712345678' });
    }

    const orderAmount = Math.floor(Number(amount));
    if (orderAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be greater than 0' });
    }

    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const result = await stkPush({
      phone: formattedPhone,
      amount: orderAmount,
      orderId,
      accountRef: orderId,
      transactionDesc: listingTitle || 'Account Purchase',
    });

    const { checkoutRequestId } = result;

    await adminDb.collection('transactions').doc(checkoutRequestId).set({
      orderId,
      checkoutRequestId,
      amount: orderAmount,
      phone: formattedPhone,
      buyerId,
      listingId: listingId || null,
      listingTitle: listingTitle || '',
      status: 'pending',
      resultCode: null,
      resultDesc: null,
      mpesaReceiptNumber: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await orderRef.update({
      mpesaTransactionId: checkoutRequestId,
      paymentPhone: formattedPhone,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      checkoutRequestId,
      message: 'STK Push sent. Enter your M-Pesa PIN on your phone.',
    });
  } catch (err) {
    console.error('Initiate payment error:', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Payment initiation failed' });
  }
}

async function callback(req, res) {
  try {
    await handleCallback(req.body);
  } catch (err) {
    console.error('Callback handler error:', err);
  }

  return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}

async function status(req, res) {
  try {
    const { checkoutRequestId } = req.params;

    const transSnap = await adminDb.collection('transactions').doc(checkoutRequestId).get();

    if (!transSnap.exists) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    const data = transSnap.data();
    return res.json({
      success: true,
      status: data.status,
      mpesaReceiptNumber: data.mpesaReceiptNumber || null,
      resultCode: data.resultCode,
      resultDesc: data.resultDesc,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { initiate, callback, status };
