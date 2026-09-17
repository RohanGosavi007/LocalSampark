const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const pincodeUtil = require('../../../utils/pincode');
const crypto = require('crypto');

/**
 * Validates the parts of an address the platform actually routes on.
 *
 * postal_code was accepted as any string. It is the key territory resolution
 * uses when GPS cannot place someone — which, with boundaries quarantined, is
 * most of the time — so "411 001", "4110011" and "abc" all stored happily and
 * then matched no territory, leaving the customer's delivery unroutable with
 * no indication which field was at fault.
 */
function validateAddress(body) {
  const problems = [];

  if (!body.street_address || !String(body.street_address).trim()) problems.push({ field: 'street_address', message: 'A street address is required.' });
  if (!body.city || !String(body.city).trim()) problems.push({ field: 'city', message: 'A city is required.' });
  if (!body.state || !String(body.state).trim()) problems.push({ field: 'state', message: 'A state is required.' });

  if (!pincodeUtil.isValid(body.postal_code)) {
    problems.push({
      field: 'postal_code',
      message: `Enter a valid 6-digit pincode: ${pincodeUtil.describeFailure(body.postal_code)}.`,
    });
  }

  for (const [field, limit] of [['latitude', 90], ['longitude', 180]]) {
    const value = body[field];
    if (value === undefined || value === null || value === '') continue;
    const num = Number(value);
    if (!Number.isFinite(num) || Math.abs(num) > limit) {
      problems.push({ field, message: `${field} must be a number between -${limit} and ${limit}.` });
    }
  }

  return problems;
}

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
    
    const problems = validateAddress(req.body || {});
    if (problems.length > 0) {
      return res.status(400).json({ success: false, error: 'This address cannot be saved yet.', problems });
    }

    if (is_default) {
      await query('UPDATE user_addresses SET is_default = 0 WHERE user_id = $1', [req.user.id]);
    }

    const id = crypto.randomUUID();
    const insertRes = await query(`
      INSERT INTO user_addresses (id, user_id, address_type, full_name, phone_number, street_address, apartment_suite, city, state, postal_code, country, latitude, longitude, is_default)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [id, req.user.id, address_type || 'home', full_name, phone_number, street_address, apartment_suite, city, state,
        // Normalised on the way in, so the stored value is what a territory
        // lookup will match against rather than whatever spacing was typed.
        pincodeUtil.normalize(postal_code), country || 'India', latitude, longitude, is_default ? 1 : 0]);

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

    await query('DELETE FROM user_addresses WHERE id = $1 AND user_id = $2', [addressId, req.user.id]);

    // Deleting the default used to leave the account with no default at all, so
    // checkout opened with nothing selected and the customer had to go and set
    // one before they could order. Promote the most recent survivor instead.
    let promoted = null;
    if (existing.is_default) {
      const replacement = await queryOne(
        'SELECT id FROM user_addresses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [req.user.id]
      );
      if (replacement) {
        await query('UPDATE user_addresses SET is_default = 1 WHERE id = $1 AND user_id = $2',
          [replacement.id, req.user.id]);
        promoted = replacement.id;
      }
    }

    res.json({ success: true, message: 'Address deleted successfully', promoted_default: promoted });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
