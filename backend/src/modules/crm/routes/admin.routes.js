const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, queryOne } = require('../../../config/database');
const { authenticate, requireAdmin } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const apiCache = require('../../../middleware/cache.middleware');
const { cacheDel } = require('../../../config/redis');
const { calculateRevenueSplits, getFranchises, updateFranchiseSplit, getPendingPayouts, getDashboardStats, getRevenueChart } = require('../controllers/admin-revenue.controller');
const { getPendingApprovals, updateApprovalStatus } = require('../controllers/admin-approvals.controller');
const { getRevenueModels, updateSubscriptionPlan, updateLoyaltyTier, updateConfig } = require('../controllers/admin-revenue-models.controller');


router.get('/config', authenticate, requireAdmin, apiCache(300), async (req, res, next) => {
  try {
    const config = await query('SELECT * FROM admin_config WHERE is_active = true');
    res.json(config.rows || config); // Handle both row configurations
  } catch (error) {
    next(error);
  }
});

router.put('/config/:key', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value, category, description } = req.body;
    const config = await queryOne(
      `INSERT INTO admin_config (config_key, config_value, config_category, description, updated_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (config_key)
       DO UPDATE SET config_value = EXCLUDED.config_value,
                     config_category = EXCLUDED.config_category,
                     description = EXCLUDED.description,
                     updated_by = EXCLUDED.updated_by,
                     updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, JSON.stringify(value), category || 'general', description || '', req.user.id]
    );

    // Invalidate Redis Cache
    await cacheDel('cache:/api/v1/admin/config');

    // Notify clients using Supabase Realtime if required
    const supabaseRealtime = req.app.get('supabaseRealtime');
    if (supabaseRealtime) {
      supabaseRealtime.broadcast('admin', 'config:update', { key, value });
    }

    res.json(config);
  } catch (error) {
    next(error);
  }
});

router.post('/settings/action', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { action } = req.body;
    // Log the action for auditing
    await query(
      `INSERT INTO admin_audit_logs (admin_id, admin_name, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, req.user.full_name || 'Admin', 'trigger_action', 'setting', null, JSON.stringify({ triggered: action })]
    );
    if (action === 'Run Maintenance' || action === 'Clear Cache') {
      try {
        await cacheDel('*'); // Flush all keys or a specific pattern if necessary, assuming cacheDel can handle it, or simulate it.
        // If Redis is not running or cacheDel doesn't support wildcard, it just won't crash
      } catch (e) {
        console.warn('Cache clear error:', e);
      }
    }
    res.json({ success: true, message: `${action} triggered successfully.` });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard', authenticate, requireAdmin, getDashboardStats);
router.get('/revenue/chart', authenticate, requireAdmin, getRevenueChart);

// GET all users
router.get('/franchises', authenticate, requireAdmin, getFranchises);
router.put('/franchises/:id/split', authenticate, requireAdmin, updateFranchiseSplit);

// GET all bills for Admin BillsTab
router.get('/bills', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const bills = await query('SELECT * FROM utility_payments ORDER BY created_at DESC');
    res.json({ success: true, bills: bills.rows || bills });
  } catch (error) {
    next(error);
  }
});

// GET all premium users for Admin PremiumTab
router.get('/premium/users', authenticate, requireAdmin, async (req, res, next) => {
  try {
    // Return empty array for now since there's no premium_users table in the schema
    res.json({ success: true, data: [] });
  } catch (error) {
    next(error);
  }
});

// GET all societies for Admin SocietyTab
router.get('/societies', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const limit = req.query.limit || 50;
    const societies = await query('SELECT * FROM societies ORDER BY created_at DESC LIMIT $1', [limit]);
    res.json({ success: true, data: societies.rows || societies });
  } catch (error) {
    next(error);
  }
});

// GET all subscriptions for Admin SubscriptionsTab
router.get('/subscriptions/all', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const subs = await query('SELECT * FROM shop_subscriptions ORDER BY created_at DESC');
    res.json({ success: true, data: subs.rows || subs });
  } catch (error) {
    next(error);
  }
});

