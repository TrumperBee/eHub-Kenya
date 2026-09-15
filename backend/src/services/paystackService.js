const axios = require('axios');
const { FRONTEND_URL } = require('../config');

const PAYSTACK_BASE = 'https://api.paystack.co';
const SECRET = process.env.PAYSTACK_SECRET_KEY;

const paystackHeaders = {
  Authorization: `Bearer ${SECRET}`,
  'Content-Type': 'application/json',
};

const initializeTransaction = async ({ email, amount, reference, metadata, callbackUrl }) => {
  const res = await axios.post(
    `${PAYSTACK_BASE}/transaction/initialize`,
    {
      email,
      amount: Math.round(amount * 100), // Paystack uses kobo/cents — KES * 100
      reference,
      currency: 'KES',
      callback_url: callbackUrl || process.env.PAYSTACK_CALLBACK_URL,
      metadata: {
        cancel_action: `${FRONTEND_URL}/payment-cancelled`,
        ...metadata,
      },
    },
    { headers: paystackHeaders }
  );
  return res.data.data; // { authorization_url, access_code, reference }
};

const verifyTransaction = async (reference) => {
  const res = await axios.get(
    `${PAYSTACK_BASE}/transaction/verify/${reference}`,
    { headers: paystackHeaders }
  );
  return res.data.data; // { status, amount, customer, metadata }
};

const generateReference = (orderId) => {
  return `EHUB-${orderId.slice(0, 8)}-${Date.now()}`;
};

module.exports = { initializeTransaction, verifyTransaction, generateReference };
