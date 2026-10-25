const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/universal-catalog.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireShopParam } = require('../middleware/shop-owner.middleware');

/*
 * A shop's catalogue is what its storefront lists and what an order is priced
 * from. Adding, changing and removing items were `authenticate` only: any
 * signed-in account could set any shop's prices — and then order at them.
 * They now require the shop's owner (or platform staff).
 */
router.get('/:shopId', catalogController.getCatalogItems);

router.post('/:shopId/bulk', authenticate, requireShopParam(), catalogController.bulkAddCatalogItems);

// Leads — a customer's interest in a shop, recorded as the customer.
router.post('/:shopId/leads', authenticate, catalogController.trackLead);

// AI helper
router.post('/ai/generate-description', authenticate, catalogController.generateDescriptionWithAI);

router.post('/:shopId', authenticate, requireShopParam(), catalogController.addCatalogItem);
router.put('/item/:itemId', authenticate, catalogController.requireItemOwner, catalogController.updateCatalogItem);
router.delete('/item/:itemId', authenticate, catalogController.requireItemOwner, catalogController.deleteCatalogItem);

module.exports = router;