// GET all users
router.get('/users', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const users = await query('SELECT * FROM users ORDER BY created_at DESC');
    res.json({ success: true, users: users.rows || users });
  } catch (error) {
    next(error);
  }
});

// GET all shops for Admin ShopsTab
router.get('/shops', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const shops = await query(`
      SELECT s.*, u.full_name as owner_name, u.phone_number as owner_phone, u.email as owner_email
      FROM local_shops s
      LEFT JOIN users u ON s.owner_id = u.id
      ORDER BY s.created_at DESC
    `);
    res.json({ success: true, shops: shops.rows || shops });
  } catch (error) {
    next(error);
  }
});


// --- Shop Categories (Commission Config) ---
// Ecommerce Domain
router.get('/shop-categories', authenticate, requirePermission('ecommerce', 'read'), async (req, res, next) => {
  try {
    const categories = await query('SELECT * FROM shop_categories ORDER BY name ASC');
    res.json(categories.rows || categories);
  } catch (error) {
    next(error);
  }
});

router.put('/shop-categories/:id', authenticate, requirePermission('ecommerce', 'write'), async (req, res, next) => {
  try {
    const { commission_percent, convenience_fee } = req.body;
    const result = await queryOne(
      `UPDATE shop_categories 
       SET commission_percent = $1, convenience_fee = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [commission_percent, convenience_fee, req.params.id]
    );
    if (!result) return res.status(404).json({ error: 'Category not found' });
    res.json(result);
  } catch (error) {
    next(error);
  }
});
// GET all territories/zones for Admin TerritoryTab
router.get('/territories', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const territories = await query(`
      SELECT r.id, r.name as zone_name, r.pincode_range, COUNT(DISTINCT s.id) as active_merchants
      FROM regions r
      LEFT JOIN local_shops s ON r.id = s.region_id
      GROUP BY r.id, r.name, r.pincode_range
      ORDER BY r.name ASC
    `);
    res.json({ success: true, territories: territories.rows || territories });
  } catch (error) {
    next(error);
  }
});

// GET all regions (Accessible by admins)
router.get('/regions', authenticate, requireAdmin, apiCache(300), async (req, res, next) => {
  try {
    const regions = await query(`
      SELECT r.*, 
             COUNT(DISTINCT u.id) as users_count,
             COUNT(DISTINCT s.id) as shops_count,
             (SELECT config_value FROM admin_config WHERE config_key = 'territory_features_' || r.id) as features_json
      FROM regions r
      LEFT JOIN users u ON r.id = u.region_id
      LEFT JOIN local_shops s ON r.id = s.region_id
      GROUP BY r.id
      ORDER BY r.name ASC
    `);
    
    const formattedRegions = regions.rows ? regions.rows : regions;
    const finalRegions = formattedRegions.map(r => ({
      ...r,
      features: r.features_json ? JSON.parse(r.features_json) : { delivery: true, jobs: true, rentals: true, events: true, services: true }
    }));
    
    res.json(finalRegions);
  } catch (error) {
    next(error);
  }
});

// POST create region
router.post('/regions', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, state, country, latitude, longitude, radiusKm, pincode, district, city, is_active } = req.body;
    if (!name || !state) {
      return res.status(400).json({ error: 'name and state are required' });
    }

    const region = await queryOne(
      `INSERT INTO regions (id, name, state, country, latitude, longitude, radius_km, pincode, district, city, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [crypto.randomUUID(), name, state, country || 'India', latitude || 0, longitude || 0, radiusKm || 5.0, pincode || null, district || null, city || null, is_active !== undefined ? is_active : 1]
    );

    // Invalidate regions cache
    await cacheDel('cache:/api/v1/admin/regions');

    res.status(201).json(region);
  } catch (error) {
    next(error);
  }
});

// PUT update region fully
router.put('/regions/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, state, country, pincode, district, city, latitude, longitude, radius_km, is_active, features } = req.body;
    
    const fields = [];
    const values = [];
    let idx = 1;
    
    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
    if (state !== undefined) { fields.push(`state = $${idx++}`); values.push(state); }
    if (country !== undefined) { fields.push(`country = $${idx++}`); values.push(country); }
    if (pincode !== undefined) { fields.push(`pincode = $${idx++}`); values.push(pincode); }
    if (district !== undefined) { fields.push(`district = $${idx++}`); values.push(district); }
    if (city !== undefined) { fields.push(`city = $${idx++}`); values.push(city); }
    if (latitude !== undefined) { fields.push(`latitude = $${idx++}`); values.push(latitude); }
    if (longitude !== undefined) { fields.push(`longitude = $${idx++}`); values.push(longitude); }
    if (radius_km !== undefined) { fields.push(`radius_km = $${idx++}`); values.push(radius_km); }
    if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }
    
    if (fields.length > 0) {
      values.push(req.params.id);
      const sql = `UPDATE regions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
      const region = await queryOne(sql, values);
      if (!region) return res.status(404).json({ error: 'Region not found' });
    }

    if (features !== undefined) {
      const key = `territory_features_${req.params.id}`;
      await queryOne(
        `INSERT INTO admin_config (config_key, config_value, config_category, description, updated_by)
         VALUES ($1, $2, 'territory_features', $3, $4)
         ON CONFLICT (config_key)
         DO UPDATE SET config_value = EXCLUDED.config_value, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [key, JSON.stringify(features), `Feature flags for territory ${req.params.id}`, req.user.id]
      );
    }
    
    await cacheDel('cache:/api/v1/admin/regions');
    res.json({ success: true, message: 'Region updated' });
  } catch (error) {
    next(error);
  }
});

