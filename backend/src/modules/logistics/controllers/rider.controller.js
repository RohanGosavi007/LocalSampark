const { query, queryOne, queryMany } = require('../../../config/database');
const crypto = require('crypto');

// Get Rider Details
async function getRiderProfile(req, res, next) {
  try {
    const riderId = req.user?.id || req.params.id; // Mock simple auth
    const rider = await queryOne('SELECT * FROM delivery_riders WHERE id = ?', [riderId]);
    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });
    res.json({ success: true, rider });
  } catch (error) { next(error); }
}

// Update Rider Status (Online/Offline)
async function updateRiderStatus(req, res, next) {
  try {
    const { status } = req.body;
    const riderId = req.user?.id || req.params.id;
    await query('UPDATE delivery_riders SET status = ? WHERE id = ?', [status, riderId]);
    res.json({ success: true, message: 'Status updated' });
  } catch (error) { next(error); }
}

// Update Location
async function updateLocation(req, res, next) {
  try {
    const { latitude, longitude, order_id } = req.body;
    const riderId = req.user?.id || req.params.id;
    
    // Insert into live_tracking
    await query(
      'INSERT INTO live_tracking (rider_id, order_id, latitude, longitude) VALUES (?, ?, ?, ?)',
      [riderId, order_id || null, latitude, longitude]
    );

    // Broadcast live location to the order room via socket.io
    const io = req.app.get('io');
    if (io && order_id) {
      io.to(`order_${order_id}`).emit('RIDER_LOCATION_UPDATE', { latitude, longitude });
    }

    res.json({ success: true });
  } catch (error) { next(error); }
}

// Mock Rider Registration (For testing)
async function registerRider(req, res, next) {
  try {
    const { name, phone, vehicle_type, vehicle_number } = req.body;
    const id = `RIDER-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    await query(
      'INSERT INTO delivery_riders (id, name, phone, vehicle_type, vehicle_number, status) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, phone, vehicle_type || 'bike', vehicle_number || 'N/A', 'offline']
    );
    res.json({ success: true, rider: { id, name, phone } });
  } catch (error) { next(error); }
}

module.exports = {
  getRiderProfile,
  updateRiderStatus,
  updateLocation,
  registerRider
};
