const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');
const spatialRepo = require('../../../repositories/spatial.repository');
const geo = require('../../../utils/geo');
const territoryValidator = require('../../../validators/territory.validator');
const { publicFormLimiter } = require('../../../middleware/rateLimit.middleware');

// GET /api/v1/zones/resolve?lat=X&lng=Y — PiP territory resolution
router.get('/resolve', async (req, res, next) => {
  try {
    const { lat, lng, pincode } = req.query;

    // Option 1: Resolve by pincode (fast, no spatial calc)
    if (pincode) {
      const territory = await spatialRepo.territoryByPincode(pincode);
      if (territory) {
        return res.json({
          success: true,
          outOfBounds: false,
          territory: {
            id: territory.id,
            name: territory.name,
            pincode: territory.pincode,
            district: territory.district_name,
            taluka: territory.taluka_name,
            state: territory.state_name,
            centroid: { lat: territory.centroid_lat, lng: territory.centroid_lng }
          }
        });
      }
      return res.json({ success: true, outOfBounds: true, message: 'No territory found for this pincode.' });
    }

    // Option 2: Resolve by GPS coordinates (spatial PiP)
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Provide lat & lng, or pincode.' });
    }

    const territory = await spatialRepo.pointInTerritory(parseFloat(lat), parseFloat(lng));

    if (territory) {
      return res.json({
        success: true,
        outOfBounds: false,
        territory: {
          id: territory.id,
          name: territory.name,
          pincode: territory.pincode,
          district: territory.district_name,
          taluka: territory.taluka_name,
          state: territory.state_name,
          centroid: { lat: territory.centroid_lat, lng: territory.centroid_lng }
        }
      });
    }

    // Out of bounds — return nearest for suggestion
    const nearest = await spatialRepo.nearestTerritory(parseFloat(lat), parseFloat(lng));
    res.json({
      success: true,
      outOfBounds: true,
      message: 'Your location is outside any serviceable territory.',
      nearest: nearest ? {
        id: nearest.id,
        name: nearest.name,
        pincode: nearest.pincode,
        distance_km: nearest.distance_km
      } : null
    });
  } catch (error) { next(error); }
});

// POST /api/v1/zones/waitlist — "tell me when you reach my area" (C2.2).
//
// The admin waitlist (GET /admin/commerce/zones/waitlist, with CSV export) has
// always read unserviceable_waitlist, but nothing wrote to it, so the list
// that decides the next zone to open was permanently empty. Anonymous, so it
// is rate limited per IP, every field is shape-checked, and a way to reach the
// person (phone or email) is required — a sign-up nobody can contact is noise.
const WAITLIST_PINCODE_RE = /^[1-9][0-9]{5}$/;
const WAITLIST_PHONE_RE = /^\+?[0-9]{10,15}$/;
const WAITLIST_EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

router.post('/waitlist', publicFormLimiter, async (req, res, next) => {
  try {
    const { latitude, longitude, pincode, phone, email, address } = req.body || {};
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (latitude === undefined || longitude === undefined || latitude === null || longitude === null
      || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ success: false, error: 'latitude and longitude must be valid coordinates' });
    }
    const pin = pincode === undefined || pincode === null || pincode === '' ? null : String(pincode).trim();
    if (pin !== null && !WAITLIST_PINCODE_RE.test(pin)) {
      return res.status(400).json({ success: false, error: 'pincode must be a 6-digit Indian pincode' });
    }
    const phoneClean = phone ? String(phone).replace(/[\s-]/g, '') : null;
    if (phoneClean && !WAITLIST_PHONE_RE.test(phoneClean)) {
      return res.status(400).json({ success: false, error: 'phone must be a valid mobile number' });
    }
    const emailClean = email ? String(email).trim().toLowerCase() : null;
    if (emailClean && !WAITLIST_EMAIL_RE.test(emailClean)) {
      return res.status(400).json({ success: false, error: 'email must be a valid address' });
    }
    if (!phoneClean && !emailClean) {
      return res.status(400).json({ success: false, error: 'a phone number or email is required' });
    }
    if (address !== undefined && address !== null && (typeof address !== 'string' || address.length > 500)) {
      return res.status(400).json({ success: false, error: 'address must be at most 500 characters' });
    }

    // Someone inside a live zone does not belong on this list; tell them so
    // rather than recording a demand signal for an area already served.
    const served = pin
      ? await spatialRepo.territoryByPincode(pin)
      : await spatialRepo.pointInTerritory(lat, lng);
    if (served) {
      return res.status(409).json({ success: false, error: 'This location is already serviceable.', territory: { id: served.id, name: served.name } });
    }

    const id = crypto.randomUUID();
    await query(
      `INSERT INTO unserviceable_waitlist (id, phone_number, email, latitude, longitude, pincode, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, phoneClean, emailClean, lat, lng, pin, address ? address.trim() : null]
    );
    res.status(201).json({ success: true, id, message: "You're on the list. We'll tell you when we reach your area." });
  } catch (error) { next(error); }
});

// GET /api/v1/zones/hierarchy/v2 — 4-tier hierarchy
router.get('/hierarchy/v2', async (req, res, next) => {
  try {
    const hierarchy = await spatialRepo.getFullHierarchy();
    res.json({ success: true, data: hierarchy });
  } catch (error) { next(error); }
});

// GET /api/v1/zones - List all active zones
router.get('/', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const zones = await query(`
      SELECT r.*, 
             (SELECT config_value FROM admin_config WHERE config_key = 'territory_features_' || r.id) as features_json
      FROM regions r WHERE r.is_active = '1' ORDER BY r.name ASC LIMIT $1 OFFSET $2
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
      WHERE r.is_active = '1' 
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
        try { features = JSON.parse(r.features_json); } catch (e) { next(e); }
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
    const zones = await query(`SELECT * FROM regions WHERE (name LIKE $1 OR pincode LIKE $1) AND is_active = '1' ORDER BY name ASC LIMIT 20`, [searchTerm]);
    res.json({ success: true, data: zones.rows || zones });
  } catch (error) { next(error); }
});