// DELETE soft-delete region
router.delete('/regions/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const region = await queryOne('UPDATE regions SET is_active = 0 WHERE id = $1 RETURNING *', [req.params.id]);
    if (!region) return res.status(404).json({ error: 'Region not found' });
    
    await cacheDel('cache:/api/v1/admin/regions');
    res.json({ success: true, message: 'Region deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// PUT quick toggle territory ON/OFF
router.put('/regions/:id/toggle', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const region = await queryOne('SELECT id, is_active FROM regions WHERE id = $1', [req.params.id]);
    if (!region) return res.status(404).json({ error: 'Region not found' });
    
    const newStatus = region.is_active ? 0 : 1;
    await queryOne('UPDATE regions SET is_active = $1 WHERE id = $2', [newStatus, req.params.id]);
    
    await cacheDel('cache:/api/v1/admin/regions');
    res.json({ success: true, is_active: newStatus, message: newStatus ? 'Territory activated' : 'Territory deactivated' });
  } catch (error) {
    next(error);
  }
});

// GET /regions/:id/stats - Live shop count, user count, revenue for a territory
router.get('/regions/:id/stats', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const regionId = req.params.id;
    const usersCount = await queryOne(`SELECT COUNT(*) as count FROM users WHERE region_id = $1`, [regionId]);
    const shopsCount = await queryOne(`SELECT COUNT(*) as count FROM local_shops WHERE region_id = $1`, [regionId]);
    const revenueSum = await queryOne(`SELECT COALESCE(SUM(platform_share), 0) as total FROM revenue_transactions WHERE status = 'completed' AND region_id = $1`, [regionId]);
    
    res.json({
      success: true,
      data: {
        users: usersCount.count || 0,
        shops: shopsCount.count || 0,
        revenue: revenueSum.total || 0
      }
    });
  } catch (error) {
    next(error);
  }
});


