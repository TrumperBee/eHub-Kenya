const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function baseTemplate(content) {
  return `
    <div style="max-width:600px;margin:0 auto;padding:20px;background:#0D0D0D;border-radius:12px;font-family:Inter,sans-serif;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-family:Rajdhani,sans-serif;font-size:24px;font-weight:700;color:#FFFFFF;">eFootball Hub</span>
        <span style="font-family:Rajdhani,sans-serif;font-size:24px;font-weight:700;color:#BF0021;">Kenya</span>
      </div>
      <div style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:12px;padding:24px;">
        ${content}
      </div>
      <div style="text-align:center;margin-top:24px;font-size:12px;color:#5C5C5C;">
        <p>eFootball Hub Kenya — Buy & Sell with M-Pesa</p>
      </div>
    </div>
  `;
}

function orderConfirmationEmail({ buyerName, listingTitle, amount, orderId }) {
  return baseTemplate(`
    <h2 style="color:#FFFFFF;font-family:Rajdhani,sans-serif;margin:0 0 16px;">Payment Confirmed ✅</h2>
    <p style="color:#9E9E9E;font-size:14px;line-height:1.6;">Hi <strong style="color:#FFFFFF;">${buyerName}</strong>,</p>
    <p style="color:#9E9E9E;font-size:14px;line-height:1.6;">Your payment of <strong style="color:#D4AF37;">KES ${amount?.toLocaleString() || '—'}</strong> for <strong style="color:#FFFFFF;">${listingTitle || 'account purchase'}</strong> has been confirmed.</p>
    <p style="color:#9E9E9E;font-size:14px;line-height:1.6;">Order ID: <span style="color:#FFFFFF;font-family:monospace;">${orderId || '—'}</span></p>
    <p style="color:#9E9E9E;font-size:14px;line-height:1.6;">The chat with your seller is now open. Please coordinate the account transfer.</p>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${orderId}" style="display:inline-block;background:#BF0021;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;margin-top:8px;">View Order Chat</a>
  `);
}

function newSaleEmail({ sellerName, listingTitle, amount, orderId }) {
  return baseTemplate(`
    <h2 style="color:#FFFFFF;font-family:Rajdhani,sans-serif;margin:0 0 16px;">New Sale! 🎉</h2>
    <p style="color:#9E9E9E;font-size:14px;line-height:1.6;">Hi <strong style="color:#FFFFFF;">${sellerName}</strong>,</p>
    <p style="color:#9E9E9E;font-size:14px;line-height:1.6;">Your listing <strong style="color:#FFFFFF;">${listingTitle || '—'}</strong> has been purchased for <strong style="color:#D4AF37;">KES ${amount?.toLocaleString() || '—'}</strong>.</p>
    <p style="color:#9E9E9E;font-size:14px;line-height:1.6;">Open the chat to begin the account transfer with the buyer.</p>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${orderId}" style="display:inline-block;background:#BF0021;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;margin-top:8px;">Open Chat</a>
  `);
}

function sellerApprovedEmail({ sellerName }) {
  return baseTemplate(`
    <h2 style="color:#FFFFFF;font-family:Rajdhani,sans-serif;margin:0 0 16px;">Seller Application Approved! 🎉</h2>
    <p style="color:#9E9E9E;font-size:14px;line-height:1.6;">Hi <strong style="color:#FFFFFF;">${sellerName}</strong>,</p>
    <p style="color:#9E9E9E;font-size:14px;line-height:1.6;">Congratulations! Your seller account has been approved. You can now start listing your eFootball accounts for sale.</p>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/transfer-room" style="display:inline-block;background:#BF0021;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;margin-top:8px;">Go to Transfer Room</a>
  `);
}

async function sendEmail({ to, subject, html }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Email credentials not configured. Skipping email to:', to);
    return;
  }
  try {
    await transporter.sendMail({ from: `"eFootball Hub Kenya" <${process.env.EMAIL_USER}>`, to, subject, html });
    console.log('Email sent to:', to);
  } catch (err) {
    console.error('Email send error:', err.message);
  }
}

module.exports = { sendEmail, orderConfirmationEmail, newSaleEmail, sellerApprovedEmail };
