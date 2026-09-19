const crypto = require('crypto');
const { query, queryOne } = require('../../../config/database');
// NOW() is PostgreSQL-only; SQLite needs CURRENT_TIMESTAMP.
const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';

exports.getListings = async (req, res, next) => {
  try {
    const listings = await query(
      'SELECT * FROM admin_krishi_listings ORDER BY created_at DESC'
    ).then((r) => r.rows || r || []);
    res.json({ success: true, data: listings });
  } catch (error) {
    next(error);
  }
};

exports.createListing = async (req, res, next) => {
  try {
    const { title, description, price, type, auto_expire } = req.body;
    const adminId = req.user.id || req.user.userId;

    await query(
      `INSERT INTO admin_krishi_listings
         (id, seller_id, title, description, price, type, auto_expire, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', ${NOW})`,
      [crypto.randomUUID(), adminId, title, description || null, price || 0,
       type || null, auto_expire ? 1 : 0]
    );

    res.json({ success: true, message: 'Krishi listing published successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await query('UPDATE admin_krishi_listings SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true, message: `Listing status updated to ${status}` });
  } catch (error) {
    next(error);
  }
};

exports.toggleVerification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { verified_farmer } = req.body;
    await query(
      'UPDATE admin_krishi_listings SET verified_farmer = $1 WHERE id = $2',
      [verified_farmer ? 1 : 0, id]
    );
    res.json({ success: true, message: verified_farmer ? 'Farmer Verified' : 'Farmer Unverified' });
  } catch (error) {
    next(error);
  }
};
