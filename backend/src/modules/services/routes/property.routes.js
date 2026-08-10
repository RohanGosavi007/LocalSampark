const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth.middleware');
const { getProperties, createProperty } = require('../controllers/property.controller');

router.get('/', authenticate, getProperties);
router.post('/', authenticate, createProperty);

module.exports = router;
