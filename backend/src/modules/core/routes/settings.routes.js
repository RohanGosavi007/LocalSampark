const express = require('express');
const router = express.Router();
const { pool } = require('../../../../config/database');
const { authenticate, requireAdmin } = require('../../../../middleware/auth.middleware');

// GET /api/v1/settings/theme
// Publicly accessible to fetch global theme
router.get('/theme', async (req, res) => {
    try {
        let theme = 'lucide';
        const { rows } = await pool.query("SELECT value FROM platform_settings WHERE key = 'icon_theme'");
        if (rows && rows.length > 0) theme = rows[0].value;
        
        res.json({ success: true, theme });
    } catch (error) {
        // If table doesn't exist yet, just return default theme
        res.json({ success: true, theme: 'lucide' });
    }
});

// PUT /api/v1/settings/theme
// Admin only to update the global theme
router.put('/theme', authenticate, requireAdmin, async (req, res) => {
    try {
        const { theme } = req.body;
        if (!['lucide', 'phosphor'].includes(theme)) {
            return res.status(400).json({ success: false, message: 'Invalid theme' });
        }

        // Upsert the theme setting
        await pool.query(`
            INSERT INTO platform_settings (key, value) 
            VALUES ('icon_theme', $1)
            ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP
        `, [theme]);
        
        res.json({ success: true, message: 'Theme updated successfully' });
    } catch (error) {
        console.error('Error updating theme:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
