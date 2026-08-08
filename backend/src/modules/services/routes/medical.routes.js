const express = require('express');
const router = express.Router();
const { query, queryOne, withTransaction } = require('../../../../config/database');
const { authenticate } = require('../../../../middleware/auth.middleware');
const crypto = require('crypto');

// GET /doctors - Search doctors dynamically
router.get('/doctors', async (req, res, next) => {
  try {
    const { specialization, pincode } = req.query;
    let sql = 'SELECT * FROM medical_doctors WHERE is_available = 1';
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
        INSERT INTO wallet_transactions (id, wallet_id, amount, transaction_type, purpose, status)
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

module.exports = router;
