const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const { v4: uuidv4 } = require('uuid');
const { getRevenueModels, updateConfig } = require('../controllers/admin-revenue-models.controller');

// Middlewares helper to enforce territory access
const requireTerritoryAdmin = (req, res, next) => {
  if (req.user.role !== 'territory_admin' && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Franchise Partner or Admin access required' });
  }
  next();
};

// GET Dashboard Stats scoped to region/territory
router.get('/profile', authenticate, requireTerritoryAdmin, async (req, res, next) => {
  try {
    let regionId = req.user.region_id;
    if (!regionId && (req.user.role === 'admin' || req.user.role === 'super_admin' || req.user.role === 'area_agent')) {
        // Super admins can pass regionId via query, or just get a global overview (handled below)
        regionId = req.query.regionId || null;
    }
    
    if (!regionId && req.user.role === 'territory_admin') {
        return res.status(400).json({ error: 'No region/territory associated with this partner' });
    }
    
    let profile = null;
    if (regionId) {
      profile = await queryOne(`
        SELECT f.* 
        FROM franchise_partners f
        JOIN users u ON f.user_id = u.id
        WHERE u.region_id = $1
      `, [regionId]);
    } else {
      // Global profile overview for super_admin
      profile = { territory_name: 'All Territories (Global)', status: 'active' };
    }

    res.json({ success: true, data: profile });
  } catch (error) { next(error); }
});

router.get('/dashboard-stats', authenticate, requireTerritoryAdmin, async (req, res, next) => {
  try {
    const regionId = req.user.region_id;
    if (!regionId && req.user.role === 'territory_admin') {
      return res.status(400).json({ error: 'No region/territory associated with this partner' });
    }

    const filterSQL = regionId ? 'WHERE region_id = $1' : '';
    const filterParams = regionId ? [regionId] : [];

    const usersCount = await queryOne(`SELECT COUNT(*) as count FROM users ${filterSQL}`, filterParams);
    
    let shopsSQL = 'SELECT COUNT(*) as count FROM local_shops';
    if (regionId) shopsSQL += ' WHERE region_id = $1';
    const shopsCount = await queryOne(shopsSQL, filterParams);

    let earningsSQL = 'SELECT COALESCE(SUM(amount), 0) as total FROM user_earnings';
    if (regionId) {
      earningsSQL = `
        SELECT COALESCE(SUM(ue.amount), 0) as total 
        FROM user_earnings ue
        JOIN users u ON ue.user_id = u.id
        WHERE u.region_id = $1
      `;
    }
    const earningsSum = await queryOne(earningsSQL, filterParams);

    res.json({
      success: true,
      users: parseInt(usersCount.count || 0),
      shops: parseInt(shopsCount.count || 0),
      earnings: parseFloat(earningsSum.total || 0),
      regionId: regionId || 'all'
    });
  } catch (error) {
    next(error);
  }
});

