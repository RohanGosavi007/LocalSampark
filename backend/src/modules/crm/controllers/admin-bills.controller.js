const { query } = require('../../../../config/database');
const crypto = require('crypto');

exports.getBills = async (req, res, next) => {
  try {
    let bills;
    try {
      const result = await query("SELECT * FROM utility_bills ORDER BY CASE WHEN status = 'pending' THEN 1 WHEN status = 'processing' THEN 2 WHEN status = 'failed' THEN 3 ELSE 4 END, created_at DESC");
      bills = result.rows || result;
    } catch (e) {
      bills = [];
    }
    res.json({ success: true, data: bills });
  } catch (error) {
    next(error);
  }
};

exports.createBill = async (req, res, next) => {
  try {
    const { customer_name, phone, provider_type, consumer_number, amount } = req.body;
    const adminId = req.user.id || req.user.userId;
    const newId = crypto.randomUUID();

    try {
      await query(`INSERT INTO utility_bills (id, customer_name, phone, provider_type, consumer_number, amount, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newId, customer_name, phone, provider_type, consumer_number, amount, adminId]
      );
      
      await query(`INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), adminId, 'CREATE_BILL_PAYMENT', 'financial', newId, \`Initiated \${provider_type} payment of ₹\${amount} for \${customer_name}\`]
      );
    } catch (e) {
      if (e.message.includes('relation "utility_bills" does not exist') || e.message.includes('no such table')) {
        await query(\`
          CREATE TABLE utility_bills (
            id VARCHAR(255) PRIMARY KEY,
            customer_name VARCHAR(255),
            phone VARCHAR(50),
            provider_type VARCHAR(100),
            consumer_number VARCHAR(100),
            amount DECIMAL(10,2),
            status VARCHAR(50) DEFAULT 'pending',
            payment_cleared BOOLEAN DEFAULT false,
            created_by VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        \`);
        await query(`INSERT INTO utility_bills (id, customer_name, phone, provider_type, consumer_number, amount, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [newId, customer_name, phone, provider_type, consumer_number, amount, adminId]
        );
      } else {
        throw e;
      }
    }

    res.json({ success: true, message: 'Utility bill payment requested' });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await query('UPDATE utility_bills SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true, message: 'Payment status updated' });
  } catch (error) {
    next(error);
  }
};

exports.toggleClearance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payment_cleared } = req.body;
    await query('UPDATE utility_bills SET payment_cleared = $1 WHERE id = $2', [payment_cleared, id]);
    res.json({ success: true, message: payment_cleared ? 'Cleared with Biller' : 'Clearance removed' });
  } catch (error) {
    next(error);
  }
};
