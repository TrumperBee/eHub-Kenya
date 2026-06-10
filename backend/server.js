const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const paymentRoutes = require('./src/routes/payment.routes');
const escrowRoutes = require('./src/routes/escrow.routes');
const aiRoutes = require('./src/routes/ai.routes');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'eFootball Hub Kenya Backend' });
});

app.use('/api/payment', paymentRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/ai', aiRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`eFootball Hub Kenya Backend running on port ${PORT}`);
});
