const express = require('express');
const router = express.Router();
const { getTerritoryMap } = require('../controllers/territory.controller');

// Admin / Franchise Routes
router.get('/map', getTerritoryMap);

module.exports = router;
