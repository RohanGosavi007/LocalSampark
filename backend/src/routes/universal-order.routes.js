const express = require('express');
const router = express.Router();
const orderController = require('../controllers/universal-order.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/', authenticate, orderController.createOrder);
router.get('/my', authenticate, orderController.getMyOrders);
router.get('/shop/:shopId', authenticate, orderController.getShopOrders);
router.patch('/:orderId/status', authenticate, orderController.updateOrderStatus);

module.exports = router;
