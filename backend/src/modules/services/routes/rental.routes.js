const express = require('express');
const router = express.Router();
const db = require('../../../../config/database');
const { authenticate } = require('../../../../middleware/auth.middleware');

// List properties
router.post('/properties', authenticate, async (req, res, next) => {
  try {
    const { userId, title, description, propertyType, listingType, price, deposit, coordinate } = req.body;
    const result = await db.query(
      `INSERT INTO property_listings (user_id, title, description, property_type, listing_type, price, deposit, coordinate, is_verified, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true) RETURNING *`,
      [userId, title, description, propertyType, listingType, price, deposit, coordinate]
    );
    res.status(201).json({ success: true, property: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Landlord dashboard stats
router.get('/dashboard/:landlordId', authenticate, async (req, res, next) => {
  try {
    const { landlordId } = req.params;
    const listings = await db.queryMany(
      `SELECT * FROM property_listings WHERE user_id = $1`,
      [landlordId]
    );
    
    // Mock tenant data matching listings
    const tenants = [
      { name: 'Karan Malhotra', rentStatus: 'Paid', flat: 'Flat 302, Aashiyana', due: 'July 5' },
      { name: 'Sunil Gavaskar', rentStatus: 'Overdue', flat: 'Room B, Goodwill PG', due: 'June 25' }
    ];

    res.json({ listings, tenants });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
