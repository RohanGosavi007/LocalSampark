const express = require('express');
const router = express.Router();
const db = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');

// List properties
router.post('/properties', authenticate, async (req, res, next) => {
  try {
    const { userId, title, description, propertyType, listingType, price, deposit, coordinate } = req.body;
    const result = await db.query(`INSERT INTO property_listings (user_id, title, description, property_type, listing_type, price, deposit, coordinate, is_verified, is_active)
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
    const staff = ['admin', 'super_admin'].includes(String(req.user.role || '').toLowerCase());
    if (String(landlordId) !== String(req.user.id) && !staff) {
      return res.status(403).json({ error: 'You can only view your own dashboard.' });
    }
    const listings = await db.queryMany(`SELECT * FROM property_listings WHERE user_id = $1`,
      [landlordId]
    );

    // No tenancy is recorded anywhere in the schema, so there are no tenants
    // to list. This returned two made-up people — "Karan Malhotra, Paid" and
    // "Sunil Gavaskar, Overdue" — to every landlord, as their tenants.
    res.json({ listings, tenants: [] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
