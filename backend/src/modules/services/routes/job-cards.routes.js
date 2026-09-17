/**
 * JOB CARDS ROUTES â€” Archetype 4: Repair & Service Job Management
 * For: Auto Mechanics, AC/Appliance Repair, Mobile Repair, Plumbing, Electrical
 */
const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');

const ADMIN_ROLES = ['admin', 'super_admin'];

/**
 * The rows of a result, whichever driver produced it.
 *
 * The PostgreSQL client returns `{ rows: [...] }`; the SQLite layer returns the
 * array itself. This file assumed the first everywhere, so on SQLite every
 * listing here resolved to `[]` — job cards silently never appeared — and
 * `result.rows[0]` threw "Cannot read properties of undefined" on creation.
 * The rest of the codebase spells this `(r.rows || r)`; this gives it a name so
 * the next reader does not have to rediscover why.
 */
function rowsOf(result) {
  if (!result) return [];
  return Array.isArray(result) ? result : (result.rows || []);
}

/**
 * Confirms the caller may act on this shop's job cards.
 *
 * Every mutating route in this file was guarded by `authenticate` alone. The
 * shop id sits in the URL and nothing checked it against the caller, so any
 * signed-in account could create job cards in any garage, move any repair to
 * "completed", edit any milestone, and — through the parts route — add labour
 * charges to a stranger's bill. `authenticate` answers "is this a real user",
 * never "is this their shop".
 */
