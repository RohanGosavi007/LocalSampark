const { query, queryOne } = require('../../../config/database');

async function logVisitor(req, res, next) {
  try {
    const { name, phone, purpose, host_flat } = req.body;
    // Mock gatekeeper user id for now
    const societyId = req.user?.society_id || 'SOC-123';
    
    // In real app, insert into society_visitors table
    const io = req.app.get('io');
    if (io) {
      // Trigger intercom alert to the resident's app
      io.to(`flat_${societyId}_${host_flat}`).emit('VISITOR_ALERT', {
        name, phone, purpose, timestamp: new Date()
      });
    }

    res.json({ success: true, message: 'Visitor logged, intercom alert sent' });
  } catch (error) { next(error); }
}

async function updateVisitorStatus(req, res, next) {
  try {
    const { visitorId, status } = req.body;
    // mock update
    res.json({ success: true, message: `Visitor ${status}` });
  } catch (error) { next(error); }
}

module.exports = {
  logVisitor,
  updateVisitorStatus
};