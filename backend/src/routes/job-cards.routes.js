/**
 * JOB CARDS ROUTES — Archetype 4: Repair & Service Job Management
 * For: Auto Mechanics, AC/Appliance Repair, Mobile Repair, Plumbing, Electrical
 */
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

// ── GET /api/v1/job-cards/:shopId — Get all job cards for a shop ──
router.get('/:shopId', authenticate, async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM job_cards WHERE shop_id = $1`;
    const params = [shopId];

    if (status) {
      sql += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Status summary for dashboard counters
    const summary = await query(
      `SELECT status, COUNT(*) as count FROM job_cards WHERE shop_id = $1 GROUP BY status`,
      [shopId]
    );

    res.json({
      jobCards: result.rows || [],
      statusSummary: (summary.rows || []).reduce((acc, r) => { acc[r.status] = parseInt(r.count); return acc; }, {}),
      page: parseInt(page),
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/v1/job-cards/:shopId/:cardId — Get single job card with milestones ──
router.get('/:shopId/:cardId', authenticate, async (req, res, next) => {
  try {
    const { cardId } = req.params;

    const card = await query(`SELECT * FROM job_cards WHERE id = $1`, [cardId]);
    if (!card.rows?.length) {
      return res.status(404).json({ error: 'Job card not found' });
    }

    const milestones = await query(
      `SELECT * FROM job_card_milestones WHERE job_card_id = $1 ORDER BY step_order ASC`,
      [cardId]
    );

    const parts = await query(
      `SELECT * FROM job_card_parts WHERE job_card_id = $1 ORDER BY created_at ASC`,
      [cardId]
    );

    res.json({
      jobCard: card.rows[0],
      milestones: milestones.rows || [],
      parts: parts.rows || [],
    });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/v1/job-cards/:shopId — Create new job card ──
router.post('/:shopId', authenticate, async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const {
      customerName, customerPhone, vehicleInfo, deviceInfo,
      problemDescription, estimatedCost, estimatedCompletionDate,
      assignedTechnician, priority, photos
    } = req.body;

    const jobNumber = `JOB-${Date.now().toString(36).toUpperCase()}`;

    const result = await query(
      `INSERT INTO job_cards (shop_id, job_number, customer_name, customer_phone,
       vehicle_info, device_info, problem_description, estimated_cost,
       estimated_completion_date, assigned_technician, priority, photos,
       status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'received', NOW())
       RETURNING *`,
      [shopId, jobNumber, customerName, customerPhone || null,
       vehicleInfo || null, deviceInfo || null, problemDescription || '',
       estimatedCost || 0, estimatedCompletionDate || null,
       assignedTechnician || null, priority || 'normal',
       JSON.stringify(photos || [])]
    );

    // Auto-create default milestones based on common repair workflow
    const defaultMilestones = [
      { step: 1, title: 'Received', description: 'Item received for inspection' },
      { step: 2, title: 'Diagnosed', description: 'Problem identified and quote prepared' },
      { step: 3, title: 'Parts Ordered', description: 'Required parts ordered / sourced' },
      { step: 4, title: 'Repair In Progress', description: 'Technician working on repair' },
      { step: 5, title: 'Quality Check', description: 'Final testing and quality check' },
      { step: 6, title: 'Ready for Pickup', description: 'Repair complete, ready for customer' },
    ];

    for (const ms of defaultMilestones) {
      await query(
        `INSERT INTO job_card_milestones (job_card_id, step_order, title, description, status, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [result.rows[0].id, ms.step, ms.title, ms.description, ms.step === 1 ? 'completed' : 'pending']
      );
    }

    // Notify via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`shop_${shopId}`).emit('job_card:new', {
        jobNumber,
        customerName,
        problemDescription,
        priority,
      });
    }

    res.status(201).json({ success: true, jobCard: result.rows[0], jobNumber });
  } catch (error) {
    next(error);
  }
});

