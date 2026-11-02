const STORAGE = {
  accounts: 'marketly.accounts',
  cart: 'marketly.cart',
  user: 'marketly.user',
  token: 'marketly.token',
  products: 'marketly.products',
  stock: 'marketly.stock',
  orders: 'marketly.orders',
  newsletter: 'marketly.newsletter'
};

const starterProducts = [
  { id: 'm101', title: 'Sunday Morning Ceramic Mug', vendor_name: 'Slow Sunday Studio', category: 'Home', price: 32, stock: 18, image_url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=720&q=82', badge: 'A little favorite', description: 'Hand-thrown stoneware with a soft, speckled glaze. Made slowly, for all your slow mornings.' },
  { id: 'm102', title: 'The Everyday Linen Shirt', vendor_name: 'Good Form Goods', category: 'Fashion', price: 68, stock: 12, image_url: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=720&q=82', badge: 'Maker pick', description: 'Breezy, beautifully relaxed linen made for living in. Thoughtfully cut and naturally dyed.' },
  { id: 'm103', title: 'Wildflower Face & Body Oil', vendor_name: 'Soft Earth Apothecary', category: 'Beauty', price: 28, stock: 24, image_url: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=720&q=82', badge: 'Small batch', description: 'A nourishing botanical blend made in small batches with wildflower oils and plant extracts.' },
  { id: 'm104', title: 'The Little Sun Pendant', vendor_name: 'Almost Golden', category: 'Accessories', price: 54, stock: 9, image_url: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=720&q=82', badge: 'Made by hand', description: 'A tiny sun for everyday. Hand-finished recycled brass on a delicate chain.' },
  { id: 'm105', title: 'Still Life No. 04 — Art Print', vendor_name: 'Olive & Ink Studio', category: 'Art', price: 38, stock: 16, image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=720&q=82', badge: 'Easy to love', description: 'An archival-quality giclée print of an original botanical still life, printed with care.' },
  { id: 'm106', title: 'Sunday Ceramic Bud Vase', vendor_name: 'Slow Sunday Studio', category: 'Home', price: 42, stock: 7, image_url: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=720&q=82', badge: 'One of a kind', description: 'Sculptural, hand-built stoneware. A lovely little home for whatever is blooming.' },
  { id: 'm107', title: 'Citrus Grove Candle', vendor_name: 'Kindred Candle Co.', category: 'Home', price: 34, stock: 20, image_url: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=720&q=82', badge: 'Small batch', description: 'Bright bergamot and sweet orange in a clean-burning, hand-poured soy wax candle.' },
  { id: 'm108', title: 'Honey & Oat Sunday Soap', vendor_name: 'Soft Earth Apothecary', category: 'Beauty', price: 16, stock: 30, image_url: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=720&q=82', badge: 'A little favorite', description: 'A gentle, creamy bar made with local honey, oat milk, and nourishing plant oils.' }
];

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const getSaved = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const state = {
  products: [...starterProducts],
  cart: getSaved(STORAGE.cart, []),
  user: getSaved(STORAGE.user, null),
  token: localStorage.getItem(STORAGE.token),
  category: 'All',
  search: '',
  sort: 'featured',
  apiReady: false
};
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const elements = {
  grid: $('#product-grid'), empty: $('#empty-state'), cartCount: $('#cart-count'),
  cartItems: $('#cart-items'), cartEmpty: $('#cart-empty'), cartFooter: $('#cart-footer'),
  subtotal: $('#cart-subtotal'), drawerCount: $('#drawer-count'), drawer: $('#cart-drawer'),
  overlay: $('#overlay'), accountModal: $('#account-modal'), accountContent: $('#account-content'),
  formModal: $('#form-modal'), formContent: $('#form-content'), toast: $('#toast')
};
const API_BASE_URL = typeof window.JR_MARKETLY_CONFIG?.apiBaseUrl === 'string'
  ? window.JR_MARKETLY_CONFIG.apiBaseUrl.trim().replace(/\/+$/, '')
  : '';

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => elements.toast.classList.remove('show'), 2800);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

function allProducts() {
  const localProducts = getSaved(STORAGE.products, []);
  const stock = getSaved(STORAGE.stock, {});
  return [...localProducts, ...state.products].map((product) =>
    Object.prototype.hasOwnProperty.call(stock, String(product.id))
      ? { ...product, stock: stock[String(product.id)] }
      : product
  );
}

function getProduct(productId) {
  return allProducts().find((product) => String(product.id) === String(productId));
}

function renderProducts() {
  let products = allProducts().filter((product) => {
    const categoryMatches = state.category === 'All' || product.category === state.category;
    const searchTarget = `${product.title} ${product.vendor_name || ''} ${product.category || ''}`.toLowerCase();
    return categoryMatches && searchTarget.includes(state.search.toLowerCase());
  });
  if (state.sort === 'price-low') products.sort((a, b) => Number(a.price) - Number(b.price));
  if (state.sort === 'price-high') products.sort((a, b) => Number(b.price) - Number(a.price));

  elements.grid.innerHTML = products.map((product, index) => `
    <article class="product-card">
      <div class="product-image-wrap">
        <img class="product-image" src="${escapeHtml(product.image_url || '')}" alt="${escapeHtml(product.title)}" loading="${index > 3 ? 'lazy' : 'eager'}" onerror="this.style.opacity='.45'">
        <span class="product-badge">${escapeHtml(product.badge || product.category || 'Made with care')}</span>
        <button class="add-button" data-add="${escapeHtml(product.id)}" aria-label="Add ${escapeHtml(product.title)} to bag">+</button>
      </div>
      <div class="product-info">
        <p class="product-maker">${escapeHtml(product.vendor_name || 'Independent maker')}</p>
        <div class="product-title-row"><h3 class="product-title">${escapeHtml(product.title)}</h3><span class="product-price">${money.format(Number(product.price) || 0)}</span></div>
        <div class="product-rating">✳ <span>Made by an independent shop</span></div>
      </div>
    </article>
  `).join('');
  elements.empty.hidden = products.length > 0;
  elements.grid.hidden = products.length === 0;
}

function renderCart() {
  const count = state.cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = state.cart.reduce((total, item) => {
    const product = getProduct(item.product_id);
    return total + (product ? Number(product.price) * item.quantity : 0);
  }, 0);
  elements.cartCount.textContent = count;
  elements.drawerCount.textContent = count ? `(${count})` : '';
  elements.subtotal.textContent = money.format(subtotal);
  elements.cartEmpty.classList.toggle('visible', count === 0);
  elements.cartFooter.hidden = count === 0;
  elements.cartItems.innerHTML = state.cart.map((item) => {
    const product = getProduct(item.product_id);
    if (!product) return '';
    return `<article class="cart-item">
      <img src="${escapeHtml(product.image_url || '')}" alt="${escapeHtml(product.title)}" onerror="this.style.opacity='.45'">
      <div><h3>${escapeHtml(product.title)}</h3><p>${escapeHtml(product.vendor_name || 'Independent maker')}</p>
        <div class="quantity-control"><button data-quantity="-1" data-id="${escapeHtml(product.id)}" aria-label="Remove one">−</button><span>${item.quantity}</span><button data-quantity="1" data-id="${escapeHtml(product.id)}" aria-label="Add one">+</button></div>
      </div>
      <div><span class="cart-item-price">${money.format(Number(product.price) * item.quantity)}</span><button class="remove-item" data-remove="${escapeHtml(product.id)}">Remove</button></div>
    </article>`;
  }).join('');
  save(STORAGE.cart, state.cart);
}

function setCategory(category) {
  state.category = category;
  $$('.category-link, .filter-chip').forEach((button) => {
    button.classList.toggle('active', button.classList.contains('category-link') && button.dataset.category === category);
    button.classList.toggle('selected', button.classList.contains('filter-chip') && button.dataset.category === category);
  });
  renderProducts();
  $('#shop').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function addToCart(productId) {
  const product = getProduct(productId);
  if (!product || Number(product.stock) < 1) return showToast('This little find is currently sold out.');
  const existing = state.cart.find((item) => String(item.product_id) === String(productId));
  if (existing) {
    if (existing.quantity >= Number(product.stock)) return showToast('That’s all the stock we have right now.');
    existing.quantity += 1;
  } else {
    state.cart.push({ product_id: product.id, quantity: 1 });
  }
  renderCart();
  showToast('A good thing added to your bag.');
}

function setDialogContent(dialog, container, content) {
  container.innerHTML = content;
  if (!dialog.open) dialog.showModal();
}

function showAccountForm(mode = 'login', role = 'customer') {
  const isRegister = mode === 'register';
  const content = `
    <span class="eyebrow">${isRegister ? 'COME ON IN' : 'GOOD TO SEE YOU'}</span>
    <h2 id="account-title">${isRegister ? 'Let’s get to know you.' : 'Welcome back.'}</h2>
    <p>${isRegister ? 'A thoughtful marketplace is better with you in it.' : 'Your favorite finds are right where you left them.'}</p>
    <form id="account-form" data-mode="${mode}">
      ${isRegister ? `<div class="form-field"><label for="account-name">Your name</label><input id="account-name" name="name" autocomplete="name" required maxlength="100"></div>` : ''}
      <div class="form-field"><label for="account-email">Email address</label><input id="account-email" name="email" type="email" autocomplete="email" required maxlength="150"></div>
      <div class="form-field"><label for="account-password">Password ${isRegister ? '(at least 8 characters)' : ''}</label><input id="account-password" name="password" type="password" autocomplete="${isRegister ? 'new-password' : 'current-password'}" minlength="${isRegister ? 8 : 1}" required></div>
      ${isRegister ? `<div class="form-field"><label for="account-role">I’m here to</label><select id="account-role" name="role"><option value="customer" ${role === 'customer' ? 'selected' : ''}>Find lovely things</option><option value="vendor" ${role === 'vendor' ? 'selected' : ''}>Sell my own creations</option></select></div>` : ''}
      <div class="inline-error" id="account-error" role="alert"></div>
      <button class="button button-dark" type="submit">${isRegister ? 'Create my account' : 'Sign in'} <span aria-hidden="true">→</span></button>
    </form>
    <p class="modal-switch">${isRegister ? 'Already part of the market? ' : 'New around here? '}<button class="link-button" data-account-mode="${isRegister ? 'login' : 'register'}">${isRegister ? 'Sign in' : 'Create an account'}</button></p>`;
  setDialogContent(elements.accountModal, elements.accountContent, content);
}

async function digestPassword(password, salt) {
  if (!window.crypto || !window.crypto.subtle) throw new Error('Secure browser storage is not available. Please use the connected account service.');
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const digest = await crypto.subtle.deriveBits({
    name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 120000, hash: 'SHA-256'
  }, key, 256);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function handleAccountSubmit(form) {
  const formData = new FormData(form);
  const mode = form.dataset.mode;
  const errorElement = $('#account-error', form);
  const values = Object.fromEntries(formData.entries());
  const button = $('button[type="submit"]', form);
  button.disabled = true;
  button.textContent = 'One moment…';
  errorElement.classList.remove('visible');

  try {
    let result;
    if (state.apiReady) {
      result = await request(`/api/auth/${mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST', body: JSON.stringify(values)
      });
    } else {
      const email = values.email.trim().toLowerCase();
      const accounts = getSaved(STORAGE.accounts, []);
      if (mode === 'register') {
        if (accounts.some((account) => account.email === email)) throw new Error('An account with this email already exists.');
        const salt = crypto.randomUUID();
        const passwordHash = await digestPassword(values.password, salt);
        result = { user: { id: `demo-${Date.now()}`, name: values.name.trim(), email, role: values.role } };
        accounts.push({ ...result.user, salt, passwordHash });
        save(STORAGE.accounts, accounts);
      } else {
        const account = accounts.find((item) => item.email === email);
        if (!account || await digestPassword(values.password, account.salt) !== account.passwordHash) {
          throw new Error('Email or password is incorrect.');
        }
        result = { user: { id: account.id, name: account.name, email: account.email, role: account.role } };
      }
    }

    state.user = result.user;
    state.token = result.token || null;
    save(STORAGE.user, state.user);
    if (state.token) localStorage.setItem(STORAGE.token, state.token);
    else localStorage.removeItem(STORAGE.token);
    elements.accountModal.close();
    renderHeaderAccount();
    showToast(`You’re all set, ${state.user.name.split(' ')[0]}.`);
    if (state.user.role === 'vendor') showVendorDashboard();
  } catch (error) {
    errorElement.textContent = error.message;
    errorElement.classList.add('visible');
  } finally {
    button.disabled = false;
    button.textContent = mode === 'register' ? 'Create my account →' : 'Sign in →';
  }
}

function renderHeaderAccount() {
  const button = $('#account-button');
  const label = $('.account-label', button);
  label.textContent = state.user ? state.user.name.split(' ')[0] : 'Sign in';
  button.setAttribute('aria-label', state.user ? `${state.user.name}, your account` : 'Sign in to your account');
}

function openCart() {
  renderCart();
  elements.overlay.hidden = false;
  requestAnimationFrame(() => elements.drawer.classList.add('open'));
  elements.drawer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  elements.drawer.classList.remove('open');
  elements.drawer.setAttribute('aria-hidden', 'true');
  elements.overlay.hidden = true;
  document.body.style.overflow = '';
}

function closeDialogs() {
  [elements.accountModal, elements.formModal].forEach((dialog) => {
    if (dialog.open) dialog.close();
  });
}

function showVendorDashboard() {
  const vendor = state.user;
  if (!vendor || vendor.role !== 'vendor') return showAccountForm('register', 'vendor');
  const ownProducts = allProducts().filter((product) => String(product.vendor_id) === String(vendor.id));
  const productList = ownProducts.length
    ? ownProducts.map((product) => `<li>${escapeHtml(product.title)} <span>${Number(product.stock)} in stock · ${money.format(Number(product.price))}</span></li>`).join('')
    : '<li>No listings yet. Your first creation belongs here.</li>';
  const content = `<span class="eyebrow">YOUR LITTLE CORNER OF THE INTERNET</span><h2 id="form-title">The maker’s table.</h2><p>Welcome in, ${escapeHtml(vendor.name)}. Here’s where your shop starts.</p>
    <h3 class="product-title">Your listings</h3><ul class="dashboard-list">${productList}</ul>
    <button class="button button-dark" id="new-product-button">List something lovely <span aria-hidden="true">→</span></button>
    ${state.apiReady ? '<h3 class="product-title" style="margin-top:24px">Recent sales</h3><ul class="dashboard-list" id="vendor-sales"><li>Loading your sales…</li></ul>' : ''}`;
  setDialogContent(elements.formModal, elements.formContent, content);
  if (state.apiReady) loadVendorSales();
}

async function loadVendorSales() {
  const list = $('#vendor-sales');
  if (!list) return;
  try {
    const sales = await request('/api/orders/sales');
    list.innerHTML = sales.length
      ? sales.slice(0, 8).map((sale) => `<li>${escapeHtml(sale.title)} × ${sale.quantity}<span>${money.format(Number(sale.price) * sale.quantity)} · ${escapeHtml(sale.customer_name || 'Customer')}<br>${escapeHtml(sale.shipping_address)}, ${escapeHtml(sale.shipping_city)} ${escapeHtml(sale.shipping_postal_code)}</span></li>`).join('')
      : '<li>Your first sale is just around the corner.</li>';
  } catch (error) {
    list.innerHTML = `<li>${escapeHtml(error.message)}</li>`;
  }
}

function showProductForm() {
  const content = `<span class="eyebrow">MADE BY YOU, FOUND HERE</span><h2 id="form-title">Add a good thing.</h2><p>Every great shop starts with one lovely listing.</p>
    <form id="product-form">
      <div class="form-field"><label for="product-title">What are you making?</label><input id="product-title" name="title" maxlength="255" required></div>
      <div class="form-field"><label for="product-description">Tell us a little about it</label><textarea id="product-description" name="description" maxlength="5000" required></textarea></div>
      <div class="form-row"><div class="form-field"><label for="product-price">Price (USD)</label><input id="product-price" name="price" type="number" min="0.01" step="0.01" required></div><div class="form-field"><label for="product-stock">How many are ready?</label><input id="product-stock" name="stock" type="number" min="0" step="1" required></div></div>
      <div class="form-row"><div class="form-field"><label for="product-category">Category</label><select id="product-category" name="category"><option>Home</option><option>Fashion</option><option>Beauty</option><option>Accessories</option><option>Art</option><option>Food</option><option>Other</option></select></div><div class="form-field"><label for="product-image">Image URL (optional)</label><input id="product-image" name="image_url" type="url" placeholder="https://..."></div></div>
      <div class="inline-error" id="product-error" role="alert"></div><button class="button button-dark" type="submit">Add it to the marketplace <span aria-hidden="true">→</span></button>
    </form>`;
  setDialogContent(elements.formModal, elements.formContent, content);
}

async function handleProductSubmit(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  const error = $('#product-error', form);
  const button = $('button[type="submit"]', form);
  values.price = Number(values.price);
  values.stock = Number(values.stock);
  button.disabled = true;
  try {
    let product;
    if (state.apiReady) {
      const result = await request('/api/products', { method: 'POST', body: JSON.stringify(values) });
      product = { ...result.product, vendor_name: state.user.name, vendor_id: state.user.id };
      state.products.unshift(product);
    } else {
      product = {
        ...values, id: `demo-${Date.now()}`, vendor_id: state.user.id, vendor_name: state.user.name,
        image_url: values.image_url || '', created_at: new Date().toISOString()
      };
      save(STORAGE.products, [product, ...getSaved(STORAGE.products, [])]);
    }
    renderProducts();
    elements.formModal.close();
    showToast('Your new listing is out in the world.');
    showVendorDashboard();
  } catch (requestError) {
    error.textContent = requestError.message;
    error.classList.add('visible');
  } finally {
    button.disabled = false;
  }
}

function showOrderHistory() {
  setDialogContent(elements.formModal, elements.formContent,
    '<span class="eyebrow">YOUR GOOD THINGS</span><h2 id="form-title">Your orders.</h2><p>All the thoughtful finds you’ve brought home.</p><ul class="dashboard-list" id="order-history"><li>Loading…</li></ul>');
  loadOrderHistory();
}

async function loadOrderHistory() {
  const list = $('#order-history');
  if (!list) return;
  try {
    const orders = state.apiReady ? await request('/api/orders/mine') : getSaved(STORAGE.orders, []).filter((order) => order.customer_id === state.user.id);
    list.innerHTML = orders.length ? orders.map((order) => {
      const lines = order.items.map((item) => `${escapeHtml(item.title || 'A good thing')} × ${item.quantity}`).join(', ');
      return `<li>Order #${escapeHtml(order.id)} · ${new Date(order.created_at).toLocaleDateString()}<br><span>${money.format(Number(order.total_amount))} · ${escapeHtml(order.status)}</span><br>${lines}</li>`;
    }).join('') : '<li>Your first good thing is waiting to be found.</li>';
  } catch (error) {
    list.innerHTML = `<li>${escapeHtml(error.message)}</li>`;
  }
}

async function checkout() {
  if (!state.user) {
    closeCart();
    showAccountForm('login');
    showToast('Sign in or make an account to finish your order.');
    return;
  }
  if (state.user.role === 'vendor') return showToast('Switch to a customer account to place an order.');
  closeCart();
  showCheckoutForm();
}

function showCheckoutForm() {
  const name = escapeHtml(state.user.name || '');
  const content = `<span class="eyebrow">A THOUGHTFUL CHOICE</span><h2 id="form-title">Where should it go?</h2><p>We’ll pass your delivery details to the independent maker. Pay when your order arrives.</p>
    <form id="checkout-form">
      <div class="form-field"><label for="shipping-name">Full name</label><input id="shipping-name" name="name" autocomplete="name" value="${name}" maxlength="100" required></div>
      <div class="form-field"><label for="shipping-address">Street address</label><input id="shipping-address" name="address" autocomplete="street-address" maxlength="255" required></div>
      <div class="form-row"><div class="form-field"><label for="shipping-city">City</label><input id="shipping-city" name="city" autocomplete="address-level2" maxlength="100" required></div><div class="form-field"><label for="shipping-postal">Postal code</label><input id="shipping-postal" name="postal_code" autocomplete="postal-code" maxlength="30" required></div></div>
      <div class="form-field"><label for="shipping-phone">Phone (optional)</label><input id="shipping-phone" name="phone" type="tel" autocomplete="tel" maxlength="30"></div>
      <div class="inline-error" id="checkout-error" role="alert"></div><button class="button button-dark" type="submit">Place order · pay on delivery <span aria-hidden="true">→</span></button>
    </form>`;
  setDialogContent(elements.formModal, elements.formContent, content);
}

async function handleCheckoutSubmit(form) {
  const shipping = Object.fromEntries(new FormData(form).entries());
  const error = $('#checkout-error', form);
  const button = $('button[type="submit"]', form);
  button.disabled = true;
  button.textContent = 'Placing your order…';
  try {
    let order;
    if (state.apiReady) {
      const result = await request('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: state.cart.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
          shipping
        })
      });
      order = result.order;
    } else {
      for (const item of state.cart) {
        const product = getProduct(item.product_id);
        if (!product || Number(product.stock) < item.quantity) throw new Error(`${product?.title || 'A product'} is no longer available in that quantity.`);
      }
      const total = state.cart.reduce((sum, item) => sum + Number(getProduct(item.product_id).price) * item.quantity, 0);
      order = { id: `M${Date.now().toString().slice(-7)}`, total_amount: total.toFixed(2), status: 'Pending', created_at: new Date().toISOString(), customer_id: state.user.id, items: [], shipping, payment_method: 'cash_on_delivery' };
      for (const item of state.cart) {
        const product = getProduct(item.product_id);
        order.items.push({ product_id: product.id, title: product.title, quantity: item.quantity, price: product.price });
      }
      const stock = getSaved(STORAGE.stock, {});
      for (const item of state.cart) {
        const product = getProduct(item.product_id);
        stock[String(product.id)] = Number(product.stock) - item.quantity;
      }
      save(STORAGE.stock, stock);
      save(STORAGE.products, getSaved(STORAGE.products, []));
      const demoOrders = getSaved(STORAGE.orders, []);
      demoOrders.unshift(order);
      save(STORAGE.orders, demoOrders);
      renderProducts();
    }

    state.cart = [];
    renderCart();
    closeCart();
    showToast('Your order is in. Thanks for shopping thoughtfully!');
    showOrderConfirmation(order);
  } catch (requestError) {
    error.textContent = requestError.message;
    error.classList.add('visible');
  } finally {
    button.disabled = false;
    button.innerHTML = 'Place order · pay on delivery <span aria-hidden="true">→</span>';
  }
}

function showOrderConfirmation(order) {
  const content = `<span class="eyebrow">A THOUGHTFUL CHOICE</span><h2 id="form-title">It’s on its way.</h2><p>Your order <strong>#${escapeHtml(order.id)}</strong> is confirmed. Pay for it when it arrives. Thanks for choosing independent makers.</p><div class="subtotal"><span>Order total</span><strong>${money.format(Number(order.total_amount))}</strong></div><button class="button button-dark" data-close>Back to the good stuff <span aria-hidden="true">→</span></button>`;
  setDialogContent(elements.formModal, elements.formContent, content);
}

function showAccountMenu() {
  if (!state.user) return showAccountForm('login');
  if (state.user.role === 'vendor') return showVendorDashboard();
  const content = `<span class="eyebrow">GOOD TO SEE YOU</span><h2 id="form-title">Hi, ${escapeHtml(state.user.name.split(' ')[0])}.</h2><p>What would you like to do?</p><button class="button button-dark" id="orders-button">See my orders <span aria-hidden="true">→</span></button><button class="button button-outline" id="signout-button" style="margin-top:10px">Sign out</button>`;
  setDialogContent(elements.formModal, elements.formContent, content);
}

function showVendorSignup() {
  if (state.user?.role === 'vendor') return showVendorDashboard();
  if (state.user) {
    showToast('Sign out before creating a separate maker account.');
    return;
  }
  showAccountForm('register', 'vendor');
}

function showDemoNotice() {
  if (state.apiReady) return;
  const banner = document.createElement('div');
  banner.className = 'demo-notice';
  banner.textContent = 'Preview shop · Listings and orders are saved on this device. Checkout is pay on delivery; no online payment is collected.';
  document.body.prepend(banner);
}

async function initialize() {
  renderProducts();
  renderCart();
  renderHeaderAccount();
  try {
    const health = await request('/api/health');
    if (health.databaseAvailable && health.authConfigured) {
      const products = await request('/api/products');
      state.products = products;
      state.apiReady = true;
      renderProducts();
    }
  } catch {
    state.apiReady = false;
  }
  if (!state.apiReady) showDemoNotice();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('/service-worker.js').catch((error) => console.error('Service worker registration failed:', error));
  }
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.add) addToCart(target.dataset.add);
  if (target.dataset.category) setCategory(target.dataset.category);
  if (target.dataset.quantity) {
    const item = state.cart.find((entry) => String(entry.product_id) === target.dataset.id);
    if (!item) return;
    const product = getProduct(item.product_id);
    const next = item.quantity + Number(target.dataset.quantity);
    if (next < 1) state.cart = state.cart.filter((entry) => entry !== item);
    else if (product && next <= Number(product.stock)) item.quantity = next;
    else return showToast('That’s all the stock we have right now.');
    renderCart();
  }
  if (target.dataset.remove) {
    state.cart = state.cart.filter((item) => String(item.product_id) !== target.dataset.remove);
    renderCart();
  }
  if (target.dataset.close !== undefined) {
    closeCart();
    closeDialogs();
  }
  if (target.dataset.accountMode) showAccountForm(target.dataset.accountMode);
});

$('#search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  state.search = $('#search-input').value.trim();
  renderProducts();
  $('#shop').scrollIntoView({ behavior: 'smooth' });
});
$('#search-input').addEventListener('input', (event) => {
  state.search = event.target.value.trim();
  renderProducts();
});
$('#sort-select').addEventListener('change', (event) => {
  state.sort = event.target.value;
  renderProducts();
});
$('#load-more').addEventListener('click', () => {
  state.category = 'All';
  state.search = '';
  $('#search-input').value = '';
  $('#filter-row .filter-chip[data-category="All"]').click();
});
$('#cart-button').addEventListener('click', openCart);
$('#account-button').addEventListener('click', showAccountMenu);
$('#sell-link').addEventListener('click', showVendorSignup);
$('#maker-cta').addEventListener('click', showVendorSignup);
$('#checkout-button').addEventListener('click', checkout);
elements.overlay.addEventListener('click', closeCart);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeCart(); });

