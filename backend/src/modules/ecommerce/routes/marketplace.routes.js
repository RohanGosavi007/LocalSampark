const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');

router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query;
    let listings;
    if (category) {
      listings = await query('SELECT * FROM marketplace_listings WHERE category = $1 AND status = \'active\' ORDER BY created_at DESC', [category]);
    } else {
      listings = await query('SELECT * FROM marketplace_listings WHERE status = \'active\' ORDER BY created_at DESC');
    }
    res.json(listings);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, description, category, condition, price, isNegotiable, photoUrls, latitude, longitude } = req.body;
    const geom = `ST_GeomFromText('POINT(${longitude || 73.8567} ${latitude || 18.5204})', 4326)`;

    const listing = await queryOne(
      `INSERT INTO marketplace_listings (seller_id, title, description, category, condition, price, is_negotiable, photo_urls, coordinate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${geom})
       RETURNING *`,
      [req.user.id, title, description, category, condition, price, isNegotiable !== false, JSON.stringify(photoUrls || [])]
    );

    res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