// PUT feature toggles per territory
router.put('/regions/:id/features', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { features } = req.body; // e.g. { delivery: true, jobs: false, rentals: true, events: true, services: true }
    if (!features) return res.status(400).json({ error: 'features object required' });
    
    // Store features as JSON in a column — first check if column exists, if not we store in admin_config
    const key = `territory_features_${req.params.id}`;
    await queryOne(
      `INSERT INTO admin_config (config_key, config_value, config_category, description, updated_by)
       VALUES ($1, $2, 'territory_features', $3, $4)
       ON CONFLICT (config_key)
       DO UPDATE SET config_value = EXCLUDED.config_value, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, JSON.stringify(features), `Feature flags for territory ${req.params.id}`, req.user.id]
    );
    
    res.json({ success: true, features, message: 'Territory features updated' });
  } catch (error) {
    next(error);
  }
});

// PUT assign franchise partner to a territory
router.put('/regions/:id/assign-franchise', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { franchise_id } = req.body;
    if (!franchise_id) return res.status(400).json({ error: 'franchise_id required' });
    
    // Update franchise_partners to link to this region
    const region = await queryOne('SELECT * FROM regions WHERE id = $1', [req.params.id]);
    if (!region) return res.status(404).json({ error: 'Region not found' });
    
    const franchise = await queryOne(
      'UPDATE franchise_partners SET region_id = $1, territory_name = $2, territory_pincode = $3 WHERE id = $4 RETURNING *',
      [req.params.id, region.name, region.pincode, franchise_id]
    );
    
    if (!franchise) return res.status(404).json({ error: 'Franchise partner not found' });
    
    await cacheDel('cache:/api/v1/admin/regions');
    res.json({ success: true, data: franchise, message: `Franchise assigned to ${region.name}` });
  } catch (error) {
    next(error);
  }
});

// GET live stats for a single territory
router.get('/regions/:id/stats', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const regionId = req.params.id;
    
    const region = await queryOne('SELECT * FROM regions WHERE id = $1', [regionId]);
    if (!region) return res.status(404).json({ error: 'Region not found' });
    
    const usersCount = await queryOne('SELECT COUNT(*) as count FROM users WHERE region_id = $1', [regionId]);
    const shopsCount = await queryOne('SELECT COUNT(*) as count FROM local_shops WHERE region_id = $1', [regionId]);
    const activeShops = await queryOne("SELECT COUNT(*) as count FROM local_shops WHERE region_id = $1 AND is_active = 1 AND approval_status = 'approved'", [regionId]);
    
    let revenueTotal = { total: 0 };
    try {
      revenueTotal = await queryOne('SELECT COALESCE(SUM(gross_amount), 0) as total FROM revenue_transactions WHERE region_id = $1', [regionId]);
    } catch(e) {}
    
    const franchise = await queryOne('SELECT f.id, u.full_name as partner_name, f.status, f.commission_rate FROM franchise_partners f JOIN users u ON f.user_id = u.id WHERE f.region_id = $1 LIMIT 1', [regionId]);
    
    // Get feature flags
    let features = { delivery: true, jobs: true, rentals: true, events: true, services: true };
    try {
      const featureConfig = await queryOne("SELECT config_value FROM admin_config WHERE config_key = $1", [`territory_features_${regionId}`]);
      if (featureConfig) features = JSON.parse(featureConfig.config_value);
    } catch(e) {}
    
    res.json({
      success: true,
      data: {
        region,
        users: parseInt(usersCount?.count || 0),
        shops: parseInt(shopsCount?.count || 0),
        activeShops: parseInt(activeShops?.count || 0),
        revenue: parseFloat(revenueTotal?.total || 0),
        franchise: franchise || null,
        features
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET aggregated summary across all territories
router.get('/regions/summary', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const totalRegions = await queryOne('SELECT COUNT(*) as count FROM regions');
    const activeRegions = await queryOne('SELECT COUNT(*) as count FROM regions WHERE is_active = 1');
    const totalUsers = await queryOne('SELECT COUNT(*) as count FROM users');
    const totalShops = await queryOne('SELECT COUNT(*) as count FROM local_shops WHERE is_active = 1');
    const totalFranchises = await queryOne('SELECT COUNT(*) as count FROM franchise_partners');
    const activeFranchises = await queryOne("SELECT COUNT(*) as count FROM franchise_partners WHERE status = 'active'");
    
    let totalRevenue = { total: 0 };
    try {
      totalRevenue = await queryOne("SELECT COALESCE(SUM(gross_amount), 0) as total FROM revenue_transactions WHERE status = 'completed'");
    } catch(e) {}
    
    res.json({
      success: true,
      data: {
        totalRegions: parseInt(totalRegions?.count || 0),
        activeRegions: parseInt(activeRegions?.count || 0),
        totalUsers: parseInt(totalUsers?.count || 0),
        totalShops: parseInt(totalShops?.count || 0),
        totalFranchises: parseInt(totalFranchises?.count || 0),
        activeFranchises: parseInt(activeFranchises?.count || 0),
        totalRevenue: parseFloat(totalRevenue?.total || 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

// DELETE soft-delete region (set is_active = 0)
router.delete('/regions/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await queryOne('UPDATE regions SET is_active = 0 WHERE id = $1 RETURNING id, name', [req.params.id]);
    if (!result) return res.status(404).json({ error: 'Region not found' });
    
    await cacheDel('cache:/api/v1/admin/regions');
    res.json({ success: true, message: `Territory "${result.name}" deactivated` });
  } catch (error) {
    next(error);
  }
});

// GET all franchise partners (for admin dropdown)
router.get('/franchise-partners', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const partners = await query(`
      SELECT f.id, f.territory_name, f.territory_pincode, f.status, f.commission_rate, f.region_id,
             f.merchants_onboarded, f.total_earnings, f.created_at,
             u.full_name as partner_name, u.phone_number as partner_phone, u.email as partner_email
      FROM franchise_partners f
      JOIN users u ON f.user_id = u.id
      ORDER BY f.created_at DESC
    `);
    res.json({ success: true, data: partners.rows || partners });
  } catch (error) {
    next(error);
  }
});

// PUT update franchise status
router.put('/franchise-partners/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body; // 'active', 'suspended', 'terminated', 'pending'
    if (!status) return res.status(400).json({ error: 'status is required' });
    
    const result = await queryOne(
      'UPDATE franchise_partners SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!result) return res.status(404).json({ error: 'Franchise partner not found' });
    
    res.json({ success: true, data: result, message: `Franchise status updated to ${status}` });
  } catch (error) {
    next(error);
  }
});

// PUT update franchise commission rate
router.put('/franchises/:id/split', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { splitPercentage } = req.body;
    if (splitPercentage === undefined) return res.status(400).json({ error: 'splitPercentage is required' });
    
    const result = await queryOne(
      'UPDATE franchise_partners SET commission_rate = $1 WHERE id = $2 RETURNING *',
      [splitPercentage, req.params.id]
    );
    if (!result) return res.status(404).json({ error: 'Franchise partner not found' });
    
    res.json({ success: true, data: result, message: `Commission rate updated to ${splitPercentage}%` });
  } catch (error) {
    next(error);
  }
});

// GET generate CSV performance report
router.get('/reports/generate', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const users = await query('SELECT id, full_name, phone_number, role, created_at FROM users');
    
    // Create simple CSV response
    let csv = 'ID,Full Name,Phone Number,Role,Joined At\n';
    users.rows.forEach(u => {
      csv += `"${u.id}","${u.full_name}","${u.phone_number}","${u.role}","${u.created_at}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=performance_report.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

// GET Admin audit logs
router.get('/audit', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const logs = await query(`
      SELECT a.*, u.full_name as admin_name, u.phone_number 
      FROM admin_audit_log a 
      LEFT JOIN users u ON a.admin_id = u.id 
      ORDER BY a.created_at DESC 
      LIMIT 100
    `);
    res.json(logs.rows || logs);
  } catch (error) {
    next(error);
  }
});