document.addEventListener('submit', async (event) => {
  if (event.target.id === 'account-form') {
    event.preventDefault();
    await handleAccountSubmit(event.target);
  }
  if (event.target.id === 'product-form') {
    event.preventDefault();
    await handleProductSubmit(event.target);
  }
  if (event.target.id === 'checkout-form') {
    event.preventDefault();
    await handleCheckoutSubmit(event.target);
  }
  if (event.target.id === 'newsletter-form') {
    event.preventDefault();
    const email = $('#newsletter-email').value.trim().toLowerCase();
    const subscribers = getSaved(STORAGE.newsletter, []);
    if (!subscribers.includes(email)) subscribers.push(email);
    save(STORAGE.newsletter, subscribers);
    event.target.reset();
    showToast('Thanks for your interest. Email signup isn’t connected yet.');
  }
});

document.addEventListener('click', (event) => {
  if (event.target.id === 'new-product-button') showProductForm();
  if (event.target.id === 'orders-button') showOrderHistory();
  if (event.target.id === 'signout-button') {
    state.user = null;
    state.token = null;
    localStorage.removeItem(STORAGE.user);
    localStorage.removeItem(STORAGE.token);
    elements.formModal.close();
    renderHeaderAccount();
    showToast('You’ve signed out. See you again soon.');
  }
});

initialize();
