const { query, withTransaction } = require('../../../config/database');
const crypto = require('crypto');

// 256-bit fallback key for AES encryption if env var is missing
const ENCRYPTION_KEY = process.env.ADMIN_ENCRYPTION_KEY || crypto.scryptSync('localsampark-master-secret', 'salt', 32);
const IV_LENGTH = 16;

/**
 * Helper to encrypt sensitive API keys before storing in the DB.
 */
function encryptValue(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Helper to decrypt API keys for the frontend
 */
function decryptValue(text) {
  if (!text || !text.includes(':')) return text;
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return ''; // Return empty string on decryption failure to prevent leaking broken data
  }
}

exports.getSettings = async (req, res, next) => {
  try {
    const result = await query("SELECT config_key, config_value, config_category FROM admin_config WHERE config_category IN ('general', 'system', 'api_keys')");
    const rows = result.rows || result;
    
    // Flat mapping
    const settings = {};
    rows.forEach(row => {
      // If it's an API key, we decrypt it
      if (row.config_key.startsWith('api_key_')) {
        settings[row.config_key] = decryptValue(row.config_value);
      } else {
        settings[row.config_key] = row.config_value;
      }
    });

    // Provide safe defaults if not found in DB
    const finalSettings = {
      maintenance_mode: settings.maintenance_mode || 'false',
      pause_registrations: settings.pause_registrations || 'false',
      default_language: settings.default_language || 'en',
      api_key_razorpay: settings.api_key_razorpay || '',
      api_key_gmaps: settings.api_key_gmaps || ''
    };

    res.json({ success: true, data: finalSettings });
  } catch (error) {
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const payload = req.body;
    
    await withTransaction(async (client) => {
      for (const [key, rawValue] of Object.entries(payload)) {
        // Skip invalid keys
        if (!['maintenance_mode', 'pause_registrations', 'default_language', 'api_key_razorpay', 'api_key_gmaps'].includes(key)) {
          continue;
        }

        const category = key.startsWith('api_key_') ? 'api_keys' : 'system';
        
        // Encrypt if it is an API Key, otherwise cast to string
        const valueToStore = key.startsWith('api_key_') ? encryptValue(String(rawValue)) : String(rawValue);
        const adminId = req.user.id || req.user.userId;

        await client.query(`
          INSERT INTO admin_config (config_key, config_value, config_category, updated_by)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (config_key)
          DO UPDATE SET config_value = EXCLUDED.config_value,
                        config_category = EXCLUDED.config_category,
                        updated_by = EXCLUDED.updated_by,
                        updated_at = CURRENT_TIMESTAMP
        `, [key, valueToStore, category, adminId]);
      }

      // Log the bulk update
      const cryptoUuid = require('crypto').randomUUID();
      await client.query(`INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          cryptoUuid, 
          req.user.id || req.user.userId, 
          'UPDATE_GLOBAL_SETTINGS', 
          'system', 
          'admin_config', 
          'Modified global configurations and/or API Keys'
        ]
      ).catch(() => {}); // Ignore error if audit log table missing
    });

    // Phase 50: Redis Cache Invalidation Sweep
    try {
      const { cacheDel } = require('../../../config/redis');
      await cacheDel('godmode:settings');
      await cacheDel('godmode:config');
    } catch (e) {
      console.warn('Failed to invalidate Redis cache:', e.message);
    }

    res.json({ success: true, message: 'Settings saved securely' });
  } catch (error) {
    next(error);
  }
};