// GET /api/v1/zones/nearby?lat=&lng=
router.get('/nearby', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

    const here = { lat: Number(lat), lng: Number(lng) };
    if (!Number.isFinite(here.lat) || !Number.isFinite(here.lng) || Math.abs(here.lat) > 90 || Math.abs(here.lng) > 180) {
      return res.status(400).json({ error: 'lat and lng must be valid coordinates' });
    }
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 50);

    // One implementation for both engines: read the active regions and measure
    // from here in JavaScript.
    //
    // There were two. SQLite ordered by squared difference in degrees, which is
    // not a distance (a degree of longitude at Pune's latitude is about 5%
    // shorter than one of latitude) and returned no distance at all. PostgreSQL
    // called earth_distance() and ll_to_earth(), which belong to the
    // earthdistance extension — and no migration installs it, so in production
    // this route answered 500 for everyone. It is the lookup that tells a new
    // user which zone they are in. Regions number in the hundreds at most, so
    // measuring them here costs nothing an index would save.
    const result = await query(
      `SELECT * FROM regions WHERE is_active = '1' AND latitude IS NOT NULL AND longitude IS NOT NULL`
    );
    const zones = (result.rows || result)
      .map((zone) => {
        const km = geo.distanceKm(here.lat, here.lng, Number(zone.latitude), Number(zone.longitude));
        return { ...zone, distance_km: Number.isFinite(km) ? Math.round(km * 100) / 100 : null };
      })
      .filter((zone) => zone.distance_km !== null)
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, limit);

    res.json({ success: true, data: zones });
  } catch (error) { next(error); }
});

// GET /api/v1/zones/by-district/:district
router.get('/by-district/:district', async (req, res, next) => {
  try {
    const zones = await query(`SELECT * FROM regions WHERE district = $1 AND is_active = '1' ORDER BY name ASC`, [req.params.district]);
    res.json({ success: true, data: zones.rows || zones });
  } catch (error) { next(error); }
});

// GET /api/v1/zones/by-state/:state
router.get('/by-state/:state', async (req, res, next) => {
  try {
    const zones = await query(`SELECT * FROM regions WHERE state = $1 AND is_active = '1' ORDER BY name ASC`, [req.params.state]);
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
    // An unknown zone is a 404, not a pair of zero counts (or a crash).
    const zone = await queryOne('SELECT id FROM regions WHERE id = $1', [req.params.id]);
    if (!zone) return res.status(404).json({ success: false, error: 'Zone not found' });
    const usersCount = await queryOne(`SELECT COUNT(*) as count FROM users WHERE region_id = $1`, [req.params.id]);
    const shopsCount = await queryOne(`SELECT COUNT(*) as count FROM local_shops WHERE region_id = $1`, [req.params.id]);
    res.json({
        success: true,
        data: {
            users: Number((usersCount && usersCount.count) || 0),
            shops: Number((shopsCount && shopsCount.count) || 0)
        }
    });
  } catch (error) { next(error); }
});

module.exports = router;
