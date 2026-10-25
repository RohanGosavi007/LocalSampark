const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth.middleware');
const { query, queryOne, withTransaction } = require('../../../config/database');
const { cacheGet, cacheSet } = require('../../../config/redis');
const { getGeoTargetedAds } = require('../../../services/AdService');
const crypto = require('crypto');
const { sqlDate } = require('../../../utils/sqlTime');

const isAdmin = (user) => user && (user.role === 'admin' || user.role === 'super_admin');

/**
 * The shop a campaign is for, if the caller may run campaigns for it: its
 * owner, or an admin. Answers the request itself and returns null otherwise.
 *
 * Every shop-scoped route here used to take `authenticate` and stop, so any
 * signed-in account could create, list and activate campaigns for any shop.
 */
async function manageableShop(req, res, shopId) {
  if (!shopId) {
    res.status(400).json({ error: 'A shop is required' });
    return null;
  }
  const shop = await queryOne('SELECT id, owner_id, name FROM local_shops WHERE id = $1', [shopId]);
  if (!shop) {
    res.status(404).json({ error: 'Shop not found' });
    return null;
  }
  if (!isAdmin(req.user) && String(shop.owner_id) !== String(req.user.id)) {
    res.status(403).json({ error: 'You do not own this shop' });
    return null;
  }
  return shop;
}

// GET /api/v1/campaigns/geo-feed - Fetch active targeted ads based on lat/lng & radius
router.get('/geo-feed', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat || 18.5204);
    const lng = parseFloat(req.query.lng || 73.8567);
    const radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm) : null;
    const categoryId = req.query.categoryId || null;
    const pincode = req.query.pincode || null;

    const ads = await getGeoTargetedAds({ lat, lng, pincode, categoryId, radiusKm });
    res.json({ success: true, count: ads.length, ads });
  } catch (error) {
    console.error('Geo feed error:', error);
    res.status(500).json({ error: 'Failed to fetch geo-targeted ads' });
  }
});

// POST /api/v1/campaigns/purchase - Admin / Merchant campaign purchase
//
// Registered ahead of POST /:shopId on purpose. It used to come after, and
// Express takes the first route that matches: "purchase" is a perfectly good
// value for :shopId, so every purchase was handled as "create a campaign for
// the shop whose id is 'purchase'" and failed there. This handler never ran.
router.post('/purchase', authenticate, async (req, res) => {
  try {
    const { shop_id, budget_amount, radius_km, duration_days } = req.body;

    const shop = await manageableShop(req, res, shop_id);
    if (!shop) return;

    const budget = budget_amount === undefined || budget_amount === null || budget_amount === ''
      ? 500
      : Number(budget_amount);
    if (!Number.isFinite(budget) || budget <= 0 || budget > 1000000) {
      return res.status(400).json({ error: 'budget_amount must be a positive amount' });
    }
    const days = Number(duration_days) > 0 ? Math.min(Math.floor(Number(duration_days)), 365) : 7;
    const radius = Number(radius_km) > 0 ? Number(radius_km) : 4;
    const campaignId = crypto.randomUUID();

    // ad_type, start_date and end_date are NOT NULL and were not written, so
    // the INSERT could not have succeeded even had it been reached. The run is
    // the requested number of days from today.
    const insertCampaign = (client) => client.query(
      `INSERT INTO ad_campaigns
         (id, shop_id, advertiser_id, ad_type, budget, radius_km, duration_days, start_date, end_date, status)
       VALUES ($1, $2, $3, 'promoted_listing', $4, $5, $6, $7, $8, 'active')`,
      [campaignId, shop.id, req.user.id, budget, radius, days, sqlDate(0), sqlDate(days)]
    );

    if (isAdmin(req.user)) {
      // A placement granted from the admin console. It is not charged to
      // anyone's wallet; advertiser_id records which admin granted it.
      await insertCampaign({ query });
    } else {
      // A merchant buying a placement pays for it, in the same transaction
      // that creates it. This used to insert an 'active' campaign and answer
      // "Purchased Successfully!" without taking any money at all.
      const paid = await withTransaction(async (client) => {
        const debit = await client.query(
          'UPDATE wallets SET balance = balance - $1 WHERE user_id = $2 AND balance >= $1',
          [budget, req.user.id]
        );
        if (!debit.rowCount) return false;

        await client.query(
          `INSERT INTO wallet_transactions (id, wallet_id, amount, type, purpose, reference_id, status)
           VALUES ($1, (SELECT id FROM wallets WHERE user_id = $2), $3, 'debit', 'ad_campaign', $4, 'completed')`,
          [crypto.randomUUID(), req.user.id, budget, campaignId]
        );
        await insertCampaign(client);
        return true;
      });

      if (!paid) {
        return res.status(402).json({ error: 'Insufficient wallet balance for this campaign budget' });
      }
    }

    const campaign = await queryOne('SELECT * FROM ad_campaigns WHERE id = $1', [campaignId]);
    res.status(201).json({ success: true, message: 'Ad Campaign Purchased Successfully!', campaign });
  } catch (error) {
    console.error('Campaign purchase error:', error);
    res.status(500).json({ error: 'Failed to purchase campaign' });
  }
});

