const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, queryOne } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const { isFullAdmin } = require('../../../../../packages/shared/src/roles');

const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';

// GET /support/grievance-officer - Statutory Grievance Redressal Information (Public)
router.get('/grievance-officer', (req, res) => {
  res.json({
    success: true,
    statutoryCompliance: 'Consumer Protection (E-Commerce) Rules, 2020',
    grievanceOfficer: {
      name: 'Rohan Gosavi',
      designation: 'Grievance Redressal Officer',
      organization: 'LocalSampark Technologies Private Limited',
      address: 'Lane 4, Dhanori, Pune, Maharashtra - 411015, India',
      email: 'grievance@localsampark.com',
      phone: '+91-20-88887777',
      slaHoursAcknowledgement: 48,
      slaDaysResolution: 30,
      supportHours: 'Monday to Friday, 10:00 AM - 06:00 PM IST'
    }
  });
});

// POST /support/tickets - Submit support ticket or statutory grievance
router.post('/tickets', authenticate, async (req, res, next) => {
  try {
    const { orderId, subject, description, category = 'general', isStatutory = false } = req.body || {};
    const userId = req.user.id || req.user.userId;

    if (!subject || !description) {
      return res.status(400).json({ success: false, error: 'subject and description are required' });
    }

    const ticketId = crypto.randomUUID();
    const isStatutoryBool = Boolean(isStatutory);
    const priority = isStatutoryBool ? 'high' : 'medium';
    const officer = isStatutoryBool ? 'Rohan Gosavi (Grievance Officer)' : null;

    // In SQLite is_statutory is INTEGER (1/0), in Postgres it is BOOLEAN (true/false)
    const isStatutoryParam = process.env.USE_SQLITE === 'true' ? (isStatutoryBool ? 1 : 0) : isStatutoryBool;

    await query(
      `INSERT INTO support_tickets
         (id, user_id, subject, description, category, priority, status, is_statutory, acknowledged_at, grievance_officer, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, ${NOW}, $8, ${NOW}, ${NOW})`,
      [ticketId, userId, String(subject).trim(), String(description).trim(), String(category).toLowerCase(), priority, isStatutoryParam, officer]
    );

    const ticket = await queryOne('SELECT * FROM support_tickets WHERE id = $1', [ticketId]);

    // Calculate statutory 30-day resolution deadline
    const createdAtTime = new Date(ticket.created_at || Date.now()).getTime();
    const slaDueAt = new Date(createdAtTime + (30 * 24 * 60 * 60 * 1000)).toISOString();

    res.status(201).json({
      success: true,
      message: isStatutoryBool ? 'Statutory grievance registered and acknowledged' : 'Support ticket created successfully',
      ticket: {
        id: ticket.id,
        orderId: orderId || null,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        isStatutory: isStatutoryBool,
        acknowledgedAt: ticket.acknowledged_at,
        grievanceOfficer: ticket.grievance_officer,
        slaDueAt,
        createdAt: ticket.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /support/tickets/my - User's own tickets
router.get('/tickets/my', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const tickets = await query(
      'SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );

    res.json({ success: true, tickets: tickets.rows || tickets || [] });
  } catch (error) {
    next(error);
  }
});

// GET /support/tickets/:id - Ticket inspection with statutory SLA countdown
router.get('/tickets/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await queryOne('SELECT * FROM support_tickets WHERE id = $1', [id]);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Support ticket not found' });
    }

    const requesterId = req.user.id || req.user.userId;
    const isStaff = isFullAdmin(req.user.role) || req.user.isSuperAdmin || ['admin', 'super_admin', 'moderator'].includes(String(req.user.role || '').toLowerCase());

    if (!isStaff && String(ticket.user_id) !== String(requesterId)) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this ticket' });
    }

    const createdAtTime = new Date(ticket.created_at || Date.now()).getTime();
    const slaDueAt = new Date(createdAtTime + (30 * 24 * 60 * 60 * 1000)).toISOString();
    const isAcknowledged = Boolean(ticket.acknowledged_at);

    res.json({
      success: true,
      ticket: {
        ...ticket,
        isStatutory: Boolean(ticket.is_statutory),
        isAcknowledged,
        slaDueAt
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
