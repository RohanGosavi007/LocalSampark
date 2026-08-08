/**
 * LEADS CRM ROUTES — Archetype 6: Hyperlocal Directory & Community Leads
 * For: Real Estate, Matrimony, Local Jobs, Scrap/Kabadi, Krishi Mandi, Community Volunteer Hubs
 */
const express = require('express');
const router = express.Router();
const { query } = require('../../../../config/database');
const { authenticate } = require('../../../../middleware/auth.middleware');

// ── GET /api/v1/leads-crm/:shopId — Get all leads for a shop ──
router.get('/:shopId', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;
    const { status, stage, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM leads WHERE shop_id = $1`;
    const params = [shopId];

    if (status) {
      sql += ` AND status = $${params.length + 1}`;
      params.push(status);
    }
    if (stage) {
      sql += ` AND pipeline_stage = $${params.length + 1}`;
      params.push(stage);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Pipeline stage counts
    const pipeline = await query(
      `SELECT pipeline_stage, COUNT(*) as count FROM leads WHERE shop_id = $1 AND status = 'active' GROUP BY pipeline_stage`,
      [shopId]
    );

    res.json({
      leads: result.rows || [],
      pipeline: (pipeline.rows || []).reduce((acc, r) => { acc[r.pipeline_stage] = parseInt(r.count); return acc; }, {}),
      page: parseInt(page),
    });
  } catch (error) {
    console.error('Leads fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// ── POST /api/v1/leads-crm/:shopId — Create new lead (visitor inquiry) ──
router.post('/:shopId', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;
    const {
      name, phone, email, source, inquiryType,
      message, budget, location, propertyType,
      userId, referredBy
    } = req.body;

    const leadNumber = `LEAD-${Date.now().toString(36).toUpperCase()}`;

    const result = await query(
      `INSERT INTO leads (shop_id, lead_number, name, phone, email, source, inquiry_type,
       message, budget, location, property_type, user_id, referred_by,
       pipeline_stage, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'new', 'active', NOW())
       RETURNING *`,
      [shopId, leadNumber, name, phone || null, email || null,
       source || 'website', inquiryType || 'general', message || null,
       budget || null, location || null, propertyType || null,
       userId || null, referredBy || null]
    );

    // Notify merchant
    const io = req.app.get('io');
    if (io) {
      io.to(`shop:${shopId}`).emit('lead:new', {
        leadNumber,
        name,
        inquiryType,
        message,
        sound: 'new_order_chime',
      });
    }

    res.status(201).json({ success: true, lead: result.rows[0], leadNumber });
  } catch (error) {
    console.error('Lead create error:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// ── PUT /api/v1/leads-crm/:shopId/:leadId/stage — Move lead through pipeline ──
router.put('/:shopId/:leadId/stage', authenticate, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { stage, notes } = req.body;

    // Valid stages: new, contacted, qualified, negotiation, won, lost
    const validStages = ['new', 'contacted', 'qualified', 'negotiation', 'site_visit', 'proposal_sent', 'won', 'lost'];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ error: `Invalid stage. Must be one of: ${validStages.join(', ')}` });
    }

    await query(
      `UPDATE leads SET pipeline_stage = $1, updated_at = NOW() WHERE id = $2`,
      [stage, leadId]
    );

    // Add activity log
    if (notes) {
      await query(
        `INSERT INTO lead_activities (lead_id, activity_type, notes, created_by, created_at)
         VALUES ($1, 'stage_change', $2, $3, NOW())`,
        [leadId, `Moved to ${stage}: ${notes}`, req.user?.id || null]
      );
    }

    if (stage === 'won' || stage === 'lost') {
      await query(`UPDATE leads SET status = $1 WHERE id = $2`, [stage === 'won' ? 'converted' : 'lost', leadId]);
    }

    res.json({ success: true, stage });
  } catch (error) {
    console.error('Lead stage update error:', error);
    res.status(500).json({ error: 'Failed to update lead stage' });
  }
});

// ── POST /api/v1/leads-crm/:shopId/:leadId/activity — Add activity/call log ──
router.post('/:shopId/:leadId/activity', authenticate, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { activityType, notes, callDuration, nextFollowUp } = req.body;

    // Valid types: call, whatsapp, email, site_visit, meeting, note
    await query(
      `INSERT INTO lead_activities (lead_id, activity_type, notes, call_duration, next_follow_up, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [leadId, activityType || 'note', notes, callDuration || null,
       nextFollowUp || null, req.user?.id || null]
    );

    // Update lead's last contact date
    await query(`UPDATE leads SET last_contacted_at = NOW(), updated_at = NOW() WHERE id = $1`, [leadId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Lead activity error:', error);
    res.status(500).json({ error: 'Failed to add activity' });
  }
});

// ── GET /api/v1/leads-crm/:shopId/:leadId/activities — Get lead activity history ──
router.get('/:shopId/:leadId/activities', authenticate, async (req, res) => {
  try {
    const { leadId } = req.params;

    const result = await query(
      `SELECT * FROM lead_activities WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [leadId]
    );

    res.json({ activities: result.rows || [] });
  } catch (error) {
    console.error('Lead activities fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// ── GET /api/v1/leads-crm/:shopId/stats — Lead analytics ──
router.get('/:shopId/stats', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;

    const totalLeads = await query(`SELECT COUNT(*) as count FROM leads WHERE shop_id = $1`, [shopId]);
    const activeLeads = await query(`SELECT COUNT(*) as count FROM leads WHERE shop_id = $1 AND status = 'active'`, [shopId]);
    const convertedLeads = await query(`SELECT COUNT(*) as count FROM leads WHERE shop_id = $1 AND status = 'converted'`, [shopId]);
    const todayLeads = await query(
      `SELECT COUNT(*) as count FROM leads WHERE shop_id = $1 AND DATE(created_at) = CURRENT_DATE`, [shopId]
    );

    // Follow-ups due today
    const followUpsDue = await query(
      `SELECT la.*, l.name as lead_name, l.phone as lead_phone
       FROM lead_activities la
       JOIN leads l ON la.lead_id = l.id
       WHERE l.shop_id = $1 AND DATE(la.next_follow_up) = CURRENT_DATE
       ORDER BY la.next_follow_up ASC`,
      [shopId]
    );

    res.json({
      total: parseInt(totalLeads.rows?.[0]?.count || 0),
      active: parseInt(activeLeads.rows?.[0]?.count || 0),
      converted: parseInt(convertedLeads.rows?.[0]?.count || 0),
      today: parseInt(todayLeads.rows?.[0]?.count || 0),
      conversionRate: totalLeads.rows?.[0]?.count > 0
        ? ((convertedLeads.rows?.[0]?.count / totalLeads.rows?.[0]?.count) * 100).toFixed(1) + '%'
        : '0%',
      followUpsDue: followUpsDue.rows || [],
    });
  } catch (error) {
    console.error('Lead stats error:', error);
    res.status(500).json({ error: 'Failed to fetch lead stats' });
  }
});

// ── GET /api/v1/leads-crm/:shopId/listings — Public listings (for directory archetype) ──
router.get('/:shopId/listings', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;
    const { type, minBudget, maxBudget, location } = req.query;

    let sql = `SELECT id, title, description, listing_type, price, location, photos, features, contact_whatsapp, contact_phone, is_featured, created_at
               FROM directory_listings WHERE shop_id = $1 AND status = 'active'`;
    const params = [shopId];

    if (type) {
      sql += ` AND listing_type = $${params.length + 1}`;
      params.push(type);
    }
    if (minBudget) {
      sql += ` AND price >= $${params.length + 1}`;
      params.push(minBudget);
    }
    if (maxBudget) {
      sql += ` AND price <= $${params.length + 1}`;
      params.push(maxBudget);
    }
    if (location) {
      sql += ` AND location ILIKE $${params.length + 1}`;
      params.push(`%${location}%`);
    }

    sql += ` ORDER BY is_featured DESC, created_at DESC`;
    const result = await query(sql, params);

    res.json({ listings: result.rows || [] });
  } catch (error) {
    console.error('Listings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

module.exports = router;