// POST /api/v1/campaigns/:id/impression - Record ad impression
router.post('/:id/impression', async (req, res) => {
  try {
    const { id } = req.params;
    await query(`UPDATE ad_campaigns SET impressions = impressions + 1 WHERE id = $1 AND status = 'active'`, [id]);
    res.json({ success: true, message: 'Impression recorded' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record impression' });
  }
});

// POST /api/v1/campaigns/:id/click - Record ad click and deduct cost
router.post('/:id/click', async (req, res) => {
  try {
    const { id } = req.params;
    const cpcRate = 5.0; // ₹5 per click

    // One billed click per visitor per ad per ten minutes. The endpoint has to
    // be public, which means anyone can repeat it: a rival could spend an
    // advertiser's whole budget with a loop. Repeats are still counted as
    // clicks, just not charged. Needs Redis; without it every click is billed,
    // as before.
    const seenKey = `adclick:${id}:${req.ip}`;
    if (await cacheGet(seenKey).catch(() => null)) {
      await query(`UPDATE ad_campaigns SET clicks = clicks + 1 WHERE id = $1 AND status = 'active'`, [id]);
      return res.json({ success: true, message: 'Click recorded' });
    }
    await cacheSet(seenKey, 1, 600).catch(() => {});

    // Only while the campaign is running and only while it has budget left.
    // This is a public endpoint, as an ad click has to be, and it used to add
    // the click cost unconditionally: `spent` could be run past any budget, on
    // any campaign in any state, by anyone repeating one request.
    const charged = await query(
      `UPDATE ad_campaigns SET clicks = clicks + 1, spent = spent + $1
        WHERE id = $2 AND status = 'active' AND spent + $1 <= budget`,
      [cpcRate, id]
    );
    if (!charged.rowCount) {
      // Out of budget: the click is still counted, and the campaign stops.
      await query(
        `UPDATE ad_campaigns SET clicks = clicks + 1, status = 'exhausted'
          WHERE id = $1 AND status = 'active'`,
        [id]
      );
    }
    res.json({ success: true, message: 'Click recorded' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record click' });
  }
});

// POST /api/v1/campaigns/:shopId - Create scheduled campaign
router.post('/:shopId', authenticate, async (req, res) => {
  try {
    const shop = await manageableShop(req, res, req.params.shopId);
    if (!shop) return;

    const { title, discount_type, discount_value, start_datetime, end_datetime, radius_km, is_flash_sale, fomo_timer_minutes } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    // Stored as UTC 'YYYY-MM-DD HH:MM:SS' so the schedule job can compare them as
    // text on either engine. A value without an offset is read as UTC.
    const toUtc = (v) => {
      if (v === undefined || v === null || v === '') return null;
      const d = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/.test(String(v)) ? v : `${String(v).replace(' ', 'T')}Z`);
      return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 19).replace('T', ' ');
    };
    const startUtc = toUtc(start_datetime);
    const endUtc = toUtc(end_datetime);
    if (startUtc === undefined || endUtc === undefined) {
      return res.status(400).json({ error: 'start_datetime and end_datetime must be valid dates' });
    }
    if (startUtc && endUtc && endUtc <= startUtc) {
      return res.status(400).json({ error: 'end_datetime must be after start_datetime' });
    }

    const id = crypto.randomUUID();
    await query(
      `INSERT INTO shop_campaigns
         (id, shop_id, title, discount_type, discount_value, start_datetime, end_datetime, radius_km, is_flash_sale, fomo_timer_minutes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'scheduled')`,
      [id, shop.id, String(title).trim(), discount_type || null, discount_value ?? null, startUtc,
        endUtc, radius_km ?? null, is_flash_sale ? 1 : 0, fomo_timer_minutes ?? null]
    );

    const campaign = await queryOne('SELECT * FROM shop_campaigns WHERE id = $1', [id]);
    res.status(201).json({ message: 'Campaign created', campaign });
  } catch (error) {
    console.error('Campaign create error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// GET /api/v1/campaigns/:shopId/ads - List ad campaigns for shop
router.get('/:shopId/ads', authenticate, async (req, res) => {
  try {
    const shop = await manageableShop(req, res, req.params.shopId);
    if (!shop) return;

    const result = await query(
      'SELECT * FROM ad_campaigns WHERE shop_id = $1 ORDER BY created_at DESC',
      [shop.id]
    );
    res.json({ success: true, campaigns: result.rows || [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ad campaigns' });
  }
});

// GET /api/v1/campaigns/:shopId - List campaigns
router.get('/:shopId', authenticate, async (req, res) => {
  try {
    const shop = await manageableShop(req, res, req.params.shopId);
    if (!shop) return;

    const result = await query(
      'SELECT * FROM shop_campaigns WHERE shop_id = $1 ORDER BY created_at DESC',
      [shop.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// PUT /api/v1/campaigns/:shopId/:campaignId/activate - Manual trigger
router.put('/:shopId/:campaignId/activate', authenticate, async (req, res) => {
  try {
    const shop = await manageableShop(req, res, req.params.shopId);
    if (!shop) return;

    const updated = await query(
      `UPDATE shop_campaigns SET status = 'active' WHERE id = $1 AND shop_id = $2`,
      [req.params.campaignId, shop.id]
    );
    if (!updated.rowCount) return res.status(404).json({ error: 'Campaign not found' });

    const campaign = await queryOne('SELECT * FROM shop_campaigns WHERE id = $1', [req.params.campaignId]);
    res.json({ message: 'Campaign activated manually', campaign });
  } catch (error) {
    res.status(500).json({ error: 'Failed to activate campaign' });
  }
});

module.exports = router;
