const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

// Get all user addresses
router.get('/', authenticate, async (req, res, next) => {
  try {
    const addresses = await query('SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC', [req.user.id]);
    res.json({ success: true, data: addresses.rows || addresses });
  } catch (error) {
    next(error);
  }
});

// Add a new address
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { address_type, full_name, phone_number, street_address, apartment_suite, city, state, postal_code, country, latitude, longitude, is_default } = req.body;
    
    if (!street_address || !city || !state || !postal_code) {
      return res.status(400).json({ error: 'Street address, city, state, and postal code are required' });
    }

    if (is_default) {
      await query('UPDATE user_addresses SET is_default = 0 WHERE user_id = $1', [req.user.id]);
    }

    const id = crypto.randomUUID();
    const insertRes = await query(`
      INSERT INTO user_addresses (id, user_id, address_type, full_name, phone_number, street_address, apartment_suite, city, state, postal_code, country, latitude, longitude, is_default)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [id, req.user.id, address_type || 'home', full_name, phone_number, street_address, apartment_suite, city, state, postal_code, country || 'India', latitude, longitude, is_default ? 1 : 0]);

    const newAddress = await queryOne('SELECT * FROM user_addresses WHERE id = $1', [id]);
    res.status(201).json({ success: true, data: newAddress });
  } catch (error) {
    next(error);
  }
});

// Update an address
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const addressId = req.params.id;
    const { address_type, full_name, phone_number, street_address, apartment_suite, city, state, postal_code, country, latitude, longitude, is_default } = req.body;
    
    const existing = await queryOne('SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2', [addressId, req.user.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Address not found' });
    }

    if (is_default) {
      await query('UPDATE user_addresses SET is_default = 0 WHERE user_id = $1', [req.user.id]);
    }

    await query(`
      UPDATE user_addresses SET 
        address_type = $1, full_name = $2, phone_number = $3, street_address = $4, apartment_suite = $5, 
        city = $6, state = $7, postal_code = $8, country = $9, latitude = $10, longitude = $11, is_default = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13 AND user_id = $14
    `, [
      address_type || existing.address_type, 
      full_name || existing.full_name, 
      phone_number || existing.phone_number, 
      street_address || existing.street_address, 
      apartment_suite || existing.apartment_suite, 
      city || existing.city, 
      state || existing.state, 
      postal_code || existing.postal_code, 
      country || existing.country, 
      latitude !== undefined ? latitude : existing.latitude, 
      longitude !== undefined ? longitude : existing.longitude, 
      is_default !== undefined ? (is_default ? 1 : 0) : existing.is_default,
      addressId, req.user.id
    ]);

    const updatedAddress = await queryOne('SELECT * FROM user_addresses WHERE id = $1', [addressId]);
    res.json({ success: true, data: updatedAddress });
  } catch (error) {
    next(error);
  }
});

// Delete an address
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const addressId = req.params.id;
    const existing = await queryOne('SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2', [addressId, req.user.id]);
    
    if (!existing) {
      return res.status(404).json({ error: 'Address not found' });
    }

    await query('DELETE FROM user_addresses WHERE id = $1', [addressId]);
    res.json({ success: true, message: 'Address deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
