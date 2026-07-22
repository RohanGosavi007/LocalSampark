const { query } = require('../../../config/database');

/**
 * Get contacts (users the current user has chatted with)
 * If none, we can return some local shops as suggestions.
 */
const getContacts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Fetch distinct users from messages
    const contacts = await query(`
      SELECT DISTINCT 
        u.id, 
        u.full_name as name, 
        u.role 
      FROM users u
      JOIN messages m ON (m.sender_id = u.id OR m.receiver_id = u.id)
      WHERE (m.sender_id = $1 OR m.receiver_id = $1) AND u.id != $1
    `, [userId]);

    res.json({ success: true, data: contacts.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * Search users to initiate chat (Admin/Shop Owner only)
 */
const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const users = await query(`
      SELECT id, full_name as name, role 
      FROM users 
      WHERE full_name ILIKE $1
      LIMIT 10
    `, [`%${q}%`]);

    res.json({ success: true, data: users.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * Get chat history with a specific contact
 */
const getChatHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { contactId } = req.params;

    const history = await query(`
      SELECT * FROM messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC
    `, [userId, contactId]);

    // Mark as read
    await query(`
      UPDATE messages SET is_read = 1 
      WHERE receiver_id = $1 AND sender_id = $2 AND is_read = 0
    `, [userId, contactId]);

    res.json({ success: true, data: history.rows });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getContacts,
  getChatHistory,
  searchUsers
};
