const { query, withTransaction } = require('../../../config/database');
const crypto = require('crypto');
const razorpay = require('../../../services/razorpay.service');

/**
 * Platform settings an administrator can change at run time.
 *
 * This controller also used to take API keys. The settings page had fields for
 * a "Razorpay Live Secret" and a Google Maps key; they were encrypted here and
 * stored in admin_config, decrypted again on every read and sent back to the
 * browser of any administrator who opened the page — and used by nothing. The
 * payment code has only ever read its keys from the environment, so typing a
 * key into that page configured nothing while putting a live secret in the
 * database and on the wire.
 *
 * The encryption key itself fell back to one derived from two string literals
 * in this file ('localsampark-master-secret', 'salt') whenever
 * ADMIN_ENCRYPTION_KEY was unset, which made the stored values readable to
 * anyone with the source.
 *
 * Keys and secrets are configured in the server's environment and nowhere
 * else. This endpoint reports whether each integration is configured — never
 * the secret — so the page can show its state.
 */

const SETTINGS = {
  maintenance_mode: { category: 'system', read: (v) => (v === true || v === 'true' ? 'true' : 'false') },
  pause_registrations: { category: 'system', read: (v) => (v === true || v === 'true' ? 'true' : 'false') },
  default_language: {
    category: 'system',
    read: (v) => {
      const code = String(v || '').trim().toLowerCase();
      return /^[a-z]{2,3}(-[a-z]{2,4})?$/.test(code) ? code : null;
    },
  },
};

const isSet = (name) => Boolean(process.env[name] && String(process.env[name]).trim());

/** Which integrations the server has credentials for. Public identifiers only. */
function integrationStatus() {
  return {
    razorpay: {
      configured: razorpay.isConfigured(),
      webhookConfigured: razorpay.isWebhookConfigured(),
      // The key id is public: the browser needs it to open Checkout.
      keyId: razorpay.isConfigured() ? razorpay.keyId() : null,
      env: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'],
    },
    googleMaps: { configured: isSet('GOOGLE_MAPS_API_KEY'), env: ['GOOGLE_MAPS_API_KEY'] },
    sms: { configured: isSet('MSG91_AUTH_KEY'), env: ['MSG91_AUTH_KEY', 'MSG91_TEMPLATE_ID'] },
  };
}

exports.getSettings = async (req, res, next) => {
  try {
    const result = await query("SELECT config_key, config_value FROM admin_config WHERE config_category IN ('general', 'system')");
    const rows = result.rows || result;

    const stored = {};
    rows.forEach((row) => { stored[row.config_key] = row.config_value; });

    res.json({
      success: true,
      data: {
        maintenance_mode: stored.maintenance_mode || 'false',
        pause_registrations: stored.pause_registrations || 'false',
        default_language: stored.default_language || 'en',
        integrations: integrationStatus(),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const payload = req.body || {};

    if (Object.keys(payload).some((key) => key.startsWith('api_key_'))) {
      return res.status(400).json({
        success: false,
        code: 'KEYS_ARE_ENVIRONMENT_ONLY',
        error: 'API keys are not stored here. Set them in the server environment (for Razorpay: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET) and restart the service.',
      });
    }

    const changes = [];
    for (const [key, rawValue] of Object.entries(payload)) {
      const setting = SETTINGS[key];
      if (!setting) continue;
      const value = setting.read(rawValue);
      if (value === null) {
        return res.status(400).json({ success: false, error: `Invalid value for ${key}` });
      }
      changes.push([key, value, setting.category]);
    }
    if (changes.length === 0) {
      return res.status(400).json({ success: false, error: 'No recognised settings to update' });
    }

    const adminId = req.user.id || req.user.userId;
    await withTransaction(async (client) => {
      for (const [key, value, category] of changes) {
        await client.query(`
          INSERT INTO admin_config (config_key, config_value, config_category, updated_by)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (config_key)
          DO UPDATE SET config_value = EXCLUDED.config_value,
                        config_category = EXCLUDED.config_category,
                        updated_by = EXCLUDED.updated_by,
                        updated_at = CURRENT_TIMESTAMP
        `, [key, value, category, adminId]);
      }
    });

    // Outside the transaction. Inside it, a failed audit insert was swallowed
    // with .catch(() => {}) — which on PostgreSQL leaves the transaction
    // aborted, so the COMMIT that followed rolled the settings back and the
    // request still answered "saved".
    try {
      await query(
        `INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), adminId, 'UPDATE_GLOBAL_SETTINGS', 'system', 'admin_config',
          JSON.stringify(Object.fromEntries(changes.map(([key, value]) => [key, value])))]
      );
    } catch (e) {
      console.error('Audit log write failed:', e.message);
    }

    // Phase 50: Redis Cache Invalidation Sweep
    try {
      const { cacheDel } = require('../../../config/redis');
      await cacheDel('godmode:settings');
      await cacheDel('godmode:config');
      for (const [key] of changes) await cacheDel(`kill_switch:${key}`);
    } catch (e) {
      console.warn('Failed to invalidate Redis cache:', e.message);
    }

    res.json({ success: true, message: 'Settings saved' });
  } catch (error) {
    next(error);
  }
};

exports.integrationStatus = integrationStatus;
