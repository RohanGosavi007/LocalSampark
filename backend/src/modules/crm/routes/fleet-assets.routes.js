/**
 * FLEET ASSETS ROUTES — Archetype 5: Heavy Equipment & Rentals
 * For: Tractor & Ag-Machinery, Borewell, Construction Equipment, Party/Tent Rentals, Vehicle Rentals, Scaffolding
 */
const express = require('express');
const router = express.Router();
const { query } = require('../../../../config/database');
const { authenticate } = require('../../../../middleware/auth.middleware');

// ── GET /api/v1/fleet-assets/:shopId — Get all assets ──
router.get('/:shopId', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;
    const { status, assetType } = req.query;

    let sql = `SELECT * FROM fleet_assets WHERE shop_id = $1`;
    const params = [shopId];

    if (status) {
      sql += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    if (assetType) {
      sql += ` AND asset_type = $${params.length + 1}`;
      params.push(assetType);
    }

    sql += ` ORDER BY created_at DESC`;
    const result = await query(sql, params);

    // Get status summary
    const summary = await query(
      `SELECT status, COUNT(*) as count FROM fleet_assets WHERE shop_id = $1 GROUP BY status`,
      [shopId]
    );

    res.json({
      assets: result.rows || [],
      statusSummary: (summary.rows || []).reduce((acc, r) => { acc[r.status] = parseInt(r.count); return acc; }, {}),
    });
  } catch (error) {
    console.error('Fleet assets fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch fleet assets' });
  }
});

// ── POST /api/v1/fleet-assets/:shopId — Add new asset ──
router.post('/:shopId', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;
    const {
      name, assetType, model, registrationNumber, photos,
      hourlyRate, dailyRate, weeklyRate, acreageRate,
      securityDeposit, driverAvailable, driverChargePerDay,
      fuelType, capacity, description
    } = req.body;

    const result = await query(
      `INSERT INTO fleet_assets (shop_id, name, asset_type, model, registration_number, photos,
       hourly_rate, daily_rate, weekly_rate, acreage_rate, security_deposit,
       driver_available, driver_charge_per_day, fuel_type, capacity, description, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'available', NOW())
       RETURNING *`,
      [shopId, name, assetType, model || null, registrationNumber || null,
       JSON.stringify(photos || []), hourlyRate || 0, dailyRate || 0,
       weeklyRate || 0, acreageRate || 0, securityDeposit || 0,
       driverAvailable || false, driverChargePerDay || 0,
       fuelType || null, capacity || null, description || null]
    );

    res.status(201).json({ asset: result.rows[0] });
  } catch (error) {
    console.error('Asset create error:', error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

// ── PUT /api/v1/fleet-assets/:shopId/:assetId/status — Update asset status ──
router.put('/:shopId/:assetId/status', authenticate, async (req, res) => {
  try {
    const { assetId } = req.params;
    const { status, notes, returnDate, operatorName, fuelLevel } = req.body;

    // Valid statuses: available, in_field, rented, maintenance, reserved
    const validStatuses = ['available', 'in_field', 'rented', 'maintenance', 'reserved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    await query(
      `UPDATE fleet_assets SET status = $1, status_notes = $2, expected_return_date = $3,
       current_operator = $4, fuel_level = $5, updated_at = NOW() WHERE id = $6`,
      [status, notes || null, returnDate || null, operatorName || null, fuelLevel || null, assetId]
    );

    res.json({ success: true, status });
  } catch (error) {
    console.error('Asset status update error:', error);
    res.status(500).json({ error: 'Failed to update asset status' });
  }
});

// ── POST /api/v1/fleet-assets/:shopId/book — Book/rent an asset (visitor) ──
router.post('/:shopId/book', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;
    const {
      assetId, customerName, customerPhone, userId,
      startDate, endDate, durationType, durationValue,
      needDriver, deliveryAddress, notes
    } = req.body;

    // Check asset availability
    const asset = await query(`SELECT * FROM fleet_assets WHERE id = $1 AND status = 'available'`, [assetId]);
    if (!asset.rows?.length) {
      return res.status(400).json({ error: 'Asset is not available for booking' });
    }

    const assetData = asset.rows[0];

    // Calculate cost
    let totalCost = 0;
    if (durationType === 'hourly') totalCost = (assetData.hourly_rate || 0) * durationValue;
    else if (durationType === 'daily') totalCost = (assetData.daily_rate || 0) * durationValue;
    else if (durationType === 'weekly') totalCost = (assetData.weekly_rate || 0) * durationValue;
    else if (durationType === 'acreage') totalCost = (assetData.acreage_rate || 0) * durationValue;

    if (needDriver) totalCost += (assetData.driver_charge_per_day || 0) * (durationValue || 1);
    const securityDeposit = assetData.security_deposit || 0;

    const bookingNumber = `RNT-${Date.now().toString(36).toUpperCase()}`;

    await query(
      `INSERT INTO rental_bookings (shop_id, asset_id, booking_number, customer_name, customer_phone, user_id,
       start_date, end_date, duration_type, duration_value, need_driver, delivery_address,
       rental_cost, security_deposit, total_amount, notes, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'pending', NOW())`,
      [shopId, assetId, bookingNumber, customerName, customerPhone, userId || null,
       startDate, endDate || null, durationType, durationValue, needDriver || false,
       deliveryAddress || null, totalCost, securityDeposit, totalCost + securityDeposit,
       notes || null]
    );

    // Mark asset as reserved
    await query(`UPDATE fleet_assets SET status = 'reserved', updated_at = NOW() WHERE id = $1`, [assetId]);

    const io = req.app.get('io');
    if (io) {
      io.to(`shop:${shopId}`).emit('rental:new_booking', {
        bookingNumber,
        assetName: assetData.name,
        customerName,
        totalAmount: totalCost + securityDeposit,
        sound: 'new_order_chime',
      });
    }

    res.status(201).json({
      success: true,
      bookingNumber,
      rentalCost: totalCost,
      securityDeposit,
      totalAmount: totalCost + securityDeposit,
    });
  } catch (error) {
    console.error('Rental booking error:', error);
    res.status(500).json({ error: 'Failed to book asset' });
  }
});