async function requireShopAccess(req, res, next) {
  try {
    const shop = await queryOne('SELECT id, owner_id FROM local_shops WHERE id = $1', [req.params.shopId]);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const role = String(req.user?.role || '').toLowerCase();
    if (ADMIN_ROLES.includes(role)) {
      req.shop = shop;
      return next();
    }

    if (String(shop.owner_id) !== String(req.user?.id)) {
      return res.status(403).json({ error: 'You do not manage this shop.' });
    }

    req.shop = shop;
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Loads the job card and proves it belongs to the shop in the URL.
 *
 * The routes took `cardId` straight from the path and updated by that id alone,
 * so the shop segment was decoration: any card id worked under any shop id.
 * Pairing them is what makes the ownership check above mean anything.
 */
async function loadCard(req, res, next) {
  try {
    const card = await queryOne(
      'SELECT * FROM job_cards WHERE id = $1 AND shop_id = $2',
      [req.params.cardId, req.params.shopId]
    );
    if (!card) return res.status(404).json({ error: 'Job card not found for this shop.' });
    req.jobCard = card;
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * The job card lifecycle.
 *
 * The status route accepted any value from the list in any order, so a
 * completed repair could be moved back to "received", a cancelled one revived,
 * and a job could jump straight from "received" to "ready" without anyone
 * having looked at it. Customers see this status, and so does the warranty
 * clock.
 *
 * Terminal states have no exits. Reopening a finished job is a new job card,
 * which is also what the customer's receipt and warranty need it to be.
 */
const JOB_STATUS_FLOW = Object.freeze({
  received:      ['diagnosed', 'cancelled'],
  diagnosed:     ['waiting_parts', 'in_progress', 'cancelled'],
  waiting_parts: ['in_progress', 'cancelled'],
  in_progress:   ['quality_check', 'waiting_parts', 'cancelled'],
  quality_check: ['ready', 'in_progress', 'cancelled'],
  ready:         ['completed', 'cancelled'],
  completed:     [],
  cancelled:     [],
});

const JOB_STATUSES = Object.keys(JOB_STATUS_FLOW);

const MILESTONE_STATUSES = Object.freeze(['pending', 'in_progress', 'completed', 'skipped']);

// â”€â”€ GET /api/v1/job-cards/:shopId â€” Get all job cards for a shop â”€â”€
router.get('/:shopId', authenticate, requireShopAccess, async (req, res, next) => {
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
    const summary = await query(`SELECT status, COUNT(*) as count FROM job_cards WHERE shop_id = $1 GROUP BY status`,
      [shopId]
    );

    res.json({
      jobCards: rowsOf(result),
      statusSummary: rowsOf(summary).reduce((acc, r) => { acc[r.status] = parseInt(r.count); return acc; }, {}),
      page: parseInt(page),
    });
  } catch (error) {
    next(error);
  }
});

// â”€â”€ GET /api/v1/job-cards/:shopId/:cardId â€” Get single job card with milestones â”€â”€
router.get('/:shopId/:cardId', authenticate, requireShopAccess, loadCard, async (req, res, next) => {
  try {
    const { cardId } = req.params;

    const card = await query(`SELECT * FROM job_cards WHERE id = $1`, [cardId]);
    const cardRows = rowsOf(card);
    if (cardRows.length === 0) {
      return res.status(404).json({ error: 'Job card not found' });
    }

    const milestones = await query(`SELECT * FROM job_card_milestones WHERE job_card_id = $1 ORDER BY step_order ASC`,
      [cardId]
    );

    const parts = await query(`SELECT * FROM job_card_parts WHERE job_card_id = $1 ORDER BY created_at ASC`,
      [cardId]
    );

    res.json({
      jobCard: cardRows[0],
      milestones: rowsOf(milestones),
      parts: rowsOf(parts),
    });
  } catch (error) {
    next(error);
  }
});

// â”€â”€ POST /api/v1/job-cards/:shopId â€” Create new job card â”€â”€
router.post('/:shopId', authenticate, requireShopAccess, async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const {
      customerName, customerPhone, vehicleInfo, deviceInfo,
      problemDescription, estimatedCost, estimatedCompletionDate,
      assignedTechnician, priority, photos
    } = req.body;

    if (!customerName || !String(customerName).trim()) {
      return res.status(400).json({ error: 'A customer name is required to open a job card.' });
    }

    const jobNumber = `JOB-${Date.now().toString(36).toUpperCase()}`;

    /**
     * `title` is NOT NULL and this INSERT never supplied it, so every attempt
     * to open a job card failed on the constraint and surfaced as a 500. The
     * repair archetype — garages, AC and appliance repair, mobile repair,
     * plumbing, electrical — could not create a job card at all.
     *
     * The caller may send one; otherwise it is derived from the problem
     * description, which is what a service advisor would write anyway, and
     * falls back to the job number so the column is never empty.
     */
    const jobTitle = (() => {
      const explicit = String(req.body.title || '').trim();
      if (explicit) return explicit.slice(0, 200);

      const derived = String(problemDescription || '').trim();
      if (derived) return derived.slice(0, 200);

      return `Job ${jobNumber}`;
    })();

    const result = await query(`INSERT INTO job_cards (shop_id, job_number, title, customer_name, customer_phone,
       vehicle_info, device_info, description, estimated_cost,
       estimated_completion_date, assigned_to, priority, photos,
       status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'received', NOW())
       RETURNING *`,
      [shopId, jobNumber, jobTitle, customerName, customerPhone || null,
       vehicleInfo || null, deviceInfo || null, problemDescription || '',
       estimatedCost || 0, estimatedCompletionDate || null,
       assignedTechnician || null, priority || 'normal',
       JSON.stringify(photos || [])]
    );

    const created = rowsOf(result)[0];
    if (!created) {
      // RETURNING gave nothing back, so there is no id to hang milestones on.
      // Failing here is honest; the previous code threw a TypeError one line
      // later and reported it as a 500 with no indication of the cause.
      return res.status(500).json({ error: 'The job card could not be created.' });
    }

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
      await query(`INSERT INTO job_card_milestones (job_card_id, step_order, title, description, status, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [created.id, ms.step, ms.title, ms.description, ms.step === 1 ? 'completed' : 'pending']
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

    res.status(201).json({ success: true, jobCard: created, jobNumber });
  } catch (error) {
    next(error);
  }
});

// â”€â”€ PUT /api/v1/job-cards/:shopId/:cardId/status â€” Update job card status â”€â”€
router.put('/:shopId/:cardId/status', authenticate, requireShopAccess, loadCard, async (req, res, next) => {
  try {
    const { shopId, cardId } = req.params;
    const { status, notes } = req.body;

    if (!JOB_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${JOB_STATUSES.join(', ')}` });
    }

    const current = req.jobCard.status || 'received';

    // Re-setting the same status is a no-op rather than an error: a retried
    // request from a patchy connection should not look like a rejected one.
    if (current !== status) {
      const allowed = JOB_STATUS_FLOW[current] || [];
      if (!allowed.includes(status)) {
        return res.status(409).json({
          error: `A job card cannot move from "${current}" to "${status}".`,
          code: 'INVALID_TRANSITION',
          current_status: current,
          allowed_next: allowed,
        });
      }
    }

    await query(`UPDATE job_cards SET status = $1, status_notes = $2, updated_at = NOW() WHERE id = $3 AND shop_id = $4`,
      [status, notes || null, cardId, shopId]
    );

    // Scoped to the people entitled to see it.
    //
    // This was `io.emit(...)`, which broadcasts to every connected client on
    // the platform — every customer of every other shop received every job
    // card's status changes, carrying the card id. Socket.io rooms exist for
    // exactly this, and the HTTP side of this file is scoped, so the socket
    // side leaking was the wider hole of the two.
    const io = req.app.get('io');
    if (io) {
      io.to(`job_card_${cardId}`).emit(`order_status_${cardId}`, { status });
      io.to(`shop_${shopId}`).emit('job_card_status', { card_id: cardId, status });
    }

    res.json({ success: true, status, previous_status: current });
  } catch (error) {
    next(error);
  }
});

