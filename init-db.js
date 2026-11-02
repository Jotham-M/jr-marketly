const pool = require('./database');

async function init() {
  console.log('Creating tables...');
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'buyer',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      image_url TEXT,
      image TEXT,
      category VARCHAR(100),
      stock INTEGER DEFAULT 100,
      user_id INTEGER REFERENCES users(id),
      seller_id INTEGER REFERENCES users(id),
      vendor_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add missing columns if table already exists (for your current DB)
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES users(id);`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_id INTEGER REFERENCES users(id);`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      total DECIMAL(10,2),
      status VARCHAR(50) DEFAULT 'pending',
      shipping_address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      quantity INTEGER NOT NULL,
      price DECIMAL(10,2) NOT NULL
    );
  `);

  console.log('Tables created successfully!');
  
  const { rows } = await pool.query('SELECT COUNT(*) FROM products');
  if (parseInt(rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO products (title, description, price, category, image_url) VALUES
      ('Handmade Ceramic Vase', 'Beautiful handmade vase from local artisan', 45.99, 'Home & living', 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d'),
      ('Organic Cotton Shirt', 'Soft organic cotton t-shirt', 29.99, 'Clothing', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab'),
      ('Natural Soap Set', 'Handcrafted natural soap with essential oils', 19.99, 'Bath & beauty', 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec')
    `);
    console.log('Sample products inserted!');
  }

  await pool.end();
}

init().catch(err => {
  console.error('Init failed:', err);
  process.exit(1);
});
