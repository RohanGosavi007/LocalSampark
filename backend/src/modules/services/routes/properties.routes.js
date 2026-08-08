const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../../config/database');
const { authenticate } = require('../../../../middleware/auth.middleware');
const crypto = require('crypto');

// GET / - Search local property listings
router.get('/', async (req, res, next) => {
  try {
    const { propertyType, listingType = 'RENT', lat, lng, radius = 10 } = req.query;
    let sql = 'SELECT * FROM local_property_listings WHERE status = $1';
    const params = ['available'];

    if (propertyType) {
      params.push(propertyType);
      sql += ` AND property_type = $${params.length}`;
    }
    if (req.query.listingType) {
      params.push(req.query.listingType);
      sql += ` AND listing_type = $${params.length}`;
    }

    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const searchRadius = parseFloat(radius);

      const latDelta = searchRadius / 111.045;
      const lngDelta = searchRadius / (111.045 * Math.cos(userLat * (Math.PI / 180)));

      params.push(userLat - latDelta, userLat + latDelta, userLng - lngDelta, userLng + lngDelta);
      sql += ` AND latitude BETWEEN $${params.length - 3} AND $${params.length - 2} AND longitude BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';

    const properties = await query(sql, params);
    res.json({ success: true, properties: properties.rows || properties });
  } catch (err) {
    next(err);
  }
});

// POST / - Create property listing
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, propertyType, listingType = 'RENT', price, deposit = 0, address, latitude, longitude, images } = req.body;
    if (!title || !propertyType || !price || !address) {
      return res.status(400).json({ error: 'Missing required property fields' });
    }

    const propId = crypto.randomUUID();
    await query(`
      INSERT INTO local_property_listings (id, owner_id, title, property_type, listing_type, price, deposit, address, latitude, longitude, images_json, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'available')
    `, [propId, req.user.id, title, propertyType, listingType, price, deposit, address, latitude || null, longitude || null, JSON.stringify(images || [])]);

    res.status(201).json({ success: true, message: 'Property listed successfully!', propertyId: propId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
