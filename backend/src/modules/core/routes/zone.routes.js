const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

// GET /api/v1/zones - List all active zones
router.get('/', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const zones = await query(`
      SELECT r.*, 
             (SELECT config_value FROM admin_config WHERE config_key = 'territory_features_' || r.id) as features_json
      FROM regions r WHERE r.is_active = 1 ORDER BY r.name ASC LIMIT $1 OFFSET $2
    `, [parseInt(limit), parseInt(offset)]);
    
    const rows = zones.rows || zones;
    const data = rows.map(r => ({
      ...r,
      features: r.features_json ? JSON.parse(r.features_json) : { delivery: true, jobs: true, rentals: true, events: true, services: true }
    }));
    
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

// GET /api/v1/zones/hierarchy
router.get('/hierarchy', async (req, res, next) => {
  try {
    const regions = await query(`
      SELECT r.*, 
             (SELECT config_value FROM admin_config WHERE config_key = 'territory_features_' || r.id) as features_json
      FROM regions r
      WHERE r.is_active = 1 
      ORDER BY r.name ASC
    `);
    
    let states = [];
    let districts = {};
    let territories = [];
    
    const rows = regions.rows ? regions.rows : regions;
    for (const r of rows) {
      if (!states.includes(r.state)) states.push(r.state);
      
      if (!districts[r.state]) districts[r.state] = [];
      if (r.district && !districts[r.state].includes(r.district)) {
        districts[r.state].push(r.district);
      }
      
      let features = { delivery: true, jobs: true, rentals: true, events: true, services: true };
      if (r.features_json) {
        try { features = JSON.parse(r.features_json); } catch(e) {}
      }

      territories.push({
        id: r.id,
        zone: r.name,
        pin: r.pincode,
        state: r.state,
        district: r.district,
        city: r.city,
        status: r.is_active ? 'Active' : 'Open',
        lat: r.latitude,
        lng: r.longitude,
        radiusKm: r.radius_km,
        features
      });
    }
    
    res.json({
      success: true,
      data: { STATES: states, DISTRICTS: districts, TERRITORIES: territories }
    });
  } catch (error) { next(error); }
});

// GET /api/v1/zones/search?q=dhanori
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter q is required' });
    const searchTerm = `%${q}%`;
    const zones = await query(`SELECT * FROM regions WHERE (name LIKE $1 OR pincode LIKE $1) AND is_active = 1 ORDER BY name ASC LIMIT 20`, [searchTerm]);
    res.json({ success: true, data: zones.rows || zones });
  } catch (error) { next(error); }
});

// GET /api/v1/zones/nearby?lat=&lng=
router.get('/nearby', async (req, res, next) => {
  try {
    const { lat, lng, limit = 5 } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
    
    // SQLite doesn't natively support acos/cos/sin/radians without math functions loaded.
    // However, our backend implementation handles Haversine formula logic or it's handled via the custom database wrapper.
    // If not, this is a simplified fallback that just sorts by absolute lat/lng differences for SQLite.
    let sql = '';
    if (process.env.USE_SQLITE === 'true') {
        // Pseudo distance for SQLite without math functions
        sql = `
            SELECT *, 
            ((latitude - $1)*(latitude - $1) + (longitude - $2)*(longitude - $2)) AS distance_approx
            FROM regions 
            WHERE is_active = 1
            ORDER BY distance_approx ASC
            LIMIT $3
        `;
    } else {
        // Optimized PostgreSQL Geospatial Search (GiST Index)
        sql = `
            SELECT *,
            earth_distance(ll_to_earth($1, $2), ll_to_earth(latitude, longitude)) / 1000 AS distance_km
            FROM regions 
            WHERE is_active = 1
            ORDER BY ll_to_earth(latitude, longitude) <-> ll_to_earth($1, $2) ASC
            LIMIT $3
        `;
    }
    
    const zones = await query(sql, [parseFloat(lat), parseFloat(lng), parseInt(limit)]);
    res.json({ success: true, data: zones.rows || zones });
  } catch (error) { next(error); }
});

// GET /api/v1/zones/by-district/:district
router.get('/by-district/:district', async (req, res, next) => {
  try {
    const zones = await query(`SELECT * FROM regions WHERE district = $1 AND is_active = 1 ORDER BY name ASC`, [req.params.district]);
    res.json({ success: true, data: zones.rows || zones });
  } catch (error) { next(error); }
});

// GET /api/v1/zones/by-state/:state
router.get('/by-state/:state', async (req, res, next) => {
  try {
    const zones = await query(`SELECT * FROM regions WHERE state = $1 AND is_active = 1 ORDER BY name ASC`, [req.params.state]);
    res.json({ success: true, data: zones.rows || zones });
  } catch (error) { next(error); }
});

// GET /api/v1/zones/:id - Get zone details
router.get('/:id', async (req, res, next) => {
  try {
    const zone = await queryOne(`
      SELECT r.*,
             (SELECT config_value FROM admin_config WHERE config_key = 'territory_features_' || r.id) as features_json 
      FROM regions r WHERE id = $1
    `, [req.params.id]);
    
    if (!zone) return res.status(404).json({ error: 'Zone not found' });
    
    const data = {
      ...zone,
      features: zone.features_json ? JSON.parse(zone.features_json) : { delivery: true, jobs: true, rentals: true, events: true, services: true }
    };
    
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

// GET /api/v1/zones/:id/stats - Get zone stats
router.get('/:id/stats', async (req, res, next) => {
  try {
    const usersCount = await queryOne(`SELECT COUNT(*) as count FROM users WHERE region_id = $1`, [req.params.id]);
    const shopsCount = await queryOne(`SELECT COUNT(*) as count FROM local_shops WHERE region_id = $1`, [req.params.id]);
    res.json({ 
        success: true, 
        data: { 
            users: usersCount.count, 
            shops: shopsCount.count 
        } 
    });
  } catch (error) { next(error); }
});

module.exports = router;
