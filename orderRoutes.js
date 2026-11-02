const express = require('express');
const pool = require('./database');
const { verifyToken, requireRole } = require('./auth');

const router = express.Router();
router.use(verifyToken);

router.post('/', requireRole('customer', 'admin'), async (req, res) => {
  const { items, shipping } = req.body;
  if (!shipping || typeof shipping !== 'object' ||
      !['name', 'address', 'city', 'postal_code'].every((field) =>
        typeof shipping[field] === 'string' && shipping[field].trim().length > 0) ||
      shipping.name.trim().length > 100 || shipping.address.trim().length > 255 ||
      shipping.city.trim().length > 100 || shipping.postal_code.trim().length > 30 ||
      (shipping.phone && (typeof shipping.phone !== 'string' || shipping.phone.length > 30))) {
    return res.status(400).json({ error: 'Please enter a valid name, street address, city, and postal code.' });
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return res.status(400).json({ error: 'Your order must contain between 1 and 50 products.' });
  }

  const quantities = new Map();
  for (const item of items) {
    const id = Number(item && item.product_id);
    const quantity = Number(item && item.quantity);
    if (!Number.isInteger(id) || id < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({ error: 'Each order item must have a valid product and quantity.' });
    }
    quantities.set(id, (quantities.get(id) || 0) + quantity);
  }
  if ([...quantities.values()].some((quantity) => quantity > 99)) {
    return res.status(400).json({ error: 'Maximum quantity per product is 99.' });
  }

  const client = await pool.connect().catch((error) => {
    console.error('Order database connection failed:', error.message);
    return null;
  });
  if (!client) return res.status(503).json({ error: 'The order service is temporarily unavailable.' });

  try {
    await client.query('BEGIN');
    const productIds = [...quantities.keys()];
    const products = await client.query(
      'SELECT id, title, price, stock FROM products WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE',
      [productIds]
    );
    if (products.rows.length !== productIds.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'One or more products are no longer available.' });
    }

    let total = 0;
    for (const product of products.rows) {
      const quantity = quantities.get(product.id);
      if (product.stock < quantity) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `${product.title} has only ${product.stock} left in stock.` });
      }
      total += Number(product.price) * quantity;
    }
    if (total > 99999999.99) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'The order total exceeds the supported limit.' });
    }

    const order = await client.query(
      `INSERT INTO orders (
        customer_id, total_amount, status, shipping_name, shipping_address,
        shipping_city, shipping_postal_code, shipping_phone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, total_amount, status, payment_method, created_at`,
      [req.user.id, total.toFixed(2), 'Pending', shipping.name.trim(), shipping.address.trim(),
        shipping.city.trim(), shipping.postal_code.trim(), shipping.phone ? shipping.phone.trim() : null]
    );
    for (const product of products.rows) {
      const quantity = quantities.get(product.id);
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES ($1, $2, $3, $4)',
        [order.rows[0].id, product.id, quantity, product.price]
      );
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, product.id]);
    }

    await client.query('COMMIT');
    return res.status(201).json({ order: order.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Order creation failed:', error.message);
    return res.status(500).json({ error: 'Unable to place your order.' });
  } finally {
    client.release();
  }
});

router.get('/mine', requireRole('customer', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id, o.total_amount, o.status, o.payment_method, o.created_at,
             COALESCE(json_agg(json_build_object(
               'product_id', oi.product_id, 'title', p.title,
               'quantity', oi.quantity, 'price', oi.price_at_purchase
             )) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE o.customer_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [req.user.id]);
    return res.json(result.rows);
  } catch (error) {
    console.error('Order history lookup failed:', error.message);
    return res.status(500).json({ error: 'Unable to load your orders.' });
  }
});

router.get('/sales', requireRole('vendor', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id AS order_id, o.status, o.created_at, u.name AS customer_name,
             o.shipping_name, o.shipping_address, o.shipping_city, o.shipping_postal_code,
             o.shipping_phone, p.title, oi.quantity, oi.price_at_purchase AS price
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN users u ON u.id = o.customer_id
      WHERE p.vendor_id = $1
      ORDER BY o.created_at DESC
    `, [req.user.id]);
    return res.json(result.rows);
  } catch (error) {
    console.error('Vendor sales lookup failed:', error.message);
    return res.status(500).json({ error: 'Unable to load vendor sales.' });
  }
});

module.exports = router;