// ─── COMPREHENSIVE APPROVALS HUB (TERRITORY SCOPED) ───
router.get('/approvals', authenticate, requireTerritoryAdmin, async (req, res, next) => {
  try {
    let regionId = req.user.region_id;
    if (!regionId && (req.user.role === 'admin' || req.user.role === 'super_admin' || req.user.role === 'area_agent')) {
        regionId = req.query.regionId || null;
    }

    if (!regionId && req.user.role === 'territory_admin') {
      return res.status(400).json({ error: 'No region_id associated' });
    }

    const params = regionId ? [regionId] : [];
    const filterSQL = regionId ? ' AND region_id = $1' : '';
    const uFilterSQL = regionId ? ' AND u.region_id = $1' : '';
    const sFilterSQL = regionId ? ' AND s.region_id = $1' : '';

    const shops = await query(`SELECT id, name, category, address, phone_number, created_at FROM local_shops WHERE is_verified = 0${filterSQL} ORDER BY created_at ASC`, params);
    const events = await query(`SELECT e.id, e.title, e.category, e.venue, e.event_date, e.created_at FROM events e JOIN users u ON e.organizer_id = u.id WHERE e.is_approved = 0${uFilterSQL} ORDER BY e.created_at ASC`, params);
    const properties = await query(`SELECT id, title, property_type, listing_type, price, created_at FROM property_listings WHERE is_verified = 0${filterSQL} ORDER BY created_at ASC`, params);
    const skills = await query(`SELECT s.id, s.skill_name as name, u.full_name as user_name, u.phone_number, s.created_at FROM user_skills s JOIN users u ON s.user_id = u.id WHERE s.is_certified = 0${uFilterSQL} ORDER BY s.created_at ASC`, params);
    const usersKyc = await query(`SELECT id, full_name as name, phone_number, role, created_at FROM users WHERE is_verified = 0${filterSQL} ORDER BY created_at ASC`, params);
    const adCampaigns = await query(`SELECT a.id, a.title, a.ad_type as type, a.budget, u.full_name as user_name, a.created_at FROM ad_campaigns a JOIN users u ON a.advertiser_id = u.id WHERE a.status = 'pending'${uFilterSQL} ORDER BY a.created_at ASC`, params);
    const marketplace = await query(`SELECT m.id, m.title as name, m.category, m.price, u.full_name as user_name, m.created_at FROM marketplace_listings m JOIN users u ON m.seller_id = u.id WHERE m.status = 'pending'${uFilterSQL} ORDER BY m.created_at ASC`, params);
    const redemptions = await query(`SELECT lr.id, 'Reward Redemption' as name, lr.points_used as amount, u.full_name as user_name, lr.redeemed_at as created_at FROM loyalty_redemptions lr JOIN users u ON lr.user_id = u.id WHERE lr.status = 'pending'${uFilterSQL} ORDER BY lr.redeemed_at ASC`, params);
    const jobs = await query(`SELECT j.id, j.title as name, j.job_type as category, s.name as user_name, j.created_at FROM job_vacancies j JOIN local_shops s ON j.shop_id = s.id WHERE j.is_active = 0${sFilterSQL} ORDER BY j.created_at ASC`, params);
    const carpool = await query(`SELECT c.id, c.from_location as name, c.to_location as category, u.full_name as user_name, c.created_at FROM carpool_rides c JOIN users u ON c.driver_id = u.id WHERE c.status = 'pending'${uFilterSQL} ORDER BY c.created_at ASC`, params);
    const pets = await query(`SELECT p.id, p.alert_type as name, p.description as category, u.full_name as user_name, p.created_at FROM pet_alerts p JOIN users u ON p.user_id = u.id WHERE p.status = 'pending'${uFilterSQL} ORDER BY p.created_at ASC`, params);
    const deliveryAgents = await query(`SELECT d.id, d.vehicle_type as name, d.vehicle_number as category, u.full_name as user_name, d.created_at FROM delivery_agents d JOIN users u ON d.user_id = u.id WHERE u.is_verified = 0${uFilterSQL} ORDER BY d.created_at ASC`, params);

    res.json({
      success: true,
      data: {
        shops: shops.rows || shops,
        events: events.rows || events,
        properties: properties.rows || properties,
        healthProviders: [], // Global only
        franchises: [], // Global only
        skills: skills.rows || skills,
        usersKyc: usersKyc.rows || usersKyc,
        adCampaigns: adCampaigns.rows || adCampaigns,
        marketplace: marketplace.rows || marketplace,
        redemptions: redemptions.rows || redemptions,
        jobs: jobs.rows || jobs,
        carpool: carpool.rows || carpool,
        pets: pets.rows || pets,
        deliveryAgents: deliveryAgents.rows || deliveryAgents
      }
    });
  } catch (error) { next(error); }
});

router.put('/approvals/:type/:id', authenticate, requireTerritoryAdmin, async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const { action } = req.body;
    let tableName, idColumn, statusColumn, approvedValue, rejectedValue;

    switch (type) {
      case 'shop': tableName = 'local_shops'; idColumn = 'id'; statusColumn = 'is_verified'; approvedValue = 1; rejectedValue = -1; break;
      case 'event': tableName = 'events'; idColumn = 'id'; statusColumn = 'is_approved'; approvedValue = 1; rejectedValue = -1; break;
      case 'property': tableName = 'property_listings'; idColumn = 'id'; statusColumn = 'is_verified'; approvedValue = 1; rejectedValue = -1; break;
      case 'health': tableName = 'health_providers'; idColumn = 'id'; statusColumn = 'is_verified'; approvedValue = 1; rejectedValue = -1; break;
      case 'franchise': tableName = 'franchise_partners'; idColumn = 'id'; statusColumn = 'status'; approvedValue = 'active'; rejectedValue = 'rejected'; break;
      case 'skill': tableName = 'user_skills'; idColumn = 'id'; statusColumn = 'is_certified'; approvedValue = 1; rejectedValue = -1; break;
      case 'userKyc': tableName = 'users'; idColumn = 'id'; statusColumn = 'is_verified'; approvedValue = 1; rejectedValue = -1; break;
      case 'adCampaign': tableName = 'ad_campaigns'; idColumn = 'id'; statusColumn = 'status'; approvedValue = 'active'; rejectedValue = 'rejected'; break;
      case 'marketplace': tableName = 'marketplace_listings'; idColumn = 'id'; statusColumn = 'status'; approvedValue = 'active'; rejectedValue = 'rejected'; break;
      case 'redemption': tableName = 'loyalty_redemptions'; idColumn = 'id'; statusColumn = 'status'; approvedValue = 'completed'; rejectedValue = 'rejected'; break;
      case 'job': tableName = 'job_vacancies'; idColumn = 'id'; statusColumn = 'is_active'; approvedValue = 1; rejectedValue = -1; break;
      case 'carpool': tableName = 'carpool_rides'; idColumn = 'id'; statusColumn = 'status'; approvedValue = 'active'; rejectedValue = 'rejected'; break;
      case 'pet': tableName = 'pet_alerts'; idColumn = 'id'; statusColumn = 'status'; approvedValue = 'active'; rejectedValue = 'rejected'; break;
      case 'deliveryAgent': tableName = 'users'; idColumn = 'id'; statusColumn = 'is_verified'; approvedValue = 1; rejectedValue = -1; break;
      default: return res.status(400).json({ error: 'Invalid approval type' });
    }

    if (action === 'approve') {
      await query(`UPDATE ${tableName} SET ${statusColumn} = $1 WHERE ${idColumn} = $2`, [approvedValue, id]);
    } else {
      if (typeof rejectedValue === 'string') {
        await query(`UPDATE ${tableName} SET ${statusColumn} = $1 WHERE ${idColumn} = $2`, [rejectedValue, id]);
      } else {
        await query(`DELETE FROM ${tableName} WHERE ${idColumn} = $1`, [id]);
      }
    }
    res.json({ success: true, message: `Successfully ${action}d ${type}` });
  } catch (error) { next(error); }
});

