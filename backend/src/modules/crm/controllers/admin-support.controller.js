const { query, queryOne } = require('../../../config/database');

const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

// Ticket queue for the support dashboard. The `domain` the dashboard filters on is the
// ticket's category. A failed query is an error: this used to turn "the table could not
// be read" into an empty queue, which looks exactly like "nobody needs help".
exports.getTickets = async (req, res, next) => {
  try {
    const tickets = await query(
      `SELECT t.*, COALESCE(t.category, 'general') AS domain
         FROM support_tickets t
        ORDER BY t.created_at DESC
        LIMIT 500`
    );
    res.json({ success: true, data: tickets.rows || tickets });
  } catch (error) {
    next(error);
  }
};

// Said "Ticket marked as <anything>" whatever was sent and whether or not the ticket existed.
exports.updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!TICKET_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: `status must be one of: ${TICKET_STATUSES.join(', ')}` });
    }

    const result = await query(
      'UPDATE support_tickets SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );
    if (!result || !result.rowCount) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }
    res.json({ success: true, message: `Ticket marked as ${status}` });
  } catch (error) {
    next(error);
  }
};

const DEFAULT_AUTO_REPLY = {
  enabled: false,
  message: 'Thank you for reaching out. A support agent will review your ticket shortly.',
};

// The dashboard had no way to read the setting back, so it showed its own defaults
// after every reload whatever had been saved.
exports.getAutoReply = async (req, res, next) => {
  try {
    const row = await queryOne("SELECT config_value FROM admin_config WHERE config_key = 'support_auto_reply'");
    let value = DEFAULT_AUTO_REPLY;
    if (row && row.config_value) {
      try {
        const parsed = typeof row.config_value === 'string' ? JSON.parse(row.config_value) : row.config_value;
        value = { enabled: Boolean(parsed.enabled), message: String(parsed.message || DEFAULT_AUTO_REPLY.message) };
      } catch (e) { /* unreadable value: show the defaults */ }
    }
    res.json({ success: true, data: value });
  } catch (error) {
    next(error);
  }
};

exports.setAutoReply = async (req, res, next) => {
  try {
    const { enabled, message } = req.body || {};
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'enabled must be true or false' });
    }
    if (typeof message !== 'string' || !message.trim() || message.length > 1000) {
      return res.status(400).json({ success: false, error: 'message is required (up to 1000 characters)' });
    }

    await queryOne(`
      INSERT INTO admin_config (config_key, config_value, config_category, description, updated_by)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (config_key)
      DO UPDATE SET config_value = EXCLUDED.config_value,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      ['support_auto_reply', JSON.stringify({ enabled, message: message.trim() }), 'support', 'Global support auto-reply bot', req.user.id || req.user.userId]
    );

    res.json({ success: true, message: 'Auto-reply settings saved successfully' });
  } catch (error) {
    next(error);
  }
};