// ── GET /api/v1/fleet-assets/:shopId/bookings — Get all rental bookings ──
router.get('/:shopId/bookings', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;
    const { status } = req.query;

    let sql = `SELECT rb.*, fa.name as asset_name, fa.asset_type, fa.model
               FROM rental_bookings rb
               JOIN fleet_assets fa ON rb.asset_id = fa.id
               WHERE rb.shop_id = $1`;
    const params = [shopId];

    if (status) {
      sql += ` AND rb.status = $${params.length + 1}`;
      params.push(status);
    }

    sql += ` ORDER BY rb.created_at DESC`;
    const result = await query(sql, params);

    res.json({ bookings: result.rows || [] });
  } catch (error) {
    console.error('Rental bookings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// ── POST /api/v1/fleet-assets/:shopId/:assetId/log — Add operator/fuel log ──
router.post('/:shopId/:assetId/log', authenticate, async (req, res) => {
  try {
    const { assetId } = req.params;
    const { logType, operatorName, fuelAdded, hoursUsed, notes, photos } = req.body;

    await query(
      `INSERT INTO fleet_asset_logs (asset_id, log_type, operator_name, fuel_added, hours_used, notes, photos, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [assetId, logType || 'usage', operatorName || null, fuelAdded || 0,
       hoursUsed || 0, notes || null, JSON.stringify(photos || [])]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Fleet log error:', error);
    res.status(500).json({ error: 'Failed to add log entry' });
  }
});

// ── GET /api/v1/fleet-assets/:shopId/availability — Check availability calendar ──
router.get('/:shopId/availability', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;
    const { assetId, month, year } = req.query;

    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    let sql = `SELECT rb.start_date, rb.end_date, rb.status, fa.name as asset_name, fa.id as asset_id
               FROM rental_bookings rb
               JOIN fleet_assets fa ON rb.asset_id = fa.id
               WHERE rb.shop_id = $1
               AND EXTRACT(MONTH FROM rb.start_date) = $2
               AND EXTRACT(YEAR FROM rb.start_date) = $3
               AND rb.status NOT IN ('cancelled', 'completed')`;
    const params = [shopId, targetMonth, targetYear];

    if (assetId) {
      sql += ` AND rb.asset_id = $${params.length + 1}`;
      params.push(assetId);
    }

    const result = await query(sql, params);

    res.json({ bookings: result.rows || [], month: targetMonth, year: targetYear });
  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

module.exports = router;
