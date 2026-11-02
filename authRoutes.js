const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./database');

const router = express.Router();

function createToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    const error = new Error('Authentication is not configured on this server.');
    error.status = 503;
    throw error;
  }

  return jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET, { expiresIn: '7d' });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

router.post('/register', async (req, res) => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    return res.status(503).json({ error: 'Authentication is not configured on this server.' });
  }
  const { name, email, password, role } = req.body;
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!cleanName || cleanName.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
      cleanEmail.length > 150 || typeof password !== 'string' || password.length < 8 ||
      Buffer.byteLength(password, 'utf8') > 72 || !['customer', 'vendor'].includes(role)) {
    return res.status(400).json({
      error: 'Enter a name, valid email, password of at least 8 characters, and customer or vendor account type.'
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [cleanName, cleanEmail, passwordHash, role]
    );
    const user = result.rows[0];
    return res.status(201).json({ user: publicUser(user), token: createToken(user) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' });
    console.error('Account registration failed:', error.message);
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Unable to create your account.' });
  }
});

router.post('/login', async (req, res) => {
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ error: 'Authentication is not configured on this server.' });
  }
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body.password;

  if (!email || typeof password !== 'string') {
    return res.status(400).json({ error: 'Enter your email and password.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    return res.json({ user: publicUser(user), token: createToken(user) });
  } catch (error) {
    console.error('Account login failed:', error.message);
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Unable to sign in.' });
  }
});

module.exports = router;