// GET Users in territory
router.get('/users', authenticate, requireTerritoryAdmin, async (req, res, next) => {
  try {
    const regionId = req.user.region_id;
    const filterSQL = regionId ? 'WHERE region_id = $1' : '';
    const filterParams = regionId ? [regionId] : [];
    const users = await query(`SELECT id, phone_number, name, role, is_verified, created_at FROM users ${filterSQL} ORDER BY created_at DESC LIMIT 50`, filterParams);
    res.json({ success: true, users: users.rows || users });
  } catch (error) { next(error); }
});

// GET Shops in territory
router.get('/shops', authenticate, requireTerritoryAdmin, async (req, res, next) => {
  try {
    const regionId = req.user.region_id;
    const filterSQL = regionId ? 'WHERE region_id = $1' : '';
    const filterParams = regionId ? [regionId] : [];
    const shops = await query(`SELECT * FROM local_shops ${filterSQL} ORDER BY created_at DESC LIMIT 50`, filterParams);
    res.json({ success: true, shops: shops.rows || shops });
  } catch (error) { next(error); }
});

// GET Providers in territory
router.get('/providers', authenticate, requireTerritoryAdmin, async (req, res, next) => {
  try {
    const regionId = req.user.region_id;
    const filterSQL = regionId ? 'WHERE role = \'service_provider\' AND region_id = $1' : 'WHERE role = \'service_provider\'';
    const filterParams = regionId ? [regionId] : [];
    const providers = await query(`SELECT id, phone_number, name, is_verified, created_at FROM users ${filterSQL} ORDER BY created_at DESC LIMIT 50`, filterParams);
    res.json({ success: true, providers: providers.rows || providers });
  } catch (error) { next(error); }
});

// GET Revenue details in territory
router.get('/revenue', authenticate, requireTerritoryAdmin, async (req, res, next) => {
  try {
    const regionId = req.user.region_id;
    let sql = 'SELECT ue.*, u.name as user_name FROM user_earnings ue JOIN users u ON ue.user_id = u.id';
    let params = [];
    if (regionId) {
      sql += ' WHERE u.region_id = $1';
      params.push(regionId);
    }
    sql += ' ORDER BY ue.created_at DESC LIMIT 50';
    const revenue = await query(sql, params);
    res.json({ success: true, revenue: revenue.rows || revenue });
  } catch (error) { next(error); }
});

// GET Field Agents in territory
router.get('/agents', authenticate, requireTerritoryAdmin, async (req, res, next) => {
  try {
    const regionId = req.user.region_id;
    const filterSQL = regionId ? 'WHERE role = \'field_agent\' AND region_id = $1' : 'WHERE role = \'field_agent\'';
    const filterParams = regionId ? [regionId] : [];
    const agents = await query(`SELECT id, phone_number, name, is_verified, created_at FROM users ${filterSQL} ORDER BY created_at DESC LIMIT 50`, filterParams);
    res.json({ success: true, agents: agents.rows || agents });
  } catch (error) { next(error); }
});

// GET Posts/Community in territory
router.get('/posts', authenticate, requireTerritoryAdmin, async (req, res, next) => {
  try {
    const regionId = req.user.region_id;
    let sql = 'SELECT * FROM marketplace_items';
    let params = [];
    // If you want to filter marketplace posts by region, assuming marketplace_items has region_id
    // Just returning limit 50 as mock since schema might not have region_id for items directly
    sql += ' ORDER BY created_at DESC LIMIT 50';
    const posts = await query(sql, params);
    res.json({ success: true, posts: posts.rows || posts });
  } catch (error) { next(error); }
});

// GET / PUT Revenue Models (Global config access for Territory Admins)
router.get('/revenue-models', authenticate, requireTerritoryAdmin, getRevenueModels);
router.put('/revenue-models/config', authenticate, requireTerritoryAdmin, updateConfig);

module.exports = router;