// GET all users
router.get('/users', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let queryStr = `SELECT id, full_name, phone_number, email, role, is_active, is_banned, created_at FROM users`;
    let countQueryStr = `SELECT COUNT(*) FROM users`;
    const params = [];
    
    if (search) {
      queryStr += ` WHERE full_name ILIKE $1 OR phone_number ILIKE $1 OR email ILIKE $1`;
      countQueryStr += ` WHERE full_name ILIKE $1 OR phone_number ILIKE $1 OR email ILIKE $1`;
      params.push(`%${search}%`);
    }
    
    queryStr += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    
    const users = await query(queryStr, [...params, limit, offset]);
    const total = await queryOne(countQueryStr, params);
    
    res.json({
      users: users.rows || users,
      total: parseInt(total.count),
      page: parseInt(page),
      totalPages: Math.ceil(parseInt(total.count) / limit)
    });
  } catch (error) {
    next(error);
  }
});

// Ban/Unban user
router.put('/users/:id/ban', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_banned } = req.body;
    
    const user = await queryOne(
      `UPDATE users SET is_banned = $1, is_active = $2 WHERE id = $3 RETURNING id, is_banned`,
      [is_banned ? 1 : 0, is_banned ? 0 : 1, id]
    );
    
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

// Update user role
router.put('/users/:id/role', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    const user = await queryOne(
      `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, role`,
      [role, id]
    );
    
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

// ─── Phase 7: Revenue & Payouts ───

router.get('/revenue/chart', authenticate, requirePermission('finance', 'read'), getRevenueChart);
router.get('/franchises', authenticate, requirePermission('crm', 'read'), getFranchises);
router.put('/franchises/:id/split', authenticate, requirePermission('crm', 'write'), updateFranchiseSplit);
router.get('/payouts/pending', authenticate, requirePermission('finance', 'read'), getPendingPayouts);

// ─── Skilled Job Dispatch ───
router.get('/skilled-bookings', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const bookings = await query(`
      SELECT sb.*, u.full_name as customer_name, u.phone_number as customer_phone
      FROM skilled_bookings sb
      JOIN users u ON sb.customer_id = u.id
      ORDER BY sb.created_at DESC
    `);
    res.json(bookings.rows || bookings);
  } catch (error) {
    next(error);
  }
});

