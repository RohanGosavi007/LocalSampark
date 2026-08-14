const { query } = require('../../../config/database');
const crypto = require('crypto');

exports.getIssues = async (req, res, next) => {
  try {
    let issues;
    try {
      const result = await query("SELECT * FROM civic_issues ORDER BY CASE WHEN status = 'pending' THEN 1 WHEN status = 'in-progress' THEN 2 ELSE 3 END, created_at DESC");
      issues = result.rows || result;
    } catch (e) {
      issues = [];
    }
    res.json({ success: true, data: issues });
  } catch (error) {
    next(error);
  }
};

exports.createIssue = async (req, res, next) => {
  try {
    const { reporter_name, phone, category, issue_type, department, description } = req.body;
    const adminId = req.user.id || req.user.userId;
    const newId = crypto.randomUUID();

    try {
      await query(`INSERT INTO civic_issues (id, reporter_name, phone, category, issue_type, department, description, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [newId, reporter_name, phone, category, issue_type, department, description, adminId]
      );
      
      await query(`INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), adminId, 'LOG_CIVIC_ISSUE', category, newId, `Logged ${issue_type} complaint for ${reporter_name}`]
      );
    } catch (e) {
      if (e.message.includes('relation "civic_issues" does not exist') || e.message.includes('no such table')) {
        await query(`
          CREATE TABLE civic_issues (
            id VARCHAR(255) PRIMARY KEY,
            reporter_name VARCHAR(255),
            phone VARCHAR(50),
            category VARCHAR(50),
            issue_type VARCHAR(100),
            department VARCHAR(100),
            description TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            escalated BOOLEAN DEFAULT false,
            created_by VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await query(`INSERT INTO civic_issues (id, reporter_name, phone, category, issue_type, department, description, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [newId, reporter_name, phone, category, issue_type, department, description, adminId]
        );
      } else {
        throw e;
      }
    }

    res.json({ success: true, message: `${category} request logged successfully` });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await query('UPDATE civic_issues SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true, message: `Issue marked as ${status}` });
  } catch (error) {
    next(error);
  }
};

exports.toggleEscalation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { escalated } = req.body;
    const adminId = req.user.id || req.user.userId;
    
    await query('UPDATE civic_issues SET escalated = $1 WHERE id = $2', [escalated, id]);
    
    if (escalated) {
      try {
        await query(`INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [crypto.randomUUID(), adminId, 'ESCALATE_CIVIC_ISSUE', 'civic', id, 'Escalated issue directly to Government authorities']
        );
      } catch (err) {
        console.error('Failed to log audit:', err);
      }
    }

    res.json({ success: true, message: escalated ? 'Escalated to Govt' : 'Escalation reversed' });
  } catch (error) {
    next(error);
  }
};