// ── PUT /api/v1/job-cards/:shopId/:cardId/status — Update job card status ──
router.put('/:shopId/:cardId/status', authenticate, async (req, res, next) => {
  try {
    const { shopId, cardId } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['received', 'diagnosed', 'waiting_parts', 'in_progress', 'quality_check', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    await query(
      `UPDATE job_cards SET status = $1, status_notes = $2, updated_at = NOW() WHERE id = $3`,
      [status, notes || null, cardId]
    );

    // Emit status change via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit(`order_status_${cardId}`, { status });
    }

    res.json({ success: true, status });
  } catch (error) {
    next(error);
  }
});

// ── PUT /api/v1/job-cards/:shopId/:cardId/milestone/:milestoneId — Update milestone ──
router.put('/:shopId/:cardId/milestone/:milestoneId', authenticate, async (req, res, next) => {
  try {
    const { milestoneId } = req.params;
    const { status, notes, photos, completedBy } = req.body;

    // Valid: pending, in_progress, completed, skipped
    await query(
      `UPDATE job_card_milestones SET status = $1, notes = $2, photos = $3,
       completed_by = $4, completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END,
       updated_at = NOW() WHERE id = $5`,
      [status, notes || null, JSON.stringify(photos || []), completedBy || null, milestoneId]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/v1/job-cards/:shopId/:cardId/parts — Add parts/labor to job card ──
router.post('/:shopId/:cardId/parts', authenticate, async (req, res, next) => {
  try {
    const { cardId } = req.params;
    const { partName, partType, quantity, unitCost, notes } = req.body;

    // partType: 'part' | 'labor' | 'consumable'
    const totalCost = (quantity || 1) * (unitCost || 0);

    await query(
      `INSERT INTO job_card_parts (job_card_id, part_name, part_type, quantity, unit_cost, total_cost, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [cardId, partName, partType || 'part', quantity || 1, unitCost || 0, totalCost, notes || null]
    );

    // Recalculate total cost on job card
    const partsTotal = await query(
      `SELECT COALESCE(SUM(total_cost), 0) as total FROM job_card_parts WHERE job_card_id = $1`,
      [cardId]
    );
    await query(
      `UPDATE job_cards SET actual_cost = $1, updated_at = NOW() WHERE id = $2`,
      [partsTotal.rows?.[0]?.total || 0, cardId]
    );

    res.json({ success: true, totalCost });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/v1/job-cards/:shopId/:cardId/photo — Upload photo proof ──
router.post('/:shopId/:cardId/photo', authenticate, async (req, res, next) => {
  try {
    const { cardId } = req.params;
    const { photoUrl, photoType, caption } = req.body;

    // photoType: 'before' | 'during' | 'after' | 'part' | 'damage'
    await query(
      `INSERT INTO job_card_photos (job_card_id, photo_url, photo_type, caption, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [cardId, photoUrl, photoType || 'during', caption || null]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/v1/job-cards/:shopId/:cardId/photos — Get all photos for a job card ──
router.get('/:shopId/:cardId/photos', authenticate, async (req, res, next) => {
  try {
    const { cardId } = req.params;

    const result = await query(
      `SELECT * FROM job_card_photos WHERE job_card_id = $1 ORDER BY created_at ASC`,
      [cardId]
    );

    res.json({ photos: result.rows || [] });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/v1/job-cards/:shopId/track/:jobNumber — Public tracking by job number ──
router.get('/:shopId/track/:jobNumber', async (req, res, next) => {
  try {
    const { jobNumber } = req.params;

    const card = await query(
      `SELECT id, job_number, customer_name, status, problem_description,
       estimated_cost, estimated_completion_date, created_at, updated_at
       FROM job_cards WHERE job_number = $1`,
      [jobNumber]
    );

    if (!card.rows?.length) {
      return res.status(404).json({ error: 'Job card not found' });
    }

    const milestones = await query(
      `SELECT step_order, title, description, status, completed_at
       FROM job_card_milestones WHERE job_card_id = $1 ORDER BY step_order ASC`,
      [card.rows[0].id]
    );

    res.json({
      jobCard: card.rows[0],
      milestones: milestones.rows || [],
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
