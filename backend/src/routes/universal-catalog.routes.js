const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/universal-catalog.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/:shopId', catalogController.getCatalogItems);
// Add a bulk upload route (e.g. for CSV parsed JSON arrays)
router.post('/:shopId/bulk', authenticate, catalogController.bulkAddCatalogItems);

// Track CRM Leads (Favorite, Cart Abandoned)
router.post('/:shopId/leads', authenticate, catalogController.trackLead);

// AI Generation for Descriptions
router.post('/ai/generate-description', authenticate, catalogController.generateDescriptionWithAI);

router.post('/:shopId', authenticate, catalogController.addCatalogItem);
router.put('/item/:itemId', authenticate, catalogController.updateCatalogItem);
router.delete('/item/:itemId', authenticate, catalogController.deleteCatalogItem);

module.exports = router;