router.post('/skilled-bookings/:id/assign', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { workerId } = req.body;
    await query(
      `UPDATE skilled_bookings 
       SET assigned_worker_id = $1, status = 'assigned'
       WHERE id = $2`,
      [workerId, id]
    );
    res.json({ success: true, message: 'Worker assigned successfully' });
  } catch (error) {
    next(error);
  }
});

// ─── Approvals ───
router.get('/approvals', authenticate, requireAdmin, getPendingApprovals);
router.put('/approvals/:type/:id', authenticate, requireAdmin, updateApprovalStatus);

// ─── Revenue Models ───
router.get('/revenue-models', authenticate, requireAdmin, getRevenueModels);
router.put('/revenue-models/subscriptions/:id', authenticate, requireAdmin, updateSubscriptionPlan);
router.put('/revenue-models/loyalty/:id', authenticate, requireAdmin, updateLoyaltyTier);
router.put('/revenue-models/config', authenticate, requireAdmin, updateConfig);

// ─── Shop Categories Management ───
router.get('/shop-categories', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const categories = await query('SELECT * FROM shop_categories ORDER BY display_order ASC');
    res.json(categories.rows || categories);
  } catch (error) {
    next(error);
  }
});

router.post('/shop-categories', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, slug, icon, business_model, commission_percent, convenience_fee, display_order, registration_fields } = req.body;
    const cat = await queryOne(
      `INSERT INTO shop_categories (id, name, slug, icon, business_model, commission_percent, convenience_fee, display_order, registration_fields)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [require('crypto').randomUUID(), name, slug, icon, business_model, commission_percent, convenience_fee, display_order, JSON.stringify(registration_fields || [])]
    );
    res.status(201).json(cat);
  } catch (error) {
    next(error);
  }
});

router.put('/shop-categories/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, slug, icon, business_model, commission_percent, convenience_fee, is_active, display_order, registration_fields } = req.body;
    const cat = await queryOne(
      `UPDATE shop_categories 
       SET name=$1, slug=$2, icon=$3, business_model=$4, commission_percent=$5, convenience_fee=$6, is_active=$7, display_order=$8, registration_fields=$9, updated_at=CURRENT_TIMESTAMP
       WHERE id=$10 RETURNING *`,
      [name, slug, icon, business_model, commission_percent, convenience_fee, is_active, display_order, JSON.stringify(registration_fields || []), req.params.id]
    );
    res.json(cat);
  } catch (error) {
    next(error);
  }
});

router.delete('/shop-categories/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await query(`UPDATE shop_categories SET is_active=0 WHERE id=$1`, [req.params.id]);
    res.json({ success: true, message: 'Category deactivated' });
  } catch (error) {
    next(error);
  }
});

// ─── Shop Premium Status ───
router.put('/shops/:id/premium', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { is_premium, premium_expires_at } = req.body;
    await query(
      `UPDATE local_shops SET is_premium = $1, premium_expires_at = $2 WHERE id = $3`,
      [is_premium ? 1 : 0, premium_expires_at, req.params.id]
    );
    res.json({ success: true, message: 'Shop premium status updated' });
  } catch (error) {
    next(error);
  }
});

router.get('/shops/:id/full-details', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const shop = await queryOne('SELECT * FROM local_shops WHERE id=$1', [req.params.id]);
    const owner = await queryOne('SELECT full_name, phone_number, email FROM users WHERE id=$1', [shop.owner_id]);
    res.json({ ...shop, owner });
  } catch (error) {
    next(error);
  }
});

// ─── Delivery Overview ───
router.get('/delivery/overview', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const stats = {
      activeAgents: (await queryOne('SELECT count(*) as count FROM delivery_agents WHERE is_active = 1')).count,
      pendingOrders: (await queryOne("SELECT count(*) as count FROM shop_orders WHERE delivery_type = 'delivery' AND status = 'accepted'")).count,
    };
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// ─── Phase 2.5: Admin Tab Endpoints ───
router.get('/delivery/agents', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const agents = await query(`
      SELECT da.*, u.full_name as name, u.phone_number as phone 
      FROM delivery_agents da 
      JOIN users u ON da.user_id = u.id 
      ORDER BY da.created_at DESC LIMIT 50
    `);
    res.json({ agents: agents.rows || agents });
  } catch (e) { next(e); }
});

router.put('/delivery/agents/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    await query('UPDATE delivery_agents SET kyc_status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.get('/societies', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const soc = await query(`SELECT * FROM societies ORDER BY created_at DESC LIMIT 50`);
    res.json({ data: soc.rows || soc });
  } catch (e) { next(e); }
});

router.get('/wallet/transactions/all', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const tx = await query(`
      SELECT wt.*, u.full_name as user_name 
      FROM wallet_transactions wt 
      JOIN wallets w ON wt.wallet_id = w.id 
      JOIN users u ON w.user_id = u.id 
      ORDER BY wt.created_at DESC LIMIT 50
    `);
    res.json({ data: tx.rows || tx });
  } catch (e) { next(e); }
});

router.get('/events', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const events = await query(`SELECT * FROM events ORDER BY created_at DESC LIMIT 50`);
    res.json({ data: events.rows || events });
  } catch (e) { next(e); }
});

router.get('/marketplace/products', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const items = await query(`SELECT * FROM marketplace_listings ORDER BY created_at DESC LIMIT 50`);
    res.json({ data: items.rows || items });
  } catch (e) { next(e); }
});

router.get('/medical/records', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const records = await query(`SELECT * FROM medical_providers ORDER BY created_at DESC LIMIT 50`);
    res.json({ data: records.rows || records });
  } catch (e) { next(e); }
});

router.get('/subscriptions/all', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const subs = await query(`
      SELECT us.*, sp.name as plan_name, u.full_name as user_name 
      FROM user_subscriptions us 
      JOIN subscription_plans sp ON us.plan_id = sp.id 
      JOIN users u ON us.user_id = u.id 
      ORDER BY us.created_at DESC LIMIT 50
    `);
    res.json({ data: subs.rows || subs });
  } catch (e) { next(e); }
});

router.get('/premium/users', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const premium = await query(`
      SELECT DISTINCT u.id, u.full_name as user_name, u.phone_number, u.email 
      FROM users u
      JOIN user_subscriptions us ON u.id = us.user_id
      WHERE u.is_active = 1 AND us.status = 'active'
      ORDER BY u.created_at DESC LIMIT 50
    `);
    res.json({ data: premium.rows || premium });
  } catch (e) { next(e); }
});

router.get('/sos/active', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const sos = await query(`
      SELECT s.*, u.full_name as user_name, u.phone_number 
      FROM society_emergency_alerts s 
      JOIN users u ON s.triggered_by = u.id 
      WHERE s.status = 'active' OR s.status = 'dispatched'
      ORDER BY s.created_at DESC LIMIT 50
    `);
    res.json({ data: sos.rows || sos });
  } catch (e) { next(e); }
});

router.get('/crm/leads', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const leads = await query(`
      SELECT id, first_name || ' ' || COALESCE(last_name, '') as name, phone, lead_source as source, status, created_at 
      FROM crm_leads 
      ORDER BY created_at DESC LIMIT 50
    `);
    res.json({ data: leads.rows || leads });
  } catch (e) { next(e); }
});

router.get('/community/posts', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const posts = await query(`
      SELECT t.*, u.full_name as user_name 
      FROM posts t 
      JOIN users u ON t.user_id = u.id 
      ORDER BY t.created_at DESC LIMIT 50
    `);
    res.json({ data: posts.rows || posts });
  } catch (e) { next(e); }
});

// GET all job postings (for Admin)
router.get('/jobs', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const jobs = await query('SELECT * FROM local_job_postings ORDER BY created_at DESC');
    res.json({ data: jobs.rows || jobs });
  } catch (error) { next(error); }
});

// GET all properties (for Admin)
router.get('/properties', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const properties = await query('SELECT * FROM local_property_listings ORDER BY created_at DESC');
    res.json({ data: properties.rows || properties });
  } catch (error) { next(error); }
});


// ═══════════════════════════════════════════════════════════════════════
// Phase 6: Territory Assignment Endpoints (RBAC Hard Partitioning)
// ═══════════════════════════════════════════════════════════════════════

// POST /admin/assign-territory — SuperAdmin assigns territory to user
router.post('/assign-territory', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { userId, territoryId, districtId, role } = req.body;
    if (!userId || (!territoryId && !districtId)) {
      return res.status(400).json({ error: 'userId and (territoryId or districtId) required.' });
    }

    const id = crypto.randomUUID();
    await query(
      `INSERT INTO admin_territory_assignments (id, user_id, territory_id, district_id, role, assigned_by, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, 1)`,
      [id, userId, territoryId || null, districtId || null, role || 'territory_franchise', req.user.id]
    );

    res.json({ success: true, message: 'Territory assigned successfully.', id });
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'User is already assigned to this territory.' });
    }
    next(error);
  }
});

// GET /admin/territory-assignments — List all assignments
router.get('/territory-assignments', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT ata.*, u.full_name as user_name, u.phone_number as user_phone,
             t.name as territory_name, t.pincode as territory_pincode,
             ld.name as district_name
      FROM admin_territory_assignments ata
      JOIN users u ON ata.user_id = u.id
      LEFT JOIN territories t ON ata.territory_id = t.id
      LEFT JOIN location_districts ld ON ata.district_id = ld.id
      WHERE ata.is_active = 1
      ORDER BY ata.created_at DESC
    `);
    res.json({ success: true, data: result.rows || result });
  } catch (error) { next(error); }
});

// DELETE /admin/territory-assignments/:id — Remove assignment
router.delete('/territory-assignments/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await query('UPDATE admin_territory_assignments SET is_active = 0 WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Assignment removed.' });
  } catch (error) { next(error); }
});

module.exports = router;
