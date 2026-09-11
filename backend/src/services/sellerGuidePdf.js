// eHub Seller Order Guide — PDF attachment for the seller "buyer paid" email.
// The logo is embedded when available (dev env: backend/assets/eHub-logo.png or
// EHUB_LOGO_PATH). When no local logo file exists (e.g. Render) the guide falls
// back to a clean text wordmark so the PDF still ships.

const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const KONAMI_BLUE = '#003BFF';
const KONAMI_YELLOW = '#FFF100';
const DARK = '#171717';
const MUTED = '#6B7280';

function resolveLogoPath() {
  if (process.env.EHUB_LOGO_PATH && fs.existsSync(process.env.EHUB_LOGO_PATH)) {
    return process.env.EHUB_LOGO_PATH;
  }
  const local = path.join(__dirname, '..', '..', 'assets', 'eHub-logo.png');
  return fs.existsSync(local) ? local : null;
}

function buildPdf() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 48, left: 52, right: 52, bottom: 48 },
      info: { Title: 'eHub Seller Order Guide', Author: 'eHub Kenya' },
    });
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const logo = resolveLogoPath();
    if (logo) {
      try {
        doc.image(logo, { fit: [180, 64], align: 'left' });
      } catch {
        textWordmark(doc);
      }
    } else {
      textWordmark(doc);
    }

    doc.y += 18;
    doc.moveTo(52, doc.y).lineTo(545, doc.y).lineWidth(3).strokeColor(KONAMI_BLUE).stroke();
    doc.y += 16;

    doc.fontSize(20).fillColor(KONAMI_BLUE).font('Helvetica-Bold')
      .text('eHub Seller Order Guide', { align: 'left' });
    doc.fontSize(11).fillColor(MUTED).font('Helvetica')
      .text('Complete every paid order quickly and safely to get paid.', { y: doc.y + 4 });

    doc.y += 18;
    doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold')
      .text('Your 6-step checklist after a buyer pays:');

    const steps = [
      ['Check the order', 'Open the order from your Seller Dashboard as soon as "Payment confirmed" appears. Every step below happens on the order page.'],
      ['Read the buy notes', 'The buyer may include account requirements (e.g. must-have players, GP, coins). Deliver exactly what was promised.'],
      ['Sign in to the account', 'Log into the eFootball account you are selling using your own device first. Make sure the login works before you hand it over.'],
      ['Submit the account details', 'Use the "Submit Account Details" box on the order page. Enter the account email/username and password exactly, in order, before the buyer verifies.'],
      ['Wait for buyer verification (this is important)', 'After you submit the details the buyer will verify the login and confirm delivery. Let the buyer confirm — never press the buyer\u2019s confirm button, and never mark a delivery done that the buyer has not received.'],
      ['Get paid by admin', 'Once the buyer confirms, admin releases the payout. Payouts are processed manually to your registered payout phone. Keep your payout phone number up to date in your seller profile.'],
    ];

    function step(n, title, body) {
      const y = doc.y;
      doc.roundedRect(52, y, 22, 22, 6).fill(KONAMI_BLUE);
      doc.fillColor(KONAMI_YELLOW).font('Helvetica-Bold').fontSize(12)
        .text(String(n), 52, y + 5, { width: 22, align: 'center' });
      doc.y = y;
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(12)
        .text(title, 86, y + 2, { width: 445 });
      doc.font('Helvetica').fontSize(10.5).fillColor(MUTED)
        .text(body, 86, doc.y + 3, { width: 445 });
      doc.y += 12;
    }

    steps.forEach(([t, b], i) => step(i + 1, t, b));

    doc.y += 10;
    doc.moveTo(52, doc.y).lineTo(545, doc.y).lineWidth(1).strokeColor('#E5E7EB').stroke();
    doc.y += 14;

    doc.fontSize(11).fillColor(KONAMI_BLUE).font('Helvetica-Bold').text('Security rules you must follow');
    doc.fontSize(10.5).fillColor(DARK).font('Helvetica').text(
      '• Never email, call, or message buyers outside the order with your personal details or the account password.\n' +
      '• Account login details belong in the private order page only — never in the public order chat, reviews, or anywhere else.\n' +
      '• Never share your eHub password, Paystack details, or payout phone with anyone, including buyers and eHub staff.\n' +
      '• Keep your payout phone number current so admin can pay you without delays.'
    );

    doc.y += 14;
    doc.fontSize(12).fillColor(KONAMI_BLUE).font('Helvetica-Bold').text('Need help?');
    doc.fontSize(10.5).fillColor(MUTED).font('Helvetica').text(
      'Open the order and ask in the private order chat. Admin is on the order and will help resolve any questions or disputes.'
    );

    doc.end();
  });
}

function textWordmark(doc) {
  doc.font('Helvetica-Bold').fontSize(22).fillColor(KONAMI_BLUE).text('eFootball Hub', { lineGap: 0 });
  doc.font('Helvetica').fontSize(13).fillColor(DARK).text('K E N Y A');
}

let cachedBuffer = null;
async function getSellerOrderGuidePdf() {
  if (cachedBuffer) return cachedBuffer;
  try {
    cachedBuffer = await buildPdf();
  } catch (err) {
    console.error('Seller guide PDF error:', err);
    cachedBuffer = null;
  }
  return cachedBuffer;
}

module.exports = { getSellerOrderGuidePdf };