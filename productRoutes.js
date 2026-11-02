const express = require('express');
const router = express.Router();
const { createProduct, getAllProducts } = require('./productionController');
const { verifyToken, requireRole } = require('./auth');

router.get('/', getAllProducts);
router.post('/', verifyToken, requireRole('vendor', 'admin'), createProduct);

module.exports = router;