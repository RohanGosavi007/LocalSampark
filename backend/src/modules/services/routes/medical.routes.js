const express = require('express');
const router = express.Router();
const { query, queryOne, withTransaction } = require('../../../config/database');
const { authenticate, requireAdmin } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

// GET /doctors - Search doctors dynamically
router.get('/doctors', async (req, res, next) => {
  try {
    const { specialization, pincode } = req.query;
    let sql = 'SELECT * FROM medical_doctors WHERE is_available = true';
    const params = [];

    if (specialization) {
      params.push(specialization);
      sql += ` AND specialization = $${params.length}`;
    }

    const doctorsResult = await query(sql, params);
    let rows = doctorsResult.rows || doctorsResult;

    if (pincode) {
      rows = rows.filter(d => {
        try {
          const pincodes = JSON.parse(d.serviced_pincodes_json || '[]');
          return pincodes.length === 0 || pincodes.includes(String(pincode));
        } catch (e) {
          return true;
        }
      });
    }

    res.json({ success: true, doctors: rows });
  } catch (err) {
    next(err);
  }
});

// GET /admin/records - Fetch all doctors for admin verification
router.get('/admin/records', async (req, res, next) => {
  try {
    const doctors = await query('SELECT * FROM medical_doctors ORDER BY created_at DESC');
    res.json({ success: true, data: doctors.rows || doctors });
  } catch (err) {
    next(err);
  }
});

// PUT /admin/doctors/:id/verify - Toggle verification
router.put('/admin/doctors/:id/verify', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_verified } = req.body;
    await query('UPDATE medical_doctors SET is_verified = $1 WHERE id = $2', [is_verified ? 1 : 0, id]);
    res.json({ success: true, message: 'Doctor verification status updated' });
  } catch (err) {
    next(err);
  }
});

// POST /appointments - Book doctor appointment with wallet ledger deduction
router.post('/appointments', authenticate, async (req, res, next) => {
  try {
    const { doctorId, appointmentDate, timeSlot, patientName, patientPhone } = req.body;
    if (!doctorId || !appointmentDate || !timeSlot || !patientName || !patientPhone) {
      return res.status(400).json({ error: 'Missing required appointment fields' });
    }

    const doctor = await queryOne('SELECT * FROM medical_doctors WHERE id = $1', [doctorId]);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const fee = doctor.consultation_fee || 500.00;
    const apptRef = `MED-${Math.floor(100000 + Math.random() * 900000)}`;
    const apptId = crypto.randomUUID();

    // Atomic Appointment Creation and Ledger Entry
    await withTransaction(async (dbClient) => {
      await dbClient.query(`
        INSERT INTO medical_appointments (
          id, appointment_ref, user_id, doctor_id, appointment_date, time_slot, patient_name, patient_phone, consultation_fee, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'confirmed')
      `, [apptId, apptRef, req.user.id, doctorId, appointmentDate, timeSlot, patientName, patientPhone, fee]);

      // Record transaction
      await dbClient.query(`
        INSERT INTO wallet_transactions (id, wallet_id, amount, type, purpose, status)
        VALUES ($1, (SELECT id FROM wallets WHERE user_id = $2 LIMIT 1), $3, 'debit', 'medical_consultation', 'completed')
      `, [crypto.randomUUID(), req.user.id, fee]);
    });

    res.status(201).json({
      success: true,
      message: 'Medical appointment confirmed!',
      appointment: { id: apptId, appointment_ref: apptRef, status: 'confirmed', fee }
    });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Blood bank / emergency medical requests
//
// apps/mobile/app/modules/blood-bank/index.js calls /requests, /donors and
// /admin/reward-{status,toggle}. None of them existed, so the screen showed
// permanently empty request and donor lists — its catch blocks are empty, so
// the 404s were invisible.
// ════════════════════════════════════════════════════════════════════════════

// Donors who register from the public blood-bank screen belong to no society.
// Migration 088 makes blood_donors.society_id nullable for exactly this case;
// a sentinel string was impossible because the column carries a foreign key
// to societies.
const PUBLIC_DONOR_SCOPE = null;

// Coins granted for joining the donor register, when the reward is switched on.
const DONOR_REWARD_COINS = 250;
const DONOR_REWARD_KEY = 'medical.donor_reward_enabled';

// required_item is aliased to requiredItem because that is the field the
// screen renders (r.requiredItem).
const REQUEST_SELECT = `
    SELECT m.id,
           m.request_type,
           m.required_item AS "requiredItem",
           m.blood_group,
           m.description,
           m.location,
           m.urgency,
           m.phone,
           m.status,
           m.created_at,
           COALESCE(u.full_name, m.patient_name, 'Anonymous') AS requester_name
      FROM medical_requests m
      LEFT JOIN users u ON u.id = m.requester_id`;

router.get('/requests', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `${REQUEST_SELECT} WHERE m.status = $1 ORDER BY m.created_at DESC`,
      ['open']
    );
    res.json({ success: true, data: result.rows || result || [] });
  } catch (err) {
    next(err);
  }
});

