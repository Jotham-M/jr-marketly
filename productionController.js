const pool = require('./database');

const createProduct = async (req, res) => {
  const { title, description, price, stock, category, image_url } = req.body;
  const name = typeof title === 'string' ? title.trim() : '';
  const amount = Number(price);
  const inventory = Number(stock);

  if (!name || name.length > 255 || !Number.isFinite(amount) || amount <= 0 ||
      amount > 99999999.99 || !Number.isInteger(inventory) || inventory < 0 || inventory > 2147483647 ||
      typeof description !== 'string' || description.trim().length > 5000) {
    return res.status(400).json({ error: 'Provide a product name, description, positive price, and valid stock quantity.' });
  }

  if (image_url && (typeof image_url !== 'string' || image_url.length > 2048 ||
      !/^https?:\/\/\S+$/i.test(image_url))) {
    return res.status(400).json({ error: 'Product image URL must be a valid URL under 2048 characters.' });
  }

  try {
    const query = `
      INSERT INTO products (vendor_id, title, description, price, stock, category, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, vendor_id, title, description, price, stock, category, image_url, created_at;
    `;
    const values = [req.user.id, name, description.trim(), amount, inventory, category || 'Other', image_url || null];
    const result = await pool.query(query, values);

    res.status(201).json({
      message: 'Product created successfully',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.vendor_id, p.title, p.description, p.price, p.stock,
             p.category, p.image_url, p.created_at, u.name AS vendor_name
      FROM products p
      LEFT JOIN users u ON u.id = p.vendor_id
             WHERE p.stock > 0
      ORDER BY p.created_at DESC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { createProduct, getAllProducts };