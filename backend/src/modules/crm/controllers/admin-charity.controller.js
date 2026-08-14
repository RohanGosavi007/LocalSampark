const { query } = require('../../../../config/database');
const crypto = require('crypto');

exports.getCampaigns = async (req, res, next) => {
  try {
    let campaigns;
    try {
      const result = await query('SELECT * FROM charity_campaigns ORDER BY created_at DESC');
      campaigns = result.rows || result;
    } catch (e) {
      campaigns = [];
    }
    res.json({ success: true, data: campaigns });
  } catch (error) {
    next(error);
  }
};

exports.createCampaign = async (req, res, next) => {
  try {
    const { ngo_name, title, goal_amount } = req.body;
    const adminId = req.user.id || req.user.userId;
    const newId = crypto.randomUUID();

    try {
      await query(`INSERT INTO charity_campaigns (id, ngo_name, title, goal_amount, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [newId, ngo_name, title, goal_amount, adminId]
      );
      
      await query(`INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), adminId, 'CREATE_CHARITY_CAMPAIGN', 'charity', newId, \`Launched campaign: \${title} for \${ngo_name}\`]
      );
    } catch (e) {
      if (e.message.includes('relation "charity_campaigns" does not exist') || e.message.includes('no such table')) {
        await query(\`
          CREATE TABLE charity_campaigns (
            id VARCHAR(255) PRIMARY KEY,
            ngo_name VARCHAR(255),
            title VARCHAR(255),
            goal_amount DECIMAL(12,2) DEFAULT 0,
            raised_amount DECIMAL(12,2) DEFAULT 0,
            status VARCHAR(50) DEFAULT 'active',
            verified_ngo BOOLEAN DEFAULT false,
            created_by VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        \`);
        await query(`INSERT INTO charity_campaigns (id, ngo_name, title, goal_amount, created_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [newId, ngo_name, title, goal_amount, adminId]
        );
      } else {
        throw e;
      }
    }

    res.json({ success: true, message: 'Charity campaign launched successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await query('UPDATE charity_campaigns SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true, message: 'Campaign status updated' });
  } catch (error) {
    next(error);
  }
};

exports.toggleVerification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { verified_ngo } = req.body;
    await query('UPDATE charity_campaigns SET verified_ngo = $1 WHERE id = $2', [verified_ngo, id]);
    res.json({ success: true, message: verified_ngo ? 'NGO Verified' : 'Verification removed' });
  } catch (error) {
    next(error);
  }
};

exports.adjustRaised = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { raised_amount } = req.body;
    await query('UPDATE charity_campaigns SET raised_amount = $1 WHERE id = $2', [raised_amount, id]);
    res.json({ success: true, message: 'Raised amount adjusted' });
  } catch (error) {
    next(error);
  }
};
