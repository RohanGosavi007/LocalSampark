const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth.middleware');
const { query, queryOne } = require('../../../config/database');

// POST /api/v1/crm/campaigns/purchase - Purchase a 7-day Featured Shop Ad Campaign
router.post('/purchase', authenticate, async (req, res, next) => {
  try {
    const { shop_id, budget_amount, radius_km = 2, duration_days = 7 } = req.body;
    if (!shop_id || !budget_amount || budget_amount <= 0) {
      return res.status(400).json({ error: 'Valid shop_id and budget_amount are required.' });
    }

    // 1. Verify wallet balance
    const wallet = await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [req.user.id]);
    if (!wallet || (wallet.balance || 0) < budget_amount) {
      return res.status(402).json({ error: 'Insufficient wallet balance to purchase ad campaign.' });
    }

    // 2. Deduct wallet balance
    await query('UPDATE wallets SET balance = balance - $1 WHERE user_id = $2', [budget_amount, req.user.id]);

    // 3. Mark shop as featured and create campaign
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + duration_days * 24 * 60 * 60 * 1000);

    await query('UPDATE local_shops SET is_featured = TRUE WHERE id = $1', [shop_id]);

    const campaign = await queryOne(`INSERT INTO shop_campaigns 
       (shop_id, title, discount_type, discount_value, start_datetime, end_datetime, radius_km, is_flash_sale, status) 
       VALUES ($1, $2, 'ad_boost', $3, $4, $5, $6, FALSE, 'active') RETURNING *`,
      [shop_id, `Featured Ad Boost (${duration_days} Days)`, budget_amount, startDate.toISOString(), endDate.toISOString(), radius_km]
    );

    res.status(201).json({
      success: true,
      message: `Successfully purchased ${duration_days}-day Featured Ad Campaign!`,
      campaign
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/crm/campaigns/featured-shops - Get Geofenced Featured Shops within radius
router.get('/featured-shops', async (req, res, next) => {
  try {
    const { lat = 18.5912, lon = 73.9015, radius_km = 3 } = req.query;
    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);

    // Query featured shops
    const result = await query(`SELECT id, name, category, address, phone_number, is_featured, rating, latitude, longitude
       FROM local_shops 
       WHERE is_featured = TRUE AND is_active = TRUE LIMIT 20`
    );

    const shops = result.rows || result || [];

    // Filter by radius and rank by score: AdBid/Score algorithm
    const featured = shops.map(shop => {
      const sLat = shop.latitude || userLat;
      const sLon = shop.longitude || userLon;
      
      // Haversine distance estimation
      const dLat = (sLat - userLat) * Math.PI / 180;
      const dLon = (sLon - userLon) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(userLat * Math.PI / 180) * Math.cos(sLat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      const rating = shop.rating || 4.5;
      const adScore = (10 * 0.6) + (rating * 0.3) + ((1 / (distKm + 0.1)) * 0.1);

      return { ...shop, distance_km: Math.round(distKm * 10) / 10, ad_score: Math.round(adScore * 100) / 100 };
    }).filter(s => s.distance_km <= parseFloat(radius_km))
      .sort((a, b) => b.ad_score - a.ad_score);

    res.json({ success: true, count: featured.length, featured_shops: featured });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/campaigns/:shopId - Create campaign (legacy)
router.post('/:shopId', authenticate, async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const {
      title,
      discount_type,
      discount_value,
      start_datetime,
      end_datetime,
      radius_km,
      is_flash_sale,
      fomo_timer_minutes
    } = req.body;

    const result = await query(`INSERT INTO shop_campaigns 
       (shop_id, title, discount_type, discount_value, start_datetime, end_datetime, radius_km, is_flash_sale, fomo_timer_minutes, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled') RETURNING *`,
      [shopId, title, discount_type, discount_value, start_datetime, end_datetime, radius_km || 3, is_flash_sale || false, fomo_timer_minutes || 0]
    );

    res.status(201).json({ message: 'Campaign scheduled', campaign: result.rows?.[0] || result });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/campaigns/:shopId - List campaigns
router.get('/:shopId', authenticate, async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const result = await query(`SELECT * FROM shop_campaigns WHERE shop_id = $1 ORDER BY start_datetime DESC`, [shopId]);
    res.json(result.rows || result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
