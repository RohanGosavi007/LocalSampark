const { query } = require('../../../../config/database');
const crypto = require('crypto');

exports.getConfig = async (req, res, next) => {
  try {
    let config;
    try {
      const result = await query('SELECT * FROM admin_localization LIMIT 1');
      const rows = result.rows || result;
      config = rows[0];
    } catch (e) {
      config = null;
    }

    if (!config) {
      // Return default config if table is empty or missing
      return res.json({ 
        success: true, 
        data: { activeLanguages: ['en'], dictionaryOverrides: {} } 
      });
    }

    res.json({ 
      success: true, 
      data: { 
        activeLanguages: JSON.parse(config.active_languages || '["en"]'), 
        dictionaryOverrides: JSON.parse(config.dictionary_overrides || '{}') 
      } 
    });
  } catch (error) {
    next(error);
  }
};

exports.updateConfig = async (req, res, next) => {
  try {
    const { activeLanguages, dictionaryOverrides } = req.body;
    const adminId = req.user.id || req.user.userId;

    const activeLanguagesJson = JSON.stringify(activeLanguages || ['en']);
    const overridesJson = JSON.stringify(dictionaryOverrides || {});

    try {
      // Upsert the single localization record (assuming id 'global')
      await query(`INSERT INTO admin_localization (id, active_languages, dictionary_overrides, updated_by)
         VALUES ('global', $1, $2, $3)
         ON CONFLICT(id) DO UPDATE SET active_languages = $1, dictionary_overrides = $2, updated_by = $3`,
        [activeLanguagesJson, overridesJson, adminId]
      );
      
      await query(`INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), adminId, 'UPDATE_LOCALIZATION', 'system', 'global', \`Updated global language matrix: \${activeLanguages.join(',')}\`]
      );
    } catch (e) {
      if (e.message.includes('relation "admin_localization" does not exist') || e.message.includes('no such table')) {
        await query(\`
          CREATE TABLE admin_localization (
            id VARCHAR(50) PRIMARY KEY,
            active_languages TEXT,
            dictionary_overrides TEXT,
            updated_by VARCHAR(255),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        \`);
        await query(`INSERT INTO admin_localization (id, active_languages, dictionary_overrides, updated_by)
           VALUES ('global', $1, $2, $3)`,
          [activeLanguagesJson, overridesJson, adminId]
        );
      } else {
        throw e;
      }
    }

    res.json({ success: true, message: 'Localization settings synced globally. Cache purged.' });
  } catch (error) {
    next(error);
  }
};
