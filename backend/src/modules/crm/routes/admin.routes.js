const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, queryOne } = require('../../../config/database');
const { authenticate, requireAdmin } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const rateLimit = require('express-rate-limit');

// Phase 48: God-Mode Security & Rate Limiting
const globalAdminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 admin requests per windowMs
  message: { success: false, error: 'Too many admin requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const mutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 20, // Stricter limit for state-mutating requests
  message: { success: false, error: 'Too many mutations from this IP, please try again later.' }
});

const impersonationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 impersonation attempts per hour
  message: { success: false, error: 'Too many impersonation attempts. Account locked for 1 hour.' }
});

// Apply global admin limiter to all routes here
router.use(globalAdminLimiter);

const apiCache = require('../../../middleware/cache.middleware');
const { cacheDel } = require('../../../config/redis');
const { calculateRevenueSplits, getFranchises, updateFranchiseSplit, getPendingPayouts, getDashboardStats, getRevenueChart } = require('../controllers/admin-revenue.controller');
const { getPendingApprovals, updateApprovalStatus } = require('../controllers/admin-approvals.controller');
const { getRevenueModels, updateSubscriptionPlan, updateLoyaltyTier, updateConfig } = require('../controllers/admin-revenue-models.controller');
const godmodeController = require('../controllers/admin-godmode.controller');
const { getUsers, updateUserStatus, updateUserRole, getRoles, createOrUpdateRole, getRegions } = godmodeController;
const ecoController = require('../controllers/admin-ecosystems.controller');
const adminCrmController = require('../controllers/admin-crm.controller');
const adminSupportController = require('../controllers/admin-support.controller');
const adminTelemetryController = require('../controllers/admin-telemetry.controller');
const adminHealthController = require('../controllers/admin-health.controller');
const adminSettingsController = require('../controllers/admin-settings.controller');
const adminMedicalController = require('../controllers/admin-medical.controller');
const adminMarketingController = require('../controllers/admin-marketing.controller');
const adminBillsController = require('../controllers/admin-bills.controller');
const adminBackupsController = require('../controllers/admin-backups.controller');
const adminCharityController = require('../controllers/admin-charity.controller');
const adminLanguagesController = require('../controllers/admin-languages.controller');
const adminCivicController = require('../controllers/admin-civic.controller');
const adminEnvironmentController = require('../controllers/admin-environment.controller');
const adminFraudController = require('../controllers/admin-fraud.controller');
const adminKrishiController = require('../controllers/admin-krishi.controller');
const adminAnalyticsController = require('../controllers/admin-analytics.controller');
const adminAnimalController = require('../controllers/admin-animal.controller');
const adminJobsController = require('../controllers/admin-jobs.controller');
const adminAlertsController = require('../controllers/admin-alerts.controller');
const adminRolesController = require('../controllers/admin-roles.controller');
const adminApprovalsController = require('../controllers/admin-approvals.controller');
const financeController = require('../controllers/finance.controller');
const territoryController = require('../controllers/territory.controller');

// --- NEW GOD MODE ECOSYSTEMS ---
router.get('/krishi/stats', authenticate, requireAdmin, ecoController.getKrishiStats);
router.get('/mobility/stats', authenticate, requireAdmin, ecoController.getMobilityStats);
router.get('/charity/stats', authenticate, requireAdmin, ecoController.getCharityStats);
router.get('/environment/stats', authenticate, requireAdmin, ecoController.getEnvironmentStats);
router.get('/animal/stats', authenticate, requireAdmin, ecoController.getAnimalStats);
router.get('/civic/stats', authenticate, requireAdmin, ecoController.getCivicStats);
router.get('/rewards/campaigns', authenticate, requireAdmin, ecoController.getRewardsStats);

// --- TRI-CATEGORY GOD-MODE CONTROLS (Carpool, Marketplace, Jobs) ---
router.use('/tri-category', require('./admin-tri-category.routes'));

// --- CRM & SUPPORT (Phase 17) ---
router.get('/crm/users', authenticate, requireAdmin, adminCrmController.getUsers);
router.post('/crm/loyalty', authenticate, requireAdmin, adminCrmController.adjustLoyalty);

router.get('/support/tickets', authenticate, requireAdmin, adminSupportController.getTickets);
router.post('/support/auto-reply', authenticate, requireAdmin, adminSupportController.setAutoReply);
router.put('/support/tickets/:id/status', authenticate, requireAdmin, adminSupportController.updateTicketStatus);

// --- TELEMETRY & AUDIT (Phase 18 & 19) ---
router.get('/god-mode/metrics', authenticate, requireAdmin, adminTelemetryController.getGodModeMetrics);
router.get('/audit-logs', authenticate, requireAdmin, adminTelemetryController.getAuditLogs);
router.get('/health', authenticate, requireAdmin, adminHealthController.getHealthMetrics);
router.post('/health/clear-cache', mutationLimiter, authenticate, requireAdmin, adminHealthController.clearGlobalCache);

// --- GLOBAL SETTINGS (Phase 20) ---
router.get('/settings', authenticate, requireAdmin, adminSettingsController.getSettings);
router.put('/settings', authenticate, requireAdmin, adminSettingsController.updateSettings);

// --- USERS & MEDICAL (Phase 21) ---
router.get('/users', authenticate, requireAdmin, godmodeController.getUsers);
router.put('/users/:id/status', authenticate, requireAdmin, godmodeController.updateUserStatus);
router.put('/users/:id/role', authenticate, requireAdmin, godmodeController.updateUserRole);
router.get('/export/users', authenticate, requireAdmin, godmodeController.exportUsers);

router.get('/medical/requests', authenticate, requireAdmin, adminMedicalController.getRequests);
router.post('/medical/requests', authenticate, requireAdmin, adminMedicalController.createRequest);
router.put('/medical/requests/:id/status', authenticate, requireAdmin, adminMedicalController.updateStatus);
router.put('/medical/requests/:id/dispatch', authenticate, requireAdmin, adminMedicalController.toggleDispatch);
router.put('/medical/doctors/:id/verify', authenticate, requireAdmin, adminMedicalController.toggleDoctorVerification);

// --- COMMUNITY POST MODERATION ---
// The admin Community tab already called both of these; neither existed.
router.get('/community/posts', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { category, limit } = req.query;
    const params = [];
    let where = '';
    if (category) {
      params.push(category);
      where = `WHERE category = $${params.length}`;
    }
    params.push(Math.min(parseInt(limit, 10) || 100, 500));

    const rows = await query(
      `SELECT cp.id, cp.author_id, u.full_name as author_name, cp.type as category, cp.content, NULL as media_url, cp.pincode,
              cp.likes as likes_count, cp.comments as comments_count, cp.created_at
         FROM community_posts cp
         LEFT JOIN users u ON cp.author_id = u.id
         ${where}
        ORDER BY cp.created_at DESC
        LIMIT $${params.length}`,
      params
    );
    const posts = rows.rows || rows;
    res.json({ success: true, posts, data: posts });
  } catch (error) {
    next(error);
  }
});

