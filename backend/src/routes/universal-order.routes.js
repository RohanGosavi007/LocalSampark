const express = require('express');
const router = express.Router();
const orderController = require('../controllers/universal-order.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/', protect, orderController.createOrder);
router.get('/shop/:shopId', protect, orderController.getShopOrders);

module.exports = router;
