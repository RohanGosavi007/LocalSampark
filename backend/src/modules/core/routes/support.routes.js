const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, queryOne } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const { isFullAdmin } = require('../../../../../packages/shared/src/roles');

const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';
const CATEGORIES = [
  'order', 'order_issue', 'payment', 'refund', 'delivery', 'account', 'billing', 'quality',
  'safety', 'safety_statutory', 'feedback', 'legal', 'general',
  // The statutory grievance form (apps/web/src/app/legal/grievance) sends these.
  'order_dispute', 'refund_issue', 'merchant_fraud', 'data_privacy', 'other',
];
const ACK_HOURS = 48;
const RESOLUTION_DAYS = 30;

/**
 * The statutory Grievance Officer (Consumer Protection (E-Commerce) Rules,
 * 2020, rule 4(4)). These are facts about the company, so they come from the
 * environment (GRIEVANCE_OFFICER_*), not code. The previous values were
 * written into this file; the defaults below are those values, kept so the
 * page does not go blank, and launch-readiness lists confirming them as an
 * owner task (FINDINGS F-146).
 */
function grievanceOfficer() {
  const env = process.env;
  return {
    name: env.GRIEVANCE_OFFICER_NAME || 'Rohan Gosavi',
    designation: env.GRIEVANCE_OFFICER_DESIGNATION || 'Grievance Redressal Officer',
    organization: env.GRIEVANCE_OFFICER_ORGANIZATION || 'LocalSampark Technologies Private Limited',
    address: env.GRIEVANCE_OFFICER_ADDRESS || 'Lane 4, Dhanori, Pune, Maharashtra - 411015, India',
    email: env.GRIEVANCE_OFFICER_EMAIL || 'grievance@localsampark.com',
    phone: env.GRIEVANCE_OFFICER_PHONE || '+91-20-88887777',
    slaHoursAcknowledgement: ACK_HOURS,
    slaDaysResolution: RESOLUTION_DAYS,
    supportHours: env.GRIEVANCE_OFFICER_HOURS || 'Monday to Friday, 10:00 AM - 06:00 PM IST',
  };
}

const slaDueAt = (createdAt) =>
  new Date(new Date(createdAt || Date.now()).getTime() + RESOLUTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

/** The ticket as the customer sees it. */
function present(t) {
  return {
    id: t.id,
    orderId: t.order_id || null,
    subject: t.subject,
    description: t.description,
    category: t.category,
    priority: t.priority,
    status: t.status,
    isStatutory: t.is_statutory === true || t.is_statutory === 1 || t.is_statutory === '1' || t.is_statutory === 'true',
    acknowledgedAt: t.acknowledged_at || null,
    grievanceOfficer: t.grievance_officer || null,
    resolution: t.resolution || null,
    resolvedAt: t.resolved_at || null,
    slaDueAt: slaDueAt(t.created_at),
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

// GET /support/grievance-officer - Statutory Grievance Redressal Information (Public)
router.get('/grievance-officer', (req, res) => {
  res.json({
    success: true,
    statutoryCompliance: 'Consumer Protection (E-Commerce) Rules, 2020',
    grievanceOfficer: grievanceOfficer(),
  });
});

// POST /support/tickets - Submit support ticket or statutory grievance
router.post('/tickets', authenticate, async (req, res, next) => {
  try {
    const { orderId, subject, description, category = 'general', isStatutory = false } = req.body || {};
    const userId = req.user.id || req.user.userId;

    const cleanSubject = String(subject || '').trim();
    const cleanDescription = String(description || '').trim();
    if (!cleanSubject || !cleanDescription) {
      return res.status(400).json({ success: false, error: 'subject and description are required' });
    }
    if (cleanSubject.length > 200 || cleanDescription.length > 5000) {
      return res.status(400).json({ success: false, error: 'subject must be at most 200 characters and description at most 5000' });
    }
    const cleanCategory = String(category).toLowerCase();
    if (!CATEGORIES.includes(cleanCategory)) {
      return res.status(400).json({ success: false, error: `category must be one of ${CATEGORIES.join(', ')}` });
    }

    // The order a ticket is about used to be accepted and thrown away. It is
    // kept now (migration 137), and only for the customer's own order, so a
    // ticket cannot be pinned to someone else's.
    let order = null;
    if (orderId) {
      order = await queryOne('SELECT id, user_id FROM orders WHERE CAST(id AS TEXT) = $1', [String(orderId)]);
      if (!order || String(order.user_id) !== String(userId)) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
    }

    const ticketId = crypto.randomUUID();
    const isStatutoryBool = isStatutory === true || isStatutory === 'true' || isStatutory === 1;
    const priority = isStatutoryBool || cleanCategory === 'order' ? 'high' : 'medium';
    const officer = isStatutoryBool ? `${grievanceOfficer().name} (Grievance Officer)` : null;

    // In SQLite is_statutory is INTEGER (1/0), in Postgres it is BOOLEAN (true/false)
    const isStatutoryParam = process.env.USE_SQLITE === 'true' ? (isStatutoryBool ? 1 : 0) : isStatutoryBool;

    // The ticket number is the acknowledgement the Rules require within 48
    // hours; it is issued on receipt.
    await query(
      `INSERT INTO support_tickets
         (id, user_id, order_id, subject, description, category, priority, status, is_statutory, acknowledged_at, grievance_officer, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8, ${NOW}, $9, ${NOW}, ${NOW})`,
      [ticketId, userId, order ? String(order.id) : null, cleanSubject, cleanDescription, cleanCategory, priority, isStatutoryParam, officer]
    );

    const ticket = await queryOne('SELECT * FROM support_tickets WHERE id = $1', [ticketId]);

    res.status(201).json({
      success: true,
      message: isStatutoryBool ? 'Statutory grievance registered and acknowledged' : 'Support ticket created successfully',
      ticket: present(ticket),
    });
  } catch (error) {
    next(error);
  }
});

// GET /support/tickets/my - User's own tickets, with the support team's answer
router.get('/tickets/my', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id || req.user.userId;
    const tickets = await query(
      'SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );

    res.json({ success: true, tickets: (tickets.rows || tickets || []).map(present) });
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

    res.json({
      success: true,
      ticket: {
        ...ticket,
        ...present(ticket),
        isAcknowledged: Boolean(ticket.acknowledged_at),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports.CATEGORIES = CATEGORIES;