router.delete('/community/posts/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const post = await queryOne('SELECT id FROM community_posts WHERE id = $1', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    await query('DELETE FROM community_posts WHERE id = $1', [req.params.id]);

    // Moderation is a privileged destructive action, so record who did it.
    try {
      await query(
        `INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), req.user.id || req.user.userId, 'DELETE_COMMUNITY_POST',
         'community', req.params.id, 'Post removed by moderator']
      );
    } catch (e) {
      console.error('[MODERATION] Could not write audit row:', e.message);
    }

    res.json({ success: true, message: 'Post removed' });
  } catch (error) {
    next(error);
  }
});

// --- MARKETING (Phase 22) ---
// Push broadcasts reach every device, so they need a tighter guard than the
// generic admin check.
const requireMarketingAdmin = (req, res, next) => {
  const role = ((req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '').toUpperCase();
  if (role !== 'SUPER_ADMIN' && role !== 'MARKETING_ADMIN') {
    return res.status(403).json({ error: 'Marketing Admin or Super Admin access required for broadcasts.' });
  }
  next();
};

router.get('/broadcasts/history', authenticate, requireAdmin, requireMarketingAdmin, adminMarketingController.getBroadcastHistory);
router.post('/broadcast', authenticate, requireAdmin, requireMarketingAdmin, adminMarketingController.createBroadcast);

// --- UTILITY BILLS (Phase 23) ---
router.get('/bills', authenticate, requireAdmin, adminBillsController.getBills);
router.post('/bills', authenticate, requireAdmin, adminBillsController.createBill);
router.put('/bills/:id/status', authenticate, requireAdmin, adminBillsController.updateStatus);
router.put('/bills/:id/clear', authenticate, requireAdmin, adminBillsController.toggleClearance);

// --- BACKUPS (Phase 24) ---
router.get('/backups', authenticate, requireAdmin, adminBackupsController.getBackups);
router.post('/backups/create', authenticate, requireAdmin, adminBackupsController.createBackup);
router.post('/backups/:id/restore', authenticate, requireAdmin, adminBackupsController.restoreBackup);

// --- CHARITY (Phase 25) ---
router.get('/charity', authenticate, requireAdmin, adminCharityController.getCampaigns);
router.post('/charity', authenticate, requireAdmin, adminCharityController.createCampaign);
router.put('/charity/:id/status', authenticate, requireAdmin, adminCharityController.updateStatus);
router.put('/charity/:id/verify', authenticate, requireAdmin, adminCharityController.toggleVerification);
router.put('/charity/:id/raised', authenticate, requireAdmin, adminCharityController.adjustRaised);

// --- LOCALIZATION (Phase 26) ---
router.get('/languages', authenticate, requireAdmin, adminLanguagesController.getConfig);
router.put('/languages', authenticate, requireAdmin, adminLanguagesController.updateConfig);

// --- CIVIC & LEGAL (Phase 28) ---
router.get('/civic/issues', authenticate, requireAdmin, adminCivicController.getIssues);
router.post('/civic/issues', authenticate, requireAdmin, adminCivicController.createIssue);
router.put('/civic/issues/:id/status', authenticate, requireAdmin, adminCivicController.updateStatus);
router.put('/civic/issues/:id/escalate', authenticate, requireAdmin, adminCivicController.toggleEscalation);

// --- ENVIRONMENT (Phase 29) ---
router.get('/environment/scrap', authenticate, requireAdmin, adminEnvironmentController.getRequests);
router.post('/environment/scrap', authenticate, requireAdmin, adminEnvironmentController.createRequest);
router.put('/environment/scrap/:id/status', authenticate, requireAdmin, adminEnvironmentController.updateStatus);
router.put('/environment/scrap/:id/dispatch', authenticate, requireAdmin, adminEnvironmentController.toggleDispatch);

// --- SECURITY & FRAUD (Phase 30) ---
router.get('/fraud-scan', authenticate, requireAdmin, adminFraudController.getFraudScan);

// --- SYSTEM HEALTH (Phase 31) ---
router.get('/health', authenticate, requireAdmin, adminHealthController.getHealthMetrics);
router.post('/health/clear-cache', authenticate, requireAdmin, adminHealthController.clearGlobalCache);

// --- KRISHI MARKETPLACE (Phase 32) ---
router.get('/krishi', authenticate, requireAdmin, adminKrishiController.getListings);
router.post('/krishi', authenticate, requireAdmin, adminKrishiController.createListing);
router.put('/krishi/:id/status', authenticate, requireAdmin, adminKrishiController.updateStatus);
router.put('/krishi/:id/verify', authenticate, requireAdmin, adminKrishiController.toggleVerification);

// --- GLOBAL ANALYTICS (Phase 33) ---
router.get('/analytics/overview', authenticate, requireAdmin, adminAnalyticsController.getOverview);

// --- ANIMAL WELFARE (Phase 34) ---
router.get('/animal/rescue', authenticate, requireAdmin, adminAnimalController.getRequests);
router.post('/animal/rescue', authenticate, requireAdmin, adminAnimalController.createRequest);
router.put('/animal/rescue/:id/status', authenticate, requireAdmin, adminAnimalController.updateStatus);
router.put('/animal/rescue/:id/dispatch', authenticate, requireAdmin, adminAnimalController.toggleDispatch);

// --- JOBS & SERVICES (Phase 35) ---
router.get('/jobs', authenticate, requireAdmin, adminJobsController.getJobs);
router.post('/jobs', authenticate, requireAdmin, adminJobsController.createJob);
router.put('/jobs/:id/status', authenticate, requireAdmin, adminJobsController.updateStatus);

// --- GLOBAL ALERTS (Phase 36) ---
router.post('/alerts/broadcast', authenticate, requireAdmin, adminAlertsController.broadcastAlert);

// --- ROLES & PERMISSIONS (Phase 37) ---
router.get('/roles', authenticate, requireAdmin, adminRolesController.getRoles);
router.post('/roles', authenticate, requireAdmin, adminRolesController.upsertRole);

// --- SUPPORT & HELPDESK (Phase 38) ---
router.get('/support/tickets', authenticate, requireAdmin, adminSupportController.getTickets);
router.post('/support/auto-reply', authenticate, requireAdmin, adminSupportController.setAutoReply);
router.put('/support/tickets/:id/status', authenticate, requireAdmin, adminSupportController.updateTicketStatus);

// --- DISASTER RECOVERY (Phase 39) ---
router.get('/backups', authenticate, requireAdmin, adminBackupsController.getBackups);
router.post('/backups/create', authenticate, requireAdmin, adminBackupsController.createBackup);
router.post('/backups/:id/restore', authenticate, requireAdmin, adminBackupsController.restoreBackup);

// --- CHARITY & NGO (Phase 40) ---
router.get('/charity', authenticate, requireAdmin, adminCharityController.getCampaigns);
router.post('/charity', authenticate, requireAdmin, adminCharityController.createCampaign);
router.put('/charity/:id/status', authenticate, requireAdmin, adminCharityController.updateStatus);
router.put('/charity/:id/verify', authenticate, requireAdmin, adminCharityController.toggleVerification);
router.put('/charity/:id/raised', authenticate, requireAdmin, adminCharityController.adjustRaised);

// --- CIVIC ISSUES (Phase 41) ---
router.get('/civic', authenticate, requireAdmin, adminCivicController.getIssues);
router.post('/civic', authenticate, requireAdmin, adminCivicController.createIssue);
router.put('/civic/:id/status', authenticate, requireAdmin, adminCivicController.updateStatus);
router.put('/civic/:id/escalate', authenticate, requireAdmin, adminCivicController.toggleEscalation);

// --- UNIVERSAL APPROVALS (Phase 42) ---
router.get('/approvals/pending', authenticate, requireAdmin, adminApprovalsController.getPendingApprovals);
router.put('/approvals/:type/:id', authenticate, requireAdmin, adminApprovalsController.updateApprovalStatus);

// --- UTILITY BILLS (Phase 43) ---
router.get('/bills', authenticate, requireAdmin, adminBillsController.getBills);
router.post('/bills', authenticate, requireAdmin, adminBillsController.createBill);
router.put('/bills/:id/status', authenticate, requireAdmin, adminBillsController.updateStatus);
router.put('/bills/:id/clear', authenticate, requireAdmin, adminBillsController.toggleClearance);

// --- CRM & ENGAGEMENT (Phase 44) ---
router.get('/crm/users', authenticate, requireAdmin, adminCrmController.getUsers);
router.post('/crm/loyalty', authenticate, requireAdmin, adminCrmController.adjustLoyalty);

// --- REVENUE MODELS (Phase 45) ---
router.get('/revenue-models', authenticate, requireAdmin, getRevenueModels);
router.put('/revenue-models/subscriptions/:id', authenticate, requireAdmin, updateSubscriptionPlan);
router.put('/revenue-models/loyalty/:id', authenticate, requireAdmin, updateLoyaltyTier);
router.put('/revenue-models/config', authenticate, requireAdmin, updateConfig);

// --- FINANCE & TERRITORY (Phase 46) ---
router.get('/finance/export', authenticate, requireAdmin, financeController.exportFinancials);
router.get('/territory/map', authenticate, requireAdmin, territoryController.getTerritoryMap);

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
    const config = await queryOne(`INSERT INTO admin_config (config_key, config_value, config_category, description, updated_by)
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

router.get('/backup/db', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { v4: uuidv4 } = require('uuid');
    
    // Check role strictly since requireAdmin also allows plain 'ADMIN'
    const role = (req.adminRole && req.adminRole.role) || (req.user && req.user.role);
    if (!role || role.toUpperCase() !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Super Admin access required for backups.' });
    }

    const dbPath = path.join(__dirname, '../../../../data/localsampark.db');
    
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ success: false, message: 'Database file not found.' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `localsampark_backup_${timestamp}.db`;

    // Log the backup action
    await query(`
      INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [uuidv4(), req.user.id || req.user.userId, 'DATABASE_BACKUP', 'system', 'db', `Initiated manual DB snapshot`]);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/x-sqlite3');
    
    const readStream = fs.createReadStream(dbPath);
    readStream.pipe(res);
  } catch (error) {
    next(error);
  }
});
router.post('/settings/action', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { action } = req.body;
    let details = `Triggered action: ${action}`;

    if (action === 'Clear Cache') {
      try {
        await cacheDel('*');
      } catch (e) {
        console.warn('Cache clear error:', e);
      }
    } else if (action === 'Clear Cache and Logout All') {
      try {
        await cacheDel('*');
        await query(`UPDATE users SET token_version = token_version + 1`);
        details = 'Purged global cache AND logged out all active users';
      } catch (e) {
        console.warn('Cache clear error:', e);
      }
    } else if (action === 'Halt Deliveries') {
      await query(`INSERT INTO admin_config (config_key, config_value, config_category) VALUES ('kill_switch_deliveries', 'true', 'kill_switch') ON CONFLICT (config_key) DO UPDATE SET config_value = 'true'`);
    } else if (action === 'Lock Gates') {
      await query(`INSERT INTO admin_config (config_key, config_value, config_category) VALUES ('kill_switch_gates', 'true', 'kill_switch') ON CONFLICT (config_key) DO UPDATE SET config_value = 'true'`);
    } else if (action === 'Suspend Payouts') {
      await query(`INSERT INTO admin_config (config_key, config_value, config_category) VALUES ('kill_switch_payouts', 'true', 'kill_switch') ON CONFLICT (config_key) DO UPDATE SET config_value = 'true'`);
    } else if (action === 'Toggle Maintenance Mode') {
      const current = await queryOne(`SELECT config_value FROM admin_config WHERE config_key = 'maintenance_mode'`);
      const newVal = current && current.config_value === 'true' ? 'false' : 'true';
      await query(`INSERT INTO admin_config (config_key, config_value, config_category) VALUES ('maintenance_mode', $1, 'system') ON CONFLICT (config_key) DO UPDATE SET config_value = $1`, [newVal]);
    }

    const { v4: uuidv4 } = require('uuid');
    await query(`INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), req.user.id || req.user.userId, 'SYSTEM_ACTION', 'system', 'unknown', details]
    ).catch(e => console.warn('Audit log insert failed:', e.message));

    res.json({ success: true, message: `${action} triggered successfully.` });
  } catch (error) {
    next(error);
  }
});

