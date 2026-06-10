const axios = require('axios');
const { getAccessToken, getTimestamp, generatePassword, BASE_URL } = require('../utils/mpesaHelpers');
const { admin, adminDb } = require('./firebaseAdmin');
const { sendEmail, orderConfirmationEmail, newSaleEmail } = require('../utils/emailService');

async function stkPush({ phone, amount, orderId, accountRef, transactionDesc }) {
  const accessToken = await getAccessToken();
  const timestamp = getTimestamp();
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const password = generatePassword(shortcode, passkey, timestamp);

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.floor(amount),
    PartyA: phone,
    PartyB: shortcode,
    PhoneNumber: phone,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: (accountRef || orderId).slice(0, 12),
    TransactionDesc: (transactionDesc || 'Account Purchase').slice(0, 13),
  };

  const { data } = await axios.post(
    `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
    payload,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (data.ResponseCode !== '0') {
    throw new Error(data.ResponseDescription || 'STK Push failed');
  }

  return {
    checkoutRequestId: data.CheckoutRequestID,
    merchantRequestId: data.MerchantRequestID,
  };
}

async function createNotification({ userId, title, message, type, orderId }) {
  try {
    await adminDb.collection('notifications').add({
      userId,
      title,
      message,
      type,
      orderId: orderId || null,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('Notification error:', err);
  }
}

async function handleCallback(body) {
  try {
    const callback = body?.Body?.stkCallback;
    if (!callback) return;

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback;

    const transactionRef = adminDb.collection('transactions').doc(CheckoutRequestID);
    const transactionSnap = await transactionRef.get();

    if (!transactionSnap.exists) return;

    const transaction = transactionSnap.data();
    const orderId = transaction.orderId;
    const orderRef = adminDb.collection('orders').doc(orderId);

    if (ResultCode === 0) {
      const meta = {};
      if (CallbackMetadata?.Item) {
        CallbackMetadata.Item.forEach(item => {
          meta[item.Name] = item.Value;
        });
      }

      const mpesaReceiptNumber = meta.MpesaReceiptNumber || '';
      const amount = meta.Amount || 0;

      await orderRef.update({
        status: 'payment_confirmed',
        escrowStatus: 'held',
        mpesaTransactionId: CheckoutRequestID,
        mpesaReceiptNumber,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await adminDb.doc('stats/global').update({
        transactionsProcessed: admin.firestore.FieldValue.increment(1),
      });

      await transactionRef.update({
        resultCode: 0,
        resultDesc: ResultDesc,
        mpesaReceiptNumber,
        status: 'success',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const orderSnap = await orderRef.get();
      const orderData = orderSnap.data();

      const messagesRef = orderRef.collection('messages');
      await messagesRef.add({
        type: 'system',
        text: `Payment of KES ${(amount || transaction.amount || 0).toLocaleString()} confirmed. M-Pesa receipt: ${mpesaReceiptNumber}. Chat is now open — please proceed with the account transfer.`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (orderData?.listingId) {
        await adminDb.collection('listings').doc(orderData.listingId).update({
          status: 'sold',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      await createNotification({
        userId: orderData.buyerId,
        title: 'Payment Confirmed',
        message: `Your M-Pesa payment for ${orderData.listingTitle || 'account'} was received. Chat is now open.`,
        type: 'payment',
        orderId,
      });

      await createNotification({
        userId: orderData.sellerId,
        title: 'New Sale!',
        message: `${orderData.buyerDisplayName || 'A buyer'} just purchased your listing ${orderData.listingTitle || 'account'}. Open chat to begin transfer.`,
        type: 'order',
        orderId,
      });

      if (orderData?.buyerEmail) {
        await sendEmail({
          to: orderData.buyerEmail,
          subject: 'Payment Confirmed — eFootball Hub Kenya',
          html: orderConfirmationEmail({
            buyerName: orderData.buyerDisplayName || 'Buyer',
            listingTitle: orderData.listingTitle,
            amount: amount || transaction.amount,
            orderId,
          }),
        });
      }

      if (orderData?.sellerEmail || orderData?.sellerId) {
        let sellerEmail = orderData.sellerEmail;
        if (!sellerEmail) {
          try {
            const sellerDoc = await adminDb.collection('users').doc(orderData.sellerId).get();
            if (sellerDoc.exists) sellerEmail = sellerDoc.data().email;
          } catch {}
        }
        if (sellerEmail) {
          await sendEmail({
            to: sellerEmail,
            subject: 'New Sale! — eFootball Hub Kenya',
            html: newSaleEmail({
              sellerName: orderData.sellerDisplayName || 'Seller',
              listingTitle: orderData.listingTitle,
              amount: amount || transaction.amount,
              orderId,
            }),
          });
        }
      }
    } else {
      await orderRef.update({
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await transactionRef.update({
        status: 'failed',
        resultCode: ResultCode,
        resultDesc: ResultDesc,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch (err) {
    console.error('handleCallback error:', err);
  }
}

module.exports = { stkPush, handleCallback };
