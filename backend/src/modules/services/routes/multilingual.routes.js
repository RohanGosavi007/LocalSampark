const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');
const { requireFeature } = require('../../../middleware/feature.middleware');

// Apply GTM Feature Flag Protection
router.use(requireFeature('multilingual'));

// GET /dictionary/:langCode - Fetch localization translation dictionary
router.get('/dictionary/:langCode', async (req, res, next) => {
  try {
    const { langCode } = req.params;
    const dict = await query('SELECT translation_key, translation_value FROM localization_dictionaries WHERE lang_code = $1', [langCode]);

    const rows = dict.rows || dict;
    const dictionary = {};
    rows.forEach(r => {
      dictionary[r.translation_key] = r.translation_value;
    });

    res.json({ success: true, lang_code: langCode, dictionary });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