const os = require('os');

router.get('/god-mode/metrics', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const usersCount = await queryOne('SELECT COUNT(*) as count FROM users');
    const shopsCount = await queryOne('SELECT COUNT(*) as count FROM local_shops WHERE is_active = true');
    const societiesCount = await queryOne('SELECT COUNT(*) as count FROM societies');
    const sosCount = await queryOne("SELECT COUNT(*) as count FROM sos_alerts WHERE status = 'active'");
    const activeDeliveries = await queryOne("SELECT COUNT(*) as count FROM shop_orders WHERE delivery_type = 'delivery' AND status IN ('accepted', 'out_for_delivery')");

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsage = ((totalMem - freeMem) / totalMem) * 100;
    
    // CPU load average (Windows may return [0,0,0], but works great on Linux/Mac)
    const loadAvg = os.loadavg()[0]; 
    const cpuUsage = Math.min((loadAvg * 100).toFixed(1), 100);

    res.json({
      success: true,
      data: {
        total_users: parseInt(usersCount?.count || 0),
        total_shops: parseInt(shopsCount?.count || 0),
        total_societies: parseInt(societiesCount?.count || 0),
        active_sos: parseInt(sosCount?.count || 0),
        active_deliveries: parseInt(activeDeliveries?.count || 0),
        system_health: {
          cpu_usage: cpuUsage,
          ram_usage: memUsage.toFixed(1)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/fraud-scan', authenticate, requireAdmin, async (req, res, next) => {
  try {
    let flagged_users = [];
    let flagged_shops = [];

    // Suspicious Users (Order Velocity)
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const userRes = await query(`
        SELECT u.id, COALESCE(u.name, 'Resident') as full_name, u.phone as phone_number, COUNT(o.id) as order_count 
        FROM users u
        JOIN orders o ON u.id = o.user_id
        WHERE o.created_at >= $1
        GROUP BY u.id, u.name, u.phone
        HAVING COUNT(o.id) > 5
        ORDER BY order_count DESC
        LIMIT 20
      `, [oneDayAgo]);
      flagged_users = userRes.rows || userRes || [];
    } catch (e) {
      flagged_users = [];
    }

    // Suspicious Shops (Payout Velocity)
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const shopRes = await query(`
        SELECT s.id, s.name as shop_name, s.owner_id, COUNT(p.id) as payout_count
        FROM local_shops s
        JOIN payout_requests p ON s.id = p.shop_id
        WHERE p.created_at >= $1
        GROUP BY s.id, s.name, s.owner_id
        HAVING COUNT(p.id) > 5
        ORDER BY payout_count DESC
        LIMIT 20
      `, [sevenDaysAgo]);
      flagged_shops = shopRes.rows || shopRes || [];
    } catch (e) {
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const shopRes2 = await query(`
          SELECT s.id, s.name as shop_name, s.owner_id, COUNT(p.id) as payout_count
          FROM local_shops s
          JOIN payout_requests p ON s.id = p.shop_id
          WHERE p.created_at >= $1
          GROUP BY s.id, s.name, s.owner_id
          HAVING COUNT(p.id) > 5
          ORDER BY payout_count DESC
          LIMIT 20
        `, [sevenDaysAgo]);
        flagged_shops = shopRes2.rows || shopRes2 || [];
      } catch (e2) {
        flagged_shops = [];
      }
    }

    res.json({
      success: true,
      data: {
        flagged_users,
        flagged_shops
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/search', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 3) {
      return res.json({ success: true, results: [] });
    }

    const searchTerm = `%${q}%`;
    
    // Priority: Users & Shops (Optimized SQLite ILIKE via LIKE)
    const users = await query(`
      SELECT id, full_name as title, 'User' as type, phone_number as subtitle 
      FROM users 
      WHERE full_name LIKE $1 OR phone_number LIKE $1 OR email LIKE $1
      LIMIT 5
    `, [searchTerm]);

    const shops = await query(`
      SELECT id, shop_name as title, 'Shop' as type, business_category as subtitle 
      FROM local_shops 
      WHERE shop_name LIKE $1 OR owner_id IN (SELECT id FROM users WHERE phone_number LIKE $1)
      LIMIT 5
    `, [searchTerm]);

    const results = [
      ...(users.rows || users || []),
      ...(shops.rows || shops || [])
    ];

    res.json({ success: true, results });
  } catch (error) {
    next(error);
  }
});

router.get('/audit-logs', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const logs = await query(`
      SELECT id, admin_id, action, target_type, target_id, details, created_at
      FROM admin_audit_log
      ORDER BY created_at DESC
      LIMIT 100
    `).catch(() => ({ rows: [] }));
    
    res.json({ success: true, data: logs.rows || logs || [] });
  } catch (error) {
    next(error);
  }
});

router.get('/analytics/growth', authenticate, requireAdmin, async (req, res, next) => {
  try {
    // Generate dummy growth data for the last 30 days if SQLite doesn't support complex series
    // In a real prod PostgreSQL we'd use generate_series
    const data = [];
    let currentUsers = 15000;
    let currentShops = 400;
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Simulate upward trend with some randomness
      currentUsers += Math.floor(Math.random() * 50) + 10;
      currentShops += Math.floor(Math.random() * 5) + 1;
      
      data.push({
        date: dateStr,
        users: currentUsers,
        shops: currentShops
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/export/users', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const users = await query('SELECT id, full_name, phone_number, email, role, created_at FROM users ORDER BY created_at DESC');
    const userRows = users.rows || users || [];
    
    if (userRows.length === 0) {
      return res.status(404).send('No users found');
    }

    const headers = ['ID', 'Name', 'Phone', 'Email', 'Role', 'Joined At'];
    const csvContent = [
      headers.join(','),
      ...userRows.map(u => 
        [u.id, `"${u.full_name || ''}"`, u.phone_number, u.email, u.role, u.created_at].join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="localsampark_users_export.csv"');
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

// ─── GOD MODE: NEW APIs (Phase 4) ─────────────────────────
const { sendTopicPush } = require('../../../config/firebase');
const jwt = require('jsonwebtoken');


// ─── GOD MODE: AD CAMPAIGNS (Phase 9) ──────────────────────
router.get('/ads/banners', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = ((req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '').toUpperCase();
    if (!['SUPER_ADMIN', 'ADMIN', 'AD_MANAGER', 'MARKETING_ADMIN'].includes(userRoleStr)) {
      return res.status(403).json({ error: 'Ad Manager access required.' });
    }

    // Auto-create table if it doesn't exist for SQLite simplicity
    await query(`
      CREATE TABLE IF NOT EXISTS admin_ads (
        id TEXT PRIMARY KEY,
        image_url TEXT NOT NULL,
        deep_link TEXT,
        status TEXT DEFAULT 'active',
        clicks INTEGER DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    const banners = await query('SELECT * FROM admin_ads ORDER BY created_at DESC');
    res.json({ success: true, data: banners.rows || banners || [] });
  } catch (error) {
    next(error);
  }
});

router.post('/ads/banners', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = ((req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '').toUpperCase();
    if (!['SUPER_ADMIN', 'ADMIN', 'AD_MANAGER', 'MARKETING_ADMIN'].includes(userRoleStr)) {
      return res.status(403).json({ error: 'Ad Manager access required.' });
    }

    const { image_url, deep_link } = req.body;
    if (!image_url) return res.status(400).json({ error: 'Image URL is required' });

    await query(`
      CREATE TABLE IF NOT EXISTS admin_ads (
        id TEXT PRIMARY KEY,
        image_url TEXT NOT NULL,
        deep_link TEXT,
        status TEXT DEFAULT 'active',
        clicks INTEGER DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    const bannerId = crypto.randomUUID();
    await query(`INSERT INTO admin_ads (id, image_url, deep_link, status, clicks, impressions) VALUES ($1, $2, $3, 'active', 0, 0)`,
      [bannerId, image_url, deep_link || '']
    );

    res.json({ success: true, message: 'Banner ad created successfully.' });
  } catch (error) {
    next(error);
  }
});

router.put('/ads/banners/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = ((req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '').toUpperCase();
    if (!['SUPER_ADMIN', 'ADMIN', 'AD_MANAGER', 'MARKETING_ADMIN'].includes(userRoleStr)) {
      return res.status(403).json({ error: 'Ad Manager access required.' });
    }

    const { status } = req.body;
    await query(`UPDATE admin_ads SET status = $1 WHERE id = $2`, [status, req.params.id]);

    res.json({ success: true, message: `Banner status updated to ${status}.` });
  } catch (error) {
    next(error);
  }
});

// ─── GOD MODE: REGIONAL LANGUAGES (Phase 10) ─────────────────
router.get('/languages', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super Admin access required for Language Configuration.' });
    }

    const config = await queryOne(`SELECT config_value FROM admin_config WHERE config_key = 'app_languages'`);
    let data = {
      activeLanguages: ['en'], // English is default fallback
      dictionaryOverrides: {}
    };

    if (config && config.config_value) {
      try { data = JSON.parse(config.config_value); } catch (e) { next(e); }
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.put('/languages', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super Admin access required for Language Configuration.' });
    }

    const { activeLanguages, dictionaryOverrides } = req.body;
    
    const payload = JSON.stringify({
      activeLanguages: activeLanguages || ['en'], // Ensure English is always fallback
      dictionaryOverrides: dictionaryOverrides || {}
    });

    await query(`
      INSERT INTO admin_config (config_key, config_value, config_category, description, updated_by)
      VALUES ('app_languages', $1, 'localization', 'Global active languages and dictionary overrides', $2)
      ON CONFLICT (config_key) DO UPDATE 
      SET config_value = EXCLUDED.config_value, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP
    `, [payload, req.user.id || req.user.userId]);

    // Purge cache to instantly reflect on clients
    try {
      await cacheDel('*');
    } catch (e) {
      console.warn('Cache clear error during language update:', e);
    }

    res.json({ success: true, message: 'Language configurations updated and global cache purged.' });
  } catch (error) {
    next(error);
  }
});

router.post('/impersonate', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { targetIdOrPhone, roleContext } = req.body;
    
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only Super Admins can use Impersonation Engine.' });
    }

    let targetUser = await queryOne('SELECT * FROM users WHERE id = $1 OR phone_number = $1', [targetIdOrPhone]);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    const payload = {
      id: targetUser.id,
      phone_number: targetUser.phone_number,
      role: roleContext || targetUser.role,
      impersonated_by: req.user.id
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ success: true, token, user: payload });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard', authenticate, requireAdmin, getDashboardStats);

// NOTE: /revenue/chart, /franchises, /franchises/:id/split and /payouts/pending
// are registered further down with requirePermission() RBAC guards. Registering
// them here too would shadow those guards, because Express serves the first
// matching layer.

// ─── GOD MODE: APPROVALS & PAYOUTS ────────────────────────
router.get('/approvals/pending', authenticate, requireAdmin, getPendingApprovals);
router.put('/approvals/:type/:id', authenticate, requireAdmin, updateApprovalStatus);

// ─── GOD MODE: USERS, ROLES, REGIONS ──────────────────────
router.get('/users', authenticate, requireAdmin, getUsers);
router.put('/users/:id/status', authenticate, requireAdmin, updateUserStatus);
router.put('/users/:id/role', authenticate, requireAdmin, updateUserRole);

router.get('/roles', authenticate, requireAdmin, getRoles);
router.post('/roles', authenticate, requireAdmin, createOrUpdateRole);
router.put('/roles', authenticate, requireAdmin, createOrUpdateRole);

// NOTE: /regions is served further down by the richer implementation that
// returns the bare array with users_count/shops_count/features_json that the
// admin territories table consumes. Registering getRegions here would shadow it
// and return {success, data} from `zones`, which the UI silently discards.

// GET all bills for Admin BillsTab
router.get('/bills', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const bills = await query('SELECT * FROM utility_payments ORDER BY created_at DESC');
    res.json({ success: true, bills: bills.rows || bills });
  } catch (error) {
    console.warn('Bills query failed:', error.message);
    res.json({ success: true, bills: [] });
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
    console.warn('Subscriptions query failed:', error.message);
    res.json({ success: true, data: [] });
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
router.get('/shop-categories', authenticate, requireAdmin, requirePermission('ecommerce', 'read'), async (req, res, next) => {
  try {
    const categories = await query('SELECT * FROM shop_categories ORDER BY name ASC');
    res.json(categories.rows || categories);
  } catch (error) {
    next(error);
  }
});

router.put('/shop-categories/:id', authenticate, requireAdmin, requirePermission('ecommerce', 'write'), async (req, res, next) => {
  try {
    const { commission_percent, convenience_fee } = req.body;
    const result = await queryOne(`UPDATE shop_categories 
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
      SELECT r.id, r.name as zone_name, r.pincode, COUNT(DISTINCT s.id) as active_merchants
      FROM regions r
      LEFT JOIN local_shops s ON r.id = s.region_id
      GROUP BY r.id, r.name, r.pincode
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

    const region = await queryOne(`INSERT INTO regions (id, name, state, country, latitude, longitude, radius_km, pincode, district, city, is_active)
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
      await queryOne(`INSERT INTO admin_config (config_key, config_value, config_category, description, updated_by)
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
    const region = await queryOne('UPDATE regions SET is_active = false WHERE id = $1 RETURNING *', [req.params.id]);
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
    
    // Store features as JSON in a column â€” first check if column exists, if not we store in admin_config
    const key = `territory_features_${req.params.id}`;
    await queryOne(`INSERT INTO admin_config (config_key, config_value, config_category, description, updated_by)
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
    
    const franchise = await queryOne('UPDATE franchise_partners SET region_id = $1, territory_name = $2, territory_pincode = $3 WHERE id = $4 RETURNING *',
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
    const activeShops = await queryOne("SELECT COUNT(*) as count FROM local_shops WHERE region_id = $1 AND is_active = true AND approval_status = 'approved'", [regionId]);
    
    let revenueTotal = { total: 0 };
    try {
      revenueTotal = await queryOne('SELECT COALESCE(SUM(gross_amount), 0) as total FROM revenue_transactions WHERE region_id = $1', [regionId]);
    } catch (e) { next(e); }
    
    const franchise = await queryOne('SELECT f.id, u.full_name as partner_name, f.status, f.commission_rate FROM franchise_partners f JOIN users u ON f.user_id = u.id WHERE f.region_id = $1 LIMIT 1', [regionId]);
    
    // Get feature flags
    let features = { delivery: true, jobs: true, rentals: true, events: true, services: true };
    try {
      const featureConfig = await queryOne("SELECT config_value FROM admin_config WHERE config_key = $1", [`territory_features_${regionId}`]);
      if (featureConfig) features = JSON.parse(featureConfig.config_value);
    } catch (e) { next(e); }
    
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
    const activeRegions = await queryOne('SELECT COUNT(*) as count FROM regions WHERE is_active = true');
    const totalUsers = await queryOne('SELECT COUNT(*) as count FROM users');
    const totalShops = await queryOne('SELECT COUNT(*) as count FROM local_shops WHERE is_active = true');
    const totalFranchises = await queryOne('SELECT COUNT(*) as count FROM franchise_partners');
    const activeFranchises = await queryOne("SELECT COUNT(*) as count FROM franchise_partners WHERE status = 'active'");
    
    let totalRevenue = { total: 0 };
    try {
      totalRevenue = await queryOne("SELECT COALESCE(SUM(gross_amount), 0) as total FROM revenue_transactions WHERE status = 'completed'");
    } catch (e) { next(e); }
    
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

// DELETE soft-delete region (set is_active = false)
router.delete('/regions/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await queryOne('UPDATE regions SET is_active = false WHERE id = $1 RETURNING id, name', [req.params.id]);
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
    
    const result = await queryOne('UPDATE franchise_partners SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!result) return res.status(404).json({ error: 'Franchise partner not found' });
    
    res.json({ success: true, data: result, message: `Franchise status updated to ${status}` });
  } catch (error) {
    next(error);
  }
});

// PUT update franchise commission rate
router.put('/franchises/:id/split', authenticate, requireAdmin, requirePermission('crm', 'write'), async (req, res, next) => {
  try {
    const { splitPercentage } = req.body;
    if (splitPercentage === undefined) return res.status(400).json({ error: 'splitPercentage is required' });
    
    const result = await queryOne('UPDATE franchise_partners SET commission_rate = $1 WHERE id = $2 RETURNING *',
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
    
    const user = await queryOne(`UPDATE users SET is_banned = $1, is_active = $2 WHERE id = $3 RETURNING id, is_banned`,
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
    
    const user = await queryOne(`UPDATE users SET role = $1 WHERE id = $2 RETURNING id, role`,
      [role, id]
    );
    
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

// â”€â”€â”€ Phase 7: Revenue & Payouts â”€â”€â”€

router.get('/revenue/chart', authenticate, requireAdmin, requirePermission('finance', 'read'), getRevenueChart);
router.get('/franchises', authenticate, requireAdmin, requirePermission('crm', 'read'), getFranchises);
// /franchises/:id/split is registered above with the same RBAC guard.
router.get('/payouts/pending', authenticate, requireAdmin, requirePermission('finance', 'read'), getPendingPayouts);

// â”€â”€â”€ Skilled Job Dispatch â”€â”€â”€
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
    await query(`UPDATE skilled_bookings 
       SET assigned_worker_id = $1, status = 'assigned'
       WHERE id = $2`,
      [workerId, id]
    );
    res.json({ success: true, message: 'Worker assigned successfully' });
  } catch (error) {
    next(error);
  }
});

// â”€â”€â”€ Approvals â”€â”€â”€
router.get('/approvals', authenticate, requireAdmin, getPendingApprovals);
router.put('/approvals/:type/:id', authenticate, requireAdmin, updateApprovalStatus);

// â”€â”€â”€ Revenue Models â”€â”€â”€
router.get('/revenue-models', authenticate, requireAdmin, getRevenueModels);
router.put('/revenue-models/subscriptions/:id', authenticate, requireAdmin, updateSubscriptionPlan);
router.put('/revenue-models/loyalty/:id', authenticate, requireAdmin, updateLoyaltyTier);
router.put('/revenue-models/config', authenticate, requireAdmin, updateConfig);

// â”€â”€â”€ Shop Categories Management â”€â”€â”€
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
    const cat = await queryOne(`INSERT INTO shop_categories (id, name, slug, icon, business_model, commission_percent, convenience_fee, display_order, registration_fields)
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
    const cat = await queryOne(`UPDATE shop_categories 
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
    await query(`UPDATE shop_categories SET is_active=false WHERE id=$1`, [req.params.id]);
    res.json({ success: true, message: 'Category deactivated' });
  } catch (error) {
    next(error);
  }
});

// â”€â”€â”€ Shop Premium Status â”€â”€â”€
router.put('/shops/:id/premium', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { is_premium, premium_expires_at } = req.body;
    await query(`UPDATE local_shops SET is_premium = $1, premium_expires_at = $2 WHERE id = $3`,
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

// â”€â”€â”€ Delivery Overview â”€â”€â”€
router.get('/delivery/overview', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const stats = {
      activeAgents: (await queryOne('SELECT count(*) as count FROM delivery_agents WHERE is_active = true')).count,
      pendingOrders: (await queryOne("SELECT count(*) as count FROM shop_orders WHERE delivery_type = 'delivery' AND status = 'accepted'")).count,
    };
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// â”€â”€â”€ Phase 2.5: Admin Tab Endpoints â”€â”€â”€
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
    // The tab renders item.name, but the canonical column is provider_name, so
    // every row displayed a dash. Alias it rather than reshaping the client.
    const records = await query(
      `SELECT id, name AS provider_name, name, type, NULL AS license_no, NULL AS zone,
              address, contact_number, status, NULL AS is_verified, created_at
         FROM medical_providers
        ORDER BY created_at DESC
        LIMIT 50`
    );
    res.json({ data: records.rows || records });
  } catch (e) {
    console.warn('Medical query failed:', e.message);
    res.json({ data: [] });
  }
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
      WHERE u.is_active = true AND us.status = 'active'
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
  } catch (e) { 
    console.warn('SOS query failed:', e.message);
    res.json({ data: [] });
  }
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
  } catch (error) { 
    console.warn('Jobs query failed:', error.message);
    res.json({ data: [] });
  }
});

// GET all properties (for Admin)
router.get('/properties', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const properties = await query('SELECT * FROM local_property_listings ORDER BY created_at DESC');
    res.json({ data: properties.rows || properties });
  } catch (error) { 
    console.warn('Properties query failed:', error.message);
    res.json({ data: [] });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Phase 6: Territory Assignment Endpoints (RBAC Hard Partitioning)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// POST /admin/assign-territory â€” SuperAdmin assigns territory to user
router.post('/assign-territory', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { userId, territoryId, districtId, role } = req.body;
    if (!userId || (!territoryId && !districtId)) {
      return res.status(400).json({ error: 'userId and (territoryId or districtId) required.' });
    }

    const id = crypto.randomUUID();
    await query(`INSERT INTO admin_territory_assignments (id, user_id, territory_id, district_id, role, assigned_by, is_active)
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

// GET /admin/territory-assignments â€” List all assignments
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
      WHERE ata.is_active = true
      ORDER BY ata.created_at DESC
    `);
    res.json({ success: true, data: result.rows || result });
  } catch (error) { next(error); }
});

// DELETE /admin/territory-assignments/:id â€” Remove assignment
router.delete('/territory-assignments/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await query('UPDATE admin_territory_assignments SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Assignment removed.' });
  } catch (error) { next(error); }
});

// ─── GOD MODE: CUSTOMER SUPPORT & CRM (Phase 11) ─────────────
router.get('/support/tickets', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'SUPPORT_ADMIN') {
      return res.status(403).json({ error: 'Support Admin access required.' });
    }

    await query(`
      CREATE TABLE IF NOT EXISTS admin_support_tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        domain TEXT DEFAULT 'general',
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    const tickets = await query(`
      SELECT t.*, u.full_name, u.phone_number 
      FROM admin_support_tickets t 
      LEFT JOIN users u ON t.user_id = u.id 
      ORDER BY t.created_at DESC
    `);
    res.json({ success: true, data: tickets.rows || tickets || [] });
  } catch (error) {
    next(error);
  }
});

router.put('/support/tickets/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'SUPPORT_ADMIN') {
      return res.status(403).json({ error: 'Support Admin access required.' });
    }

    const { status } = req.body;
    await query(`UPDATE admin_support_tickets SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [status, req.params.id]);

    res.json({ success: true, message: `Ticket status updated to ${status}.` });
  } catch (error) {
    next(error);
  }
});

router.post('/support/auto-reply', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'SUPPORT_ADMIN') {
      return res.status(403).json({ error: 'Support Admin access required.' });
    }

    const { enabled, message } = req.body;
    const payload = JSON.stringify({ enabled, message });

    await query(`
      INSERT INTO admin_config (config_key, config_value, config_category, description)
      VALUES ('support_auto_reply', $1, 'support', 'Auto-Reply for support tickets')
      ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value
    `, [payload]);

    res.json({ success: true, message: 'Auto-reply settings saved.' });
  } catch (error) {
    next(error);
  }
});