// â”€â”€ PUT /api/v1/job-cards/:shopId/:cardId/milestone/:milestoneId â€” Update milestone â”€â”€
router.put('/:shopId/:cardId/milestone/:milestoneId', authenticate, requireShopAccess, loadCard, async (req, res, next) => {
  try {
    const { cardId, milestoneId } = req.params;
    const { status, notes, photos, completedBy } = req.body;

    // The vocabulary was stated in a comment and enforced nowhere, so any
    // string at all could be written into a milestone's status — including one
    // the progress UI has no case for, which then renders as nothing.
    if (!MILESTONE_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid milestone status. Must be one of: ${MILESTONE_STATUSES.join(', ')}`,
      });
    }

    // Scoped to the card, which is itself scoped to the shop. Updating by
    // milestone id alone let any milestone on the platform be edited from any
    // shop's URL.
    const milestone = await queryOne(
      'SELECT id FROM job_card_milestones WHERE id = $1 AND job_card_id = $2',
      [milestoneId, cardId]
    );
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found on this job card.' });
    }

    await query(`UPDATE job_card_milestones SET status = $1, notes = $2, photos = $3,
       completed_by = $4, completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END,
       updated_at = NOW() WHERE id = $5 AND job_card_id = $6`,
      [status, notes || null, JSON.stringify(photos || []), completedBy || null, milestoneId, cardId]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// â”€â”€ POST /api/v1/job-cards/:shopId/:cardId/parts â€” Add parts/labor to job card â”€â”€
router.post('/:shopId/:cardId/parts', authenticate, requireShopAccess, loadCard, async (req, res, next) => {
  try {
    const { cardId } = req.params;
    const { partName, partType, quantity, unitCost, notes } = req.body;

    // partType: 'part' | 'labor' | 'consumable'
    const totalCost = (quantity || 1) * (unitCost || 0);

    await query(`INSERT INTO job_card_parts (job_card_id, part_name, part_type, quantity, unit_cost, total_cost, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [cardId, partName, partType || 'part', quantity || 1, unitCost || 0, totalCost, notes || null]
    );

    // Recalculate total cost on job card
    const partsTotal = await query(`SELECT COALESCE(SUM(total_cost), 0) as total FROM job_card_parts WHERE job_card_id = $1`,
      [cardId]
    );
    await query(`UPDATE job_cards SET final_cost = $1, updated_at = NOW() WHERE id = $2`,
      [rowsOf(partsTotal)[0]?.total || 0, cardId]
    );

    res.json({ success: true, totalCost });
  } catch (error) {
    next(error);
  }
});

// â”€â”€ POST /api/v1/job-cards/:shopId/:cardId/photo â€” Upload photo proof â”€â”€
router.post('/:shopId/:cardId/photo', authenticate, requireShopAccess, loadCard, async (req, res, next) => {
  try {
    const { cardId } = req.params;
    const { photoUrl, photoType, caption } = req.body;

    // photoType: 'before' | 'during' | 'after' | 'part' | 'damage'
    await query(`INSERT INTO job_card_photos (job_card_id, photo_url, photo_type, caption, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [cardId, photoUrl, photoType || 'during', caption || null]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// â”€â”€ GET /api/v1/job-cards/:shopId/:cardId/photos â€” Get all photos for a job card â”€â”€
router.get('/:shopId/:cardId/photos', authenticate, requireShopAccess, loadCard, async (req, res, next) => {
  try {
    const { cardId } = req.params;

    const result = await query(`SELECT * FROM job_card_photos WHERE job_card_id = $1 ORDER BY created_at ASC`,
      [cardId]
    );

    res.json({ photos: result.rows || [] });
  } catch (error) {
    next(error);
  }
});

// â”€â”€ GET /api/v1/job-cards/:shopId/track/:jobNumber â€” Public tracking by job number â”€â”€
router.get('/:shopId/track/:jobNumber', async (req, res, next) => {
  try {
    const { shopId, jobNumber } = req.params;

    // Scoped to the shop in the URL.
    //
    // `shopId` was destructured away and never used: the lookup ran on
    // job_number alone. Job numbers are `JOB-` plus a base-36 timestamp, so
    // they are sequential and guessable, and this route is deliberately
    // unauthenticated — the customer follows a tracking link. Unscoped, anyone
    // could walk the number space and read customer names off every repair job
    // on the platform.
    const cardResult = await query(`SELECT id, job_number, customer_name, status, description,
       estimated_cost, estimated_completion_date, created_at, updated_at
       FROM job_cards WHERE job_number = $1 AND shop_id = $2`,
      [jobNumber, shopId]
    );

    // Both row shapes. The PostgreSQL driver returns `{ rows: [...] }` and the
    // SQLite layer returns the array itself, so `card.rows?.length` was
    // undefined on SQLite and this endpoint answered 404 for every job that
    // existed — customer-facing tracking was simply dead there.
    const cardRows = rowsOf(cardResult);
    if (cardRows.length === 0) {
      return res.status(404).json({ error: 'Job card not found' });
    }

    const milestoneResult = await query(`SELECT step_order, title, description, status, completed_at
       FROM job_card_milestones WHERE job_card_id = $1 ORDER BY step_order ASC`,
      [cardRows[0].id]
    );

    res.json({
      jobCard: cardRows[0],
      milestones: rowsOf(milestoneResult),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
