const { query } = require('../../../config/database');
const crypto = require('crypto');

exports.getRequests = async (req, res, next) => {
  try {
    let requests;
    try {
      const result = await query('SELECT * FROM medical_requests ORDER BY CASE WHEN urgency = \'Critical\' THEN 1 WHEN urgency = \'High\' THEN 2 ELSE 3 END, created_at DESC');
      requests = result.rows || result;
    } catch (e) {
      // Fallback if table doesn't exist yet
      requests = [];
    }
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

exports.createRequest = async (req, res, next) => {
  try {
    const { patient_name, phone, request_type, blood_group, urgency, location } = req.body;
    const adminId = req.user.id || req.user.userId;
    const newId = crypto.randomUUID();

    try {
      await query(`INSERT INTO medical_requests (id, patient_name, phone, request_type, blood_group, urgency, location, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [newId, patient_name, phone, request_type, blood_group, urgency, location, adminId]
      );
      
      await query(`INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), adminId, 'CREATE_MEDICAL_REQUEST', 'medical', newId, `Logged new ${request_type} emergency for ${patient_name}`]
      );
    } catch (e) {
      // Create table lazily if missing during early development phases
      if (e.message.includes('relation "medical_requests" does not exist') || e.message.includes('no such table')) {
        await query(`
          CREATE TABLE medical_requests (
            id VARCHAR(255) PRIMARY KEY,
            patient_name VARCHAR(255),
            phone VARCHAR(50),
            request_type VARCHAR(100),
            blood_group VARCHAR(10),
            urgency VARCHAR(50),
            location TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            dispatched BOOLEAN DEFAULT false,
            created_by VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await query(`INSERT INTO medical_requests (id, patient_name, phone, request_type, blood_group, urgency, location, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [newId, patient_name, phone, request_type, blood_group, urgency, location, adminId]
        );
      } else {
        throw e;
      }
    }

    res.json({ success: true, message: 'Emergency request logged successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await query('UPDATE medical_requests SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true, message: 'Request status updated' });
  } catch (error) {
    next(error);
  }
};

exports.toggleDispatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dispatched } = req.body;
    await query('UPDATE medical_requests SET dispatched = $1 WHERE id = $2', [dispatched, id]);
    res.json({ success: true, message: dispatched ? 'Resource dispatched' : 'Dispatch cancelled' });
  } catch (error) {
    next(error);
  }
};