router.post('/requests', authenticate, async (req, res, next) => {
  try {
    const { requestType, requiredItem, description, location, urgency } = req.body;

    if (!requiredItem || !String(requiredItem).trim()) {
      return res.status(400).json({ success: false, error: 'requiredItem is required' });
    }
    if (!location || !String(location).trim()) {
      return res.status(400).json({ success: false, error: 'location is required' });
    }

    const id = crypto.randomUUID();
    await query(
      `INSERT INTO medical_requests
           (id, requester_id, created_by, patient_name, phone, request_type,
            required_item, blood_group, description, location, urgency, status, dispatched)
       VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open', 0)`,
      [id, req.user.id, req.user.full_name || req.user.name || 'Anonymous',
       req.user.phone || null, requestType || 'Blood', requiredItem,
       // For a blood request the required item IS the blood group; keeping
       // both columns populated lets the admin console filter on either.
       (requestType || 'Blood') === 'Blood' ? requiredItem : null,
       description || '', location, urgency || 'Urgent']
    );

    res.status(201).json({ success: true, data: { id }, message: 'Request broadcast to nearby donors' });
  } catch (err) {
    next(err);
  }
});

router.get('/donors', authenticate, async (req, res, next) => {
  try {
    const { bloodGroup, pincode } = req.query;
    const params = [];
    let sql = `
      SELECT d.id,
             d.blood_group,
             d.pincode,
             d.last_donated_at,
             COALESCE(u.full_name, 'Donor') AS full_name,
             u.phone
        FROM blood_donors d
        LEFT JOIN users u ON u.id = d.user_id
       WHERE COALESCE(d.is_available, 1) = 1`;

    if (bloodGroup) {
      params.push(bloodGroup);
      sql += ` AND d.blood_group = $${params.length}`;
    }
    if (pincode) {
      params.push(pincode);
      sql += ` AND d.pincode = $${params.length}`;
    }
    sql += ' ORDER BY d.blood_group ASC';

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows || result || [] });
  } catch (err) {
    next(err);
  }
});

router.post('/donors', authenticate, async (req, res, next) => {
  try {
    const { bloodGroup, pincode } = req.body;

    if (!bloodGroup || !String(bloodGroup).trim()) {
      return res.status(400).json({ success: false, error: 'bloodGroup is required' });
    }
    if (!pincode || !String(pincode).trim()) {
      return res.status(400).json({ success: false, error: 'pincode is required' });
    }

    const rewardEnabled = await isDonorRewardEnabled();

    const outcome = await withTransaction(async (client) => {
      // One register entry per user: re-registering updates the details
      // rather than creating a duplicate donor row (and must not pay the
      // joining reward a second time).
      // `society_id = NULL` is never true in SQL, so the public register is
      // matched with IS NULL rather than by binding the sentinel.
      const existing = await client.query(
        'SELECT id FROM blood_donors WHERE user_id = $1 AND society_id IS NULL',
        [req.user.id]
      );

      if ((existing.rows || []).length) {
        await client.query(
          'UPDATE blood_donors SET blood_group = $1, pincode = $2, is_available = 1 WHERE id = $3',
          [bloodGroup, pincode, existing.rows[0].id]
        );
        return { updated: true, rewarded: false };
      }

      await client.query(
        `INSERT INTO blood_donors (id, society_id, user_id, blood_group, pincode, is_available)
         VALUES ($1, $2, $3, $4, $5, 1)`,
        [crypto.randomUUID(), PUBLIC_DONOR_SCOPE, req.user.id, bloodGroup, pincode]
      );

      if (rewardEnabled) {
        await client.query(
          `INSERT INTO reward_coins_ledger (id, user_id, amount, transaction_type, description)
           VALUES ($1, $2, $3, 'credit', 'Blood donor registration')`,
          [crypto.randomUUID(), req.user.id, DONOR_REWARD_COINS]
        );
      }

      return { updated: false, rewarded: rewardEnabled };
    });

    res.status(outcome.updated ? 200 : 201).json({
      success: true,
      data: { rewarded: outcome.rewarded, rewardAmount: DONOR_REWARD_COINS },
      message: outcome.updated
        ? 'Your donor details have been updated.'
        : 'You are now on the donor register. Thank you!',
    });
  } catch (err) {
    next(err);
  }
});

// ─── Donor reward switch (admin) ────────────────────────────────────────────

async function isDonorRewardEnabled() {
  const row = await queryOne(
    'SELECT config_value FROM admin_config WHERE config_key = $1',
    [DONOR_REWARD_KEY]
  );
  // Default on: the screen advertises the reward, so an unset key should not
  // silently withhold it.
  return row ? row.config_value === 'true' : true;
}

router.get('/admin/reward-status', authenticate, async (req, res, next) => {
  try {
    res.json({ success: true, data: { enabled: await isDonorRewardEnabled() } });
  } catch (err) {
    next(err);
  }
});

router.post('/admin/reward-toggle', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const enabled = Boolean(req.body.enabled);

    const existing = await queryOne(
      'SELECT id FROM admin_config WHERE config_key = $1',
      [DONOR_REWARD_KEY]
    );

    if (existing) {
      await query(
        'UPDATE admin_config SET config_value = $1, updated_by = $2 WHERE config_key = $3',
        [String(enabled), req.user.id, DONOR_REWARD_KEY]
      );
    } else {
      await query(
        `INSERT INTO admin_config (id, config_key, config_value, config_category, is_active, updated_by)
         VALUES ($1, $2, $3, 'medical', 1, $4)`,
        [crypto.randomUUID(), DONOR_REWARD_KEY, String(enabled), req.user.id]
      );
    }

    res.json({
      success: true,
      data: { enabled },
      message: `Donor registration reward ${enabled ? 'enabled' : 'disabled'}.`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