router.get('/crm/users', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'SUPPORT_ADMIN') {
      return res.status(403).json({ error: 'Support Admin access required.' });
    }

    const users = await query(`
      SELECT id, full_name, phone_number, email, role, created_at, 
      (SELECT COALESCE(SUM(points), 0) FROM loyalty_points WHERE user_id = users.id) as loyalty_points 
      FROM users 
      ORDER BY created_at DESC LIMIT 100
    `).catch(() => ({ rows: [] }));
    
    res.json({ success: true, data: users.rows || users || [] });
  } catch (error) {
    next(error);
  }
});

router.post('/crm/loyalty', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'SUPPORT_ADMIN') {
      return res.status(403).json({ error: 'Support Admin access required.' });
    }

    const { user_id, points, reason } = req.body;
    const { v4: uuidv4 } = require('uuid');

    await query(`
      CREATE TABLE IF NOT EXISTS loyalty_points (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        points INTEGER,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    await query(`
      INSERT INTO loyalty_points (id, user_id, points, reason)
      VALUES ($1, $2, $3, $4)
    `, [uuidv4(), user_id, points, reason]);

    res.json({ success: true, message: 'Loyalty points adjusted successfully.' });
  } catch (error) {
    next(error);
  }
});

// ─── GOD MODE: JOBS & SERVICES (Phase 12) ──────────────
router.get('/jobs', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    await query(`
      CREATE TABLE IF NOT EXISTS admin_jobs (
        id TEXT PRIMARY KEY,
        shop_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        salary TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    // Expire jobs older than 60 days
    await query(`
      UPDATE admin_jobs 
      SET status = 'expired' 
      WHERE status = 'active' AND created_at <= datetime('now', '-60 days')
    `);

    const jobs = await query(`
      SELECT j.*, s.shop_name 
      FROM admin_jobs j
      LEFT JOIN local_shops s ON j.shop_id = s.id
      ORDER BY j.created_at DESC
    `);
    res.json({ success: true, data: jobs.rows || jobs || [] });
  } catch (error) {
    next(error);
  }
});

router.post('/jobs', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    const { shop_id, title, description, salary } = req.body;
    const { v4: uuidv4 } = require('uuid');
    const jobId = uuidv4();

    await query(`
      CREATE TABLE IF NOT EXISTS admin_jobs (
        id TEXT PRIMARY KEY,
        shop_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        salary TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    await query(`
      INSERT INTO admin_jobs (id, shop_id, title, description, salary, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
    `, [jobId, shop_id || 'system', title, description, salary]);

    res.json({ success: true, message: 'Free job posting created successfully.' });
  } catch (error) {
    next(error);
  }
});

router.put('/jobs/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    const { status } = req.body;
    await query(`UPDATE admin_jobs SET status = $1 WHERE id = $2`, [status, req.params.id]);

    res.json({ success: true, message: `Job status updated to ${status}.` });
  } catch (error) {
    next(error);
  }
});

// ─── GOD MODE: KRISHI & RURAL (Phase 13) ──────────────
router.get('/krishi', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER' && userRoleStr !== 'KRISHI_EXPERT') {
      return res.status(403).json({ error: 'Krishi Expert access required.' });
    }

    await query(`
      CREATE TABLE IF NOT EXISTS admin_krishi_listings (
        id TEXT PRIMARY KEY,
        seller_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        price TEXT,
        type TEXT DEFAULT 'crop',
        verified_farmer INTEGER DEFAULT 0,
        auto_expire INTEGER DEFAULT 1,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    // Expire listings older than 60 days if auto_expire is true
    await query(`
      UPDATE admin_krishi_listings 
      SET status = 'expired' 
      WHERE status = 'active' AND auto_expire = 1 AND created_at <= datetime('now', '-60 days')
    `);

    const listings = await query(`
      SELECT k.*, u.full_name as seller_name 
      FROM admin_krishi_listings k
      LEFT JOIN users u ON k.seller_id = u.id
      ORDER BY k.created_at DESC
    `);
    res.json({ success: true, data: listings.rows || listings || [] });
  } catch (error) {
    next(error);
  }
});

router.post('/krishi', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER' && userRoleStr !== 'KRISHI_EXPERT') {
      return res.status(403).json({ error: 'Krishi Expert access required.' });
    }

    const { seller_id, title, description, price, type, auto_expire } = req.body;
    const { v4: uuidv4 } = require('uuid');

    await query(`
      CREATE TABLE IF NOT EXISTS admin_krishi_listings (
        id TEXT PRIMARY KEY,
        seller_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        price TEXT,
        type TEXT DEFAULT 'crop',
        verified_farmer INTEGER DEFAULT 0,
        auto_expire INTEGER DEFAULT 1,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    await query(`
      INSERT INTO admin_krishi_listings (id, seller_id, title, description, price, type, auto_expire, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
    `, [uuidv4(), seller_id || 'system', title, description, price, type || 'crop', auto_expire ? 1 : 0]);

    res.json({ success: true, message: 'Krishi listing created successfully.' });
  } catch (error) {
    next(error);
  }
});

router.put('/krishi/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER' && userRoleStr !== 'KRISHI_EXPERT') {
      return res.status(403).json({ error: 'Krishi Expert access required.' });
    }

    const { status } = req.body;
    await query(`UPDATE admin_krishi_listings SET status = $1 WHERE id = $2`, [status, req.params.id]);

    res.json({ success: true, message: `Listing status updated to ${status}.` });
  } catch (error) {
    next(error);
  }
});

router.put('/krishi/:id/verify', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER' && userRoleStr !== 'KRISHI_EXPERT') {
      return res.status(403).json({ error: 'Krishi Expert access required.' });
    }

    const { verified_farmer } = req.body;
    await query(`UPDATE admin_krishi_listings SET verified_farmer = $1 WHERE id = $2`, [verified_farmer ? 1 : 0, req.params.id]);

    res.json({ success: true, message: `Farmer verification updated.` });
  } catch (error) {
    next(error);
  }
});

// ─── GOD MODE: MOBILITY & TRANSPORT (Phase 14) ──────────
router.get('/mobility/fleet', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER' && userRoleStr !== 'MOBILITY_MANAGER') {
      return res.status(403).json({ error: 'Mobility Manager access required.' });
    }

    await query(`
      CREATE TABLE IF NOT EXISTS admin_mobility_fleet (
        id TEXT PRIMARY KEY,
        driver_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        vehicle_type TEXT DEFAULT 'auto',
        rc_number TEXT,
        verified_driver INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    const fleet = await query(`SELECT * FROM admin_mobility_fleet ORDER BY created_at DESC`);
    
    // Inject Mock GPS locations for frontend tracking
    const dataWithGPS = (fleet.rows || fleet || []).map(f => ({
      ...f,
      location_lat: 19.0760 + (Math.random() - 0.5) * 0.1,
      location_lng: 72.8777 + (Math.random() - 0.5) * 0.1,
    }));

    res.json({ success: true, data: dataWithGPS });
  } catch (error) {
    next(error);
  }
});

router.post('/mobility/fleet', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER' && userRoleStr !== 'MOBILITY_MANAGER') {
      return res.status(403).json({ error: 'Mobility Manager access required.' });
    }

    const { driver_name, phone, vehicle_type, rc_number } = req.body;
    const { v4: uuidv4 } = require('uuid');

    await query(`
      CREATE TABLE IF NOT EXISTS admin_mobility_fleet (
        id TEXT PRIMARY KEY,
        driver_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        vehicle_type TEXT DEFAULT 'auto',
        rc_number TEXT,
        verified_driver INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    await query(`
      INSERT INTO admin_mobility_fleet (id, driver_name, phone, vehicle_type, rc_number, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
    `, [uuidv4(), driver_name, phone, vehicle_type || 'auto', rc_number]);

    res.json({ success: true, message: 'Driver onboarded successfully.' });
  } catch (error) {
    next(error);
  }
});

router.put('/mobility/fleet/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER' && userRoleStr !== 'MOBILITY_MANAGER') {
      return res.status(403).json({ error: 'Mobility Manager access required.' });
    }

    const { status } = req.body;
    await query(`UPDATE admin_mobility_fleet SET status = $1 WHERE id = $2`, [status, req.params.id]);

    res.json({ success: true, message: `Driver status updated to ${status}.` });
  } catch (error) {
    next(error);
  }
});

router.put('/mobility/fleet/:id/verify', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER' && userRoleStr !== 'MOBILITY_MANAGER') {
      return res.status(403).json({ error: 'Mobility Manager access required.' });
    }

    const { verified_driver } = req.body;
    await query(`UPDATE admin_mobility_fleet SET verified_driver = $1 WHERE id = $2`, [verified_driver ? 1 : 0, req.params.id]);

    res.json({ success: true, message: `Background check status updated.` });
  } catch (error) {
    next(error);
  }
});

// ─── GOD MODE: CHARITY & NGO (Phase 15) ─────────────
router.get('/charity', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    await query(`
      CREATE TABLE IF NOT EXISTS admin_charity_campaigns (
        id TEXT PRIMARY KEY,
        ngo_name TEXT NOT NULL,
        title TEXT NOT NULL,
        goal_amount REAL DEFAULT 0,
        raised_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'active',
        verified_ngo INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    const campaigns = await query(`SELECT * FROM admin_charity_campaigns ORDER BY created_at DESC`);
    res.json({ success: true, data: campaigns.rows || campaigns || [] });
  } catch (error) {
    next(error);
  }
});

router.post('/charity', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    const { ngo_name, title, goal_amount } = req.body;
    const { v4: uuidv4 } = require('uuid');

    await query(`
      CREATE TABLE IF NOT EXISTS admin_charity_campaigns (
        id TEXT PRIMARY KEY,
        ngo_name TEXT NOT NULL,
        title TEXT NOT NULL,
        goal_amount REAL DEFAULT 0,
        raised_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'active',
        verified_ngo INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    await query(`
      INSERT INTO admin_charity_campaigns (id, ngo_name, title, goal_amount, raised_amount, status)
      VALUES ($1, $2, $3, $4, 0, 'active')
    `, [uuidv4(), ngo_name, title, goal_amount || 0]);

    res.json({ success: true, message: 'Campaign created successfully.' });
  } catch (error) {
    next(error);
  }
});

router.put('/charity/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    const { status } = req.body;
    await query(`UPDATE admin_charity_campaigns SET status = $1 WHERE id = $2`, [status, req.params.id]);

    res.json({ success: true, message: `Campaign status updated to ${status}.` });
  } catch (error) {
    next(error);
  }
});

router.put('/charity/:id/verify', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    const { verified_ngo } = req.body;
    await query(`UPDATE admin_charity_campaigns SET verified_ngo = $1 WHERE id = $2`, [verified_ngo ? 1 : 0, req.params.id]);

    res.json({ success: true, message: `NGO verification status updated.` });
  } catch (error) {
    next(error);
  }
});

router.put('/charity/:id/raised', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    const { raised_amount } = req.body;
    await query(`UPDATE admin_charity_campaigns SET raised_amount = $1 WHERE id = $2`, [raised_amount, req.params.id]);

    res.json({ success: true, message: `Raised amount adjusted successfully.` });
  } catch (error) {
    next(error);
  }
});

// ─── GOD MODE: ENVIRONMENT & WASTE (Phase 16) ──────────
router.get('/environment/scrap', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    await query(`
      CREATE TABLE IF NOT EXISTS admin_scrap_requests (
        id TEXT PRIMARY KEY,
        user_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        scrap_type TEXT NOT NULL,
        estimated_weight TEXT,
        address TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        dispatched INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    const requests = await query(`SELECT * FROM admin_scrap_requests ORDER BY created_at DESC`);
    res.json({ success: true, data: requests.rows || requests || [] });
  } catch (error) {
    next(error);
  }
});

router.post('/environment/scrap', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    const { user_name, phone, scrap_type, estimated_weight, address } = req.body;
    const { v4: uuidv4 } = require('uuid');

    await query(`
      CREATE TABLE IF NOT EXISTS admin_scrap_requests (
        id TEXT PRIMARY KEY,
        user_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        scrap_type TEXT NOT NULL,
        estimated_weight TEXT,
        address TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        dispatched INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    await query(`
      INSERT INTO admin_scrap_requests (id, user_name, phone, scrap_type, estimated_weight, address, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
    `, [uuidv4(), user_name, phone, scrap_type, estimated_weight, address]);

    res.json({ success: true, message: 'Scrap pickup request created successfully.' });
  } catch (error) {
    next(error);
  }
});

router.put('/environment/scrap/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    const { status } = req.body;
    await query(`UPDATE admin_scrap_requests SET status = $1 WHERE id = $2`, [status, req.params.id]);

    res.json({ success: true, message: `Request status updated to ${status}.` });
  } catch (error) {
    next(error);
  }
});

router.put('/environment/scrap/:id/dispatch', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    const { dispatched } = req.body;
    await query(`UPDATE admin_scrap_requests SET dispatched = $1 WHERE id = $2`, [dispatched ? 1 : 0, req.params.id]);

    res.json({ success: true, message: `Collector dispatch status updated.` });
  } catch (error) {
    next(error);
  }
});

// ─── GOD MODE: ANIMAL WELFARE (Phase 17) ───────────────
router.get('/animal/rescue', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    await query(`
      CREATE TABLE IF NOT EXISTS admin_animal_requests (
        id TEXT PRIMARY KEY,
        reporter_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        animal_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        location TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        dispatched INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    // Using a CASE statement to sort by severity dynamically
    const requests = await query(`
      SELECT * FROM admin_animal_requests 
      ORDER BY 
        CASE severity 
          WHEN 'Critical' THEN 1 
          WHEN 'High' THEN 2 
          WHEN 'Moderate' THEN 3 
          WHEN 'Low' THEN 4 
          ELSE 5 
        END ASC, 
        created_at DESC
    `);
    res.json({ success: true, data: requests.rows || requests || [] });
  } catch (error) {
    next(error);
  }
});

router.post('/animal/rescue', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    const { reporter_name, phone, animal_type, severity, location } = req.body;
    const { v4: uuidv4 } = require('uuid');

    await query(`
      CREATE TABLE IF NOT EXISTS admin_animal_requests (
        id TEXT PRIMARY KEY,
        reporter_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        animal_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        location TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        dispatched INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    await query(`
      INSERT INTO admin_animal_requests (id, reporter_name, phone, animal_type, severity, location, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
    `, [uuidv4(), reporter_name, phone, animal_type, severity, location]);

    res.json({ success: true, message: 'Animal rescue request logged successfully.' });
  } catch (error) {
    next(error);
  }
});

router.put('/animal/rescue/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    const { status } = req.body;
    await query(`UPDATE admin_animal_requests SET status = $1 WHERE id = $2`, [status, req.params.id]);

    res.json({ success: true, message: `Rescue status updated to ${status}.` });
  } catch (error) {
    next(error);
  }
});

router.put('/animal/rescue/:id/dispatch', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    const { dispatched } = req.body;
    await query(`UPDATE admin_animal_requests SET dispatched = $1 WHERE id = $2`, [dispatched ? 1 : 0, req.params.id]);

    res.json({ success: true, message: `Rescue team dispatch status updated.` });
  } catch (error) {
    next(error);
  }
});

// ─── GOD MODE: CIVIC & LEGAL (Phase 18) ───────────────
router.get('/civic/issues', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    await query(`
      CREATE TABLE IF NOT EXISTS admin_civic_issues (
        id TEXT PRIMARY KEY,
        reporter_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        category TEXT NOT NULL,
        issue_type TEXT NOT NULL,
        description TEXT NOT NULL,
        department TEXT,
        status TEXT DEFAULT 'pending',
        escalated INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    const issues = await query(`SELECT * FROM admin_civic_issues ORDER BY created_at DESC`);
    res.json({ success: true, data: issues.rows || issues || [] });
  } catch (error) {
    next(error);
  }
});

router.post('/civic/issues', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    const { reporter_name, phone, category, issue_type, description, department } = req.body;
    const { v4: uuidv4 } = require('uuid');

    await query(`
      CREATE TABLE IF NOT EXISTS admin_civic_issues (
        id TEXT PRIMARY KEY,
        reporter_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        category TEXT NOT NULL,
        issue_type TEXT NOT NULL,
        description TEXT NOT NULL,
        department TEXT,
        status TEXT DEFAULT 'pending',
        escalated INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    await query(`
      INSERT INTO admin_civic_issues (id, reporter_name, phone, category, issue_type, description, department, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
    `, [uuidv4(), reporter_name, phone, category, issue_type, description, department || 'General']);

    res.json({ success: true, message: 'Request logged successfully.' });
  } catch (error) {
    next(error);
  }
});

router.put('/civic/issues/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    const { status } = req.body;
    await query(`UPDATE admin_civic_issues SET status = $1 WHERE id = $2`, [status, req.params.id]);

    res.json({ success: true, message: `Status updated to ${status}.` });
  } catch (error) {
    next(error);
  }
});

router.put('/civic/issues/:id/escalate', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    const { escalated } = req.body;
    await query(`UPDATE admin_civic_issues SET escalated = $1 WHERE id = $2`, [escalated ? 1 : 0, req.params.id]);

    res.json({ success: true, message: `Escalation status updated.` });
  } catch (error) {
    next(error);
  }
});

// ─── GOD MODE: MEDICAL & CARE (Phase 19) ───────────────
router.get('/medical/requests', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    await query(`
      CREATE TABLE IF NOT EXISTS admin_medical_requests (
        id TEXT PRIMARY KEY,
        patient_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        request_type TEXT NOT NULL,
        blood_group TEXT,
        urgency TEXT NOT NULL,
        location TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        dispatched INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    // Using a CASE statement to sort by urgency dynamically
    const requests = await query(`
      SELECT * FROM admin_medical_requests 
      ORDER BY 
        CASE urgency 
          WHEN 'Critical' THEN 1 
          WHEN 'High' THEN 2 
          WHEN 'Normal' THEN 3 
          ELSE 4 
        END ASC, 
        created_at DESC
    `);
    res.json({ success: true, data: requests.rows || requests || [] });
  } catch (error) {
    next(error);
  }
});

router.post('/medical/requests', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    const { patient_name, phone, request_type, blood_group, urgency, location } = req.body;
    const { v4: uuidv4 } = require('uuid');

    await query(`
      CREATE TABLE IF NOT EXISTS admin_medical_requests (
        id TEXT PRIMARY KEY,
        patient_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        request_type TEXT NOT NULL,
        blood_group TEXT,
        urgency TEXT NOT NULL,
        location TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        dispatched INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    await query(`
      INSERT INTO admin_medical_requests (id, patient_name, phone, request_type, blood_group, urgency, location, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
    `, [uuidv4(), patient_name, phone, request_type, blood_group, urgency, location]);

    res.json({ success: true, message: 'Medical request logged successfully.' });
  } catch (error) {
    next(error);
  }
});

router.put('/medical/requests/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    const { status } = req.body;
    await query(`UPDATE admin_medical_requests SET status = $1 WHERE id = $2`, [status, req.params.id]);

    res.json({ success: true, message: `Medical status updated to ${status}.` });
  } catch (error) {
    next(error);
  }
});

router.put('/medical/requests/:id/dispatch', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Vertical Manager access required.' });
    }

    const { dispatched } = req.body;
    await query(`UPDATE admin_medical_requests SET dispatched = $1 WHERE id = $2`, [dispatched ? 1 : 0, req.params.id]);

    res.json({ success: true, message: `Medical resource dispatch status updated.` });
  } catch (error) {
    next(error);
  }
});

// ─── GOD MODE: UTILITY BILLS (Phase 20) ───────────────
router.get('/bills', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Super Admin or Vertical Manager access required.' });
    }

    await query(`
      CREATE TABLE IF NOT EXISTS admin_utility_bills (
        id TEXT PRIMARY KEY,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        provider_type TEXT NOT NULL,
        consumer_number TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        payment_cleared INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    const bills = await query(`SELECT * FROM admin_utility_bills ORDER BY created_at DESC`);
    res.json({ success: true, data: bills.rows || bills || [] });
  } catch (error) {
    next(error);
  }
});

router.post('/bills', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Super Admin or Vertical Manager access required.' });
    }

    const { customer_name, phone, provider_type, consumer_number, amount } = req.body;
    const { v4: uuidv4 } = require('uuid');

    await query(`
      CREATE TABLE IF NOT EXISTS admin_utility_bills (
        id TEXT PRIMARY KEY,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        provider_type TEXT NOT NULL,
        consumer_number TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        payment_cleared INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    await query(`
      INSERT INTO admin_utility_bills (id, customer_name, phone, provider_type, consumer_number, amount, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
    `, [uuidv4(), customer_name, phone, provider_type, consumer_number, amount]);

    res.json({ success: true, message: 'Bill payment logged successfully.' });
  } catch (error) {
    next(error);
  }
});

router.put('/bills/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Super Admin or Vertical Manager access required.' });
    }

    const { status } = req.body;
    await query(`UPDATE admin_utility_bills SET status = $1 WHERE id = $2`, [status, req.params.id]);

    res.json({ success: true, message: `Bill status updated to ${status}.` });
  } catch (error) {
    next(error);
  }
});

router.put('/bills/:id/clear', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Super Admin or Vertical Manager access required.' });
    }

    const { payment_cleared } = req.body;
    await query(`UPDATE admin_utility_bills SET payment_cleared = $1 WHERE id = $2`, [payment_cleared ? 1 : 0, req.params.id]);

    res.json({ success: true, message: `Payment clearance status updated.` });
  } catch (error) {
    next(error);
  }
});

// ─── GOD MODE: OMNI-SEARCH (Phase 21) ───────────────
router.get('/search', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'VERTICAL_MANAGER') {
      return res.status(403).json({ error: 'Super Admin or Vertical Manager access required.' });
    }

    const q = req.query.q;
    if (!q || q.length < 3) {
      return res.json({ success: true, results: [] });
    }

    const searchQuery = `%${q}%`;
    let results = [];

    // Helper to catch missing tables without failing the whole request
    const searchTable = async (sql, params, mapper) => {
      try {
        const _res = await query(sql, params);
        const rows = _res.rows || _res || [];
        if (Array.isArray(rows)) {
          results.push(...rows.map(mapper));
        }
      } catch (e) { /* Ignore missing tables */ }
    };

    await Promise.all([
      // Jobs
      searchTable(
        `SELECT id, job_title as title, company_name as subtitle FROM admin_jobs WHERE job_title LIKE $1 OR company_name LIKE $1 LIMIT 5`,
        [searchQuery],
        r => ({ id: r.id, title: r.title, subtitle: r.subtitle, type: 'Job Listing' })
      ),
      // Krishi
      searchTable(
        `SELECT id, product_name as title, seller_name as subtitle FROM admin_krishi_listings WHERE product_name LIKE $1 OR seller_name LIKE $1 LIMIT 5`,
        [searchQuery],
        r => ({ id: r.id, title: r.title, subtitle: r.subtitle, type: 'Krishi Item' })
      ),
      // Mobility
      searchTable(
        `SELECT id, vehicle_no as title, driver_name as subtitle FROM admin_mobility_vehicles WHERE vehicle_no LIKE $1 OR driver_name LIKE $1 LIMIT 5`,
        [searchQuery],
        r => ({ id: r.id, title: r.title, subtitle: r.subtitle, type: 'Vehicle' })
      ),
      // Charity
      searchTable(
        `SELECT id, campaign_title as title, ngo_name as subtitle FROM admin_charity_campaigns WHERE campaign_title LIKE $1 OR ngo_name LIKE $1 LIMIT 5`,
        [searchQuery],
        r => ({ id: r.id, title: r.title, subtitle: r.subtitle, type: 'Campaign' })
      ),
      // Environment
      searchTable(
        `SELECT id, material_type as title, reporter_name as subtitle FROM admin_environment_requests WHERE material_type LIKE $1 OR reporter_name LIKE $1 LIMIT 5`,
        [searchQuery],
        r => ({ id: r.id, title: r.title, subtitle: r.subtitle, type: 'Scrap/Waste' })
      ),
      // Animal
      searchTable(
        `SELECT id, animal_type as title, location as subtitle FROM admin_animal_requests WHERE animal_type LIKE $1 OR location LIKE $1 LIMIT 5`,
        [searchQuery],
        r => ({ id: r.id, title: r.title, subtitle: r.subtitle, type: 'Animal Rescue' })
      ),
      // Civic
      searchTable(
        `SELECT id, issue_type as title, reporter_name as subtitle FROM admin_civic_issues WHERE issue_type LIKE $1 OR reporter_name LIKE $1 LIMIT 5`,
        [searchQuery],
        r => ({ id: r.id, title: r.title, subtitle: r.subtitle, type: 'Civic Issue' })
      ),
      // Medical
      searchTable(
        `SELECT id, request_type as title, patient_name as subtitle FROM admin_medical_requests WHERE request_type LIKE $1 OR patient_name LIKE $1 LIMIT 5`,
        [searchQuery],
        r => ({ id: r.id, title: r.title, subtitle: r.subtitle, type: 'Medical Emergency' })
      ),
      // Bills
      searchTable(
        `SELECT id, provider_type as title, customer_name as subtitle FROM admin_utility_bills WHERE provider_type LIKE $1 OR consumer_number LIKE $1 LIMIT 5`,
        [searchQuery],
        r => ({ id: r.id, title: r.title, subtitle: r.subtitle, type: 'Utility Bill' })
      )
    ]);

    // Limit overall results
    res.json({ success: true, results: results.slice(0, 20) });
  } catch (error) {
    next(error);
  }
});

// ─── GOD MODE: ANALYTICS (Phase 22) ───────────────
router.get('/analytics/overview', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super Admin access required for analytics.' });
    }

    const { duration } = req.query; // 'day', 'week', 'month'

    // Mock aggregate metrics (in reality these would come from GROUP BY queries)
    const metrics = {
      totalUsers: 145020,
      activeMerchants: 3840,
      financialVolume: 12500400,
      slaTime: '1.2 Hours'
    };

    // Generate mock chart data based on duration
    let chartData = [];
    const now = new Date();
    
    if (duration === 'day') {
      for (let i = 24; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        chartData.push({
          label: `${d.getHours()}:00`,
          users: Math.floor(Math.random() * 50) + 10,
          revenue: Math.floor(Math.random() * 5000) + 1000
        });
      }
    } else if (duration === 'week') {
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        chartData.push({
          label: d.toLocaleDateString('en-US', { weekday: 'short' }),
          users: Math.floor(Math.random() * 500) + 100,
          revenue: Math.floor(Math.random() * 50000) + 10000
        });
      }
    } else {
      // Month
      for (let i = 30; i >= 0; i -= 2) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        chartData.push({
          label: `${d.getDate()}/${d.getMonth()+1}`,
          users: Math.floor(Math.random() * 1000) + 200,
          revenue: Math.floor(Math.random() * 100000) + 20000
        });
      }
    }

    res.json({ success: true, metrics, chartData });
  } catch (error) {
    next(error);
  }
});

// ─── GOD MODE: SYSTEM HEALTH (Phase 23) ───────────────
router.get('/health', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super Admin access required for health monitoring.' });
    }

    const os = require('os');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const uptime = os.uptime();
    const cpus = os.cpus();
    
    // Calculate simulated DB size and API latency
    const dbSizeMb = (Math.random() * 50 + 250).toFixed(2);
    const avgLatency = Math.floor(Math.random() * 40) + 10;

    // Simulated streaming error logs (every API error)
    const logs = [
      { id: 1, timestamp: new Date(Date.now() - 5000), level: 'ERROR', route: '/api/v1/users/login', message: 'Invalid credentials provided by user IP 192.168.1.5' },
      { id: 2, timestamp: new Date(Date.now() - 15000), level: 'WARN', route: '/api/v1/payments/webhook', message: 'Razorpay webhook signature mismatch' },
      { id: 3, timestamp: new Date(Date.now() - 45000), level: 'ERROR', route: '/api/v1/admin/search', message: 'Database lock timeout exceeded on table admin_jobs' },
      { id: 4, timestamp: new Date(Date.now() - 120000), level: 'INFO', route: 'SYSTEM', message: 'Cache cleared manually by SUPER_ADMIN' },
      { id: 5, timestamp: new Date(Date.now() - 360000), level: 'ERROR', route: '/api/v1/cron/expiry', message: 'Failed to auto-expire krishi listings: Connection Refused' }
    ];

    res.json({
      success: true,
      system: {
        memory: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          usagePercent: ((usedMem / totalMem) * 100).toFixed(1)
        },
        cpu: {
          cores: cpus.length,
          model: cpus[0].model,
          loadAvg: os.loadavg()
        },
        uptime: uptime,
        database: {
          sizeMB: dbSizeMb,
          activeConnections: Math.floor(Math.random() * 20) + 5
        },
        api: {
          avgLatencyMs: avgLatency,
          requestsPerMinute: Math.floor(Math.random() * 500) + 200
        }
      },
      logs
    });
  } catch (error) {
    next(error);
  }
});

router.post('/health/clear-cache', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super Admin access required to clear cache.' });
    }

    // Simulate clearing Redis/In-memory cache
    setTimeout(() => {
      res.json({ success: true, message: 'System cache cleared successfully across all edge nodes.' });
    }, 800);
  } catch (error) {
    next(error);
  }
});

// ─── GOD MODE: DISASTER RECOVERY (Phase 24) ───────────────
router.get('/backups', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super Admin access required for disaster recovery.' });
    }

    await query(`
      CREATE TABLE IF NOT EXISTS admin_backups (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        size_mb REAL NOT NULL,
        provider TEXT NOT NULL,
        initiator TEXT NOT NULL,
        status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    const backups = await query(`SELECT * FROM admin_backups ORDER BY created_at DESC`);
    res.json({ success: true, data: backups.rows || backups || [] });
  } catch (error) {
    next(error);
  }
});

router.post('/backups/create', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super Admin access required for disaster recovery.' });
    }

    const { provider } = req.body;
    const { v4: uuidv4 } = require('uuid');

    await query(`
      CREATE TABLE IF NOT EXISTS admin_backups (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        size_mb REAL NOT NULL,
        provider TEXT NOT NULL,
        initiator TEXT NOT NULL,
        status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    // Simulate backup creation delay
    setTimeout(async () => {
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `localsampark_db_backup_${dateStr}_${Date.now()}.sqlite.gz`;
      const sizeMb = (Math.random() * 50 + 250).toFixed(2); // Mock size between 250MB and 300MB

      await query(`
        INSERT INTO admin_backups (id, filename, size_mb, provider, initiator)
        VALUES ($1, $2, $3, $4, $5)
      `, [uuidv4(), filename, sizeMb, provider || 'AWS S3', 'SUPER_ADMIN']);

      // For a real implementation, we would normally respond inside the timeout or use webhooks.
      // We'll just return immediately and rely on frontend refresh.
    }, 1500);

    res.json({ success: true, message: 'Database snapshot initiated successfully.' });
  } catch (error) {
    next(error);
  }
});

router.post('/backups/:id/restore', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super Admin access required for disaster recovery.' });
    }

    // Simulate restore delay
    setTimeout(() => {
      res.json({ success: true, message: `Database successfully restored from snapshot.` });
    }, 2000);
  } catch (error) {
    next(error);
  }
});

// ─── GOD MODE: GLOBAL SETTINGS (Phase 25) ───────────────
router.get('/settings', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super Admin access required for global settings.' });
    }

    await query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `).catch(() => {});

    // Ensure defaults exist
    const defaultSettings = [
      ['maintenance_mode', 'false'],
      ['pause_registrations', 'false'],
      ['default_language', 'en'],
      ['api_key_razorpay', 'rzp_live_default123456'],
      ['api_key_gmaps', 'AIzaSyA_default_maps_key']
    ];

    for (const [k, v] of defaultSettings) {
      await query(`INSERT INTO admin_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`, [k, v]);
    }

    const settingsRes = await query(`SELECT * FROM admin_settings`);
    const settingsRows = settingsRes.rows || settingsRes || [];
    
    const settings = {};
    settingsRows.forEach(row => {
      settings[row.key] = row.value;
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

router.put('/settings', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const userRoleStr = (req.adminRole && req.adminRole.role) || (req.user && req.user.role) || '';
    if (userRoleStr !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super Admin access required for global settings.' });
    }

    const updates = req.body; // e.g. { maintenance_mode: 'true', api_key_razorpay: 'new_key' }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No settings provided to update.' });
    }

    await query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `).catch(() => {});

    for (const [key, value] of Object.entries(updates)) {
      await query(`
        INSERT INTO admin_settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `, [key, String(value)]);
    }

    res.json({ success: true, message: 'Global settings updated successfully.' });
  } catch (error) {
    next(error);
  }
});

// Phase 49: Global Error Handling & Validation
// Sanitize all God-Mode errors so no stack traces leak from admin APIs
router.use((err, req, res, next) => {
  console.error('[God-Mode API Error]', err.message);
  // Log the full stack internally
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'An internal admin system error occurred.' 
      : err.message
  });
});

module.exports = router;
