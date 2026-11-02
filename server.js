const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, 'backend.env') });
const pool = require('./database');

const productRoutes = require('./productRoutes');
const authRoutes = require('./authRoutes');
const orderRoutes = require('./orderRoutes');

const app = express();
const allowedOrigins = new Set([
  'http://localhost',
  'https://localhost',
  'capacitor://localhost',
  ...(process.env.CLIENT_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean)
]);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || origin === 'capacitor://localhost') return callback(null, true);
    try {
      const local = new URL(origin);
      if (['localhost', '127.0.0.1'].includes(local.hostname) &&
          ['http:', 'https:'].includes(local.protocol)) {
        return callback(null, true);
      }
    } catch {
      return callback(null, false);
    }
    return callback(null, false);
  }
}));
app.use(express.json());

app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);

app.get('/api/health', async (req, res) => {
  let databaseAvailable = false;
  if (process.env.DATABASE_URL) {
    try {
      await pool.query('SELECT 1');
      databaseAvailable = true;
    } catch (error) {
      console.error('Database health check failed:', error.message);
    }
  }
  const authConfigured = Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32);
  const ready = databaseAvailable && authConfigured;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'degraded',
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    databaseAvailable,
    authConfigured
  });
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Unhandled request error:', err.message);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => pool.end()));