const { adminAuth, adminDb } = require('../services/firebaseAdmin');

async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function verifySeller(req, res, next) {
  try {
    const userDoc = await adminDb.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || !userDoc.data().sellerApproved) {
      return res.status(403).json({ error: 'Seller access required' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Error verifying seller status' });
  }
}

module.exports = { verifyFirebaseToken, verifySeller };
