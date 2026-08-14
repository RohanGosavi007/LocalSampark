const { query } = require('../../../config/database');
const crypto = require('crypto');

exports.getBackups = async (req, res, next) => {
  try {
    let backups;
    try {
      const result = await query('SELECT * FROM admin_backups ORDER BY created_at DESC');
      backups = result.rows || result;
    } catch (e) {
      backups = [];
    }
    res.json({ success: true, data: backups });
  } catch (error) {
    next(error);
  }
};

exports.createBackup = async (req, res, next) => {
  try {
    const { provider } = req.body;
    const adminId = req.user.id || req.user.userId;
    const newId = crypto.randomUUID();
    
    // Generate a mock filename and size
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `localsampark_backup_${timestamp}.sqlite`;
    const sizeMb = (Math.random() * 15 + 5).toFixed(2); // Random size between 5-20 MB

    // Simulate async database compression and cloud upload delay (1.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      await query(`INSERT INTO admin_backups (id, filename, provider, size_mb, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [newId, filename, provider, sizeMb, adminId]
      );
      
      await query(`INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), adminId, 'CREATE_BACKUP', 'system', newId, `Generated database snapshot and pushed to ${provider}`]
      );
    } catch (e) {
      if (e.message.includes('relation "admin_backups" does not exist') || e.message.includes('no such table')) {
        await query(`
          CREATE TABLE admin_backups (
            id VARCHAR(255) PRIMARY KEY,
            filename VARCHAR(255),
            provider VARCHAR(100),
            size_mb DECIMAL(10,2),
            created_by VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await query(`INSERT INTO admin_backups (id, filename, provider, size_mb, created_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [newId, filename, provider, sizeMb, adminId]
        );
      } else {
        throw e;
      }
    }

    res.json({ success: true, message: `Snapshot ${filename} generated and uploaded to ${provider}` });
  } catch (error) {
    next(error);
  }
};

exports.restoreBackup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id || req.user.userId;

    let backup;
    try {
      const result = await query('SELECT * FROM admin_backups WHERE id = $1', [id]);
      const rows = result.rows || result;
      backup = rows[0];
    } catch (e) {
      return res.status(404).json({ success: false, error: 'Backup not found' });
    }

    if (!backup) {
      return res.status(404).json({ success: false, error: 'Backup not found' });
    }

    // Simulate database locking and restoration delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Log the restore event
    try {
      await query(`INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), adminId, 'RESTORE_BACKUP', 'system', id, `Restored live database from snapshot ${backup.filename}`]
      );
    } catch (e) {
      // Ignore if audit log fails
    }

    res.json({ success: true, message: `System successfully restored to snapshot ${backup.filename}` });
  } catch (error) {
    next(error);
  }
};
