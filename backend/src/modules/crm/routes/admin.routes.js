const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, queryOne } = require('../../../config/database');
const { sqlTimestamp, DAY_MS } = require('../../../utils/sqlTime');
const { authenticate, requireAdmin, requireStaff, requireSuperAdmin } = require('../../../middleware/auth.middleware');
const { pageParams, likePattern } = require('../../../utils/paging');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const rateLimit = require('express-rate-limit');
const { getStorageProvider } = require('../../../services/storage');

const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';

// Phase 48: God-Mode Security & Rate Limiting
const globalAdminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 admin requests per windowMs
  skip: () => process.env.NODE_ENV === 'test',
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
router.get('/support/auto-reply', authenticate, requireAdmin, adminSupportController.getAutoReply);
router.post('/support/auto-reply', authenticate, requireAdmin, adminSupportController.setAutoReply);
router.put('/support/tickets/:id/status', authenticate, requireAdmin, adminSupportController.updateTicketStatus);

// --- TELEMETRY & AUDIT (Phase 18 & 19) ---
router.get('/god-mode/metrics', authenticate, requireAdmin, adminTelemetryController.getGodModeMetrics);
router.get('/audit-logs', authenticate, requireAdmin, adminTelemetryController.getAuditLogs);
router.get('/health', authenticate, requireAdmin, adminHealthController.getHealthMetrics);
router.post('/health/clear-cache', mutationLimiter, authenticate, requireAdmin, adminHealthController.clearGlobalCache);

// --- GLOBAL SETTINGS (Phase 20) ---
router.get('/settings', authenticate, requireAdmin, adminSettingsController.getSettings);
// Maintenance mode and the registration pause stop the platform for everyone;
// every administrative tier could flip them.
router.put('/settings', authenticate, requireAdmin, requireSuperAdmin, adminSettingsController.updateSettings);

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
    const { category } = req.query;
    const { page, limit, offset } = pageParams(req.query, { defaultLimit: 100, maxLimit: 500 });
    const params = [];
    let where = '';
    if (category) {
      params.push(category);
      where = `WHERE cp.type = $${params.length}`;
    }
    const total = Number((await queryOne(`SELECT count(*) AS n FROM community_posts cp ${where}`, params)).n);
    params.push(limit, offset);

    const rows = await query(
      `SELECT cp.id, cp.author_id, u.full_name as author_name, cp.type as category, cp.content, NULL as media_url, cp.pincode,
              cp.likes as likes_count, cp.comments as comments_count, cp.created_at
         FROM community_posts cp
         LEFT JOIN users u ON cp.author_id = u.id
         ${where}
        ORDER BY cp.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const posts = rows.rows || rows;
    res.json({ success: true, posts, data: posts, total, page, limit });
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

// --- DISASTER RECOVERY (Phase 39) ---

// --- CHARITY & NGO (Phase 40) ---

// --- CIVIC ISSUES (Phase 41) ---
router.get('/civic', authenticate, requireAdmin, adminCivicController.getIssues);
router.post('/civic', authenticate, requireAdmin, adminCivicController.createIssue);
router.put('/civic/:id/status', authenticate, requireAdmin, adminCivicController.updateStatus);
router.put('/civic/:id/escalate', authenticate, requireAdmin, adminCivicController.toggleEscalation);

// --- UNIVERSAL APPROVALS (Phase 42) ---
router.get('/approvals/pending', authenticate, requireAdmin, adminApprovalsController.getPendingApprovals);
router.put('/approvals/:type/:id', authenticate, requireAdmin, adminApprovalsController.updateApprovalStatus);

// --- UTILITY BILLS (Phase 43) ---

// --- CRM & ENGAGEMENT (Phase 44) ---

// --- REVENUE MODELS (Phase 45) ---
router.get('/revenue-models', authenticate, requireAdmin, getRevenueModels);
router.put('/revenue-models/subscriptions/:id', authenticate, requireAdmin, requireSuperAdmin, updateSubscriptionPlan);
router.put('/revenue-models/loyalty/:id', authenticate, requireAdmin, updateLoyaltyTier);
router.put('/revenue-models/config', authenticate, requireAdmin, requireSuperAdmin, updateConfig);

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
// NOTE: GET /approvals/pending and PUT /approvals/:type/:id are registered
// above (see the adminApprovalsController block). Express matches the first
// registration, so the duplicates that used to sit here never ran — editing
// them looked like a fix that did nothing. Removed; change them above.

// ─── GOD MODE: USERS, ROLES, REGIONS ──────────────────────

// Any administrative tier could rewrite the permission set of any role —
// a moderator could give "moderator" every permission there is.
router.put('/roles', authenticate, requireAdmin, requireSuperAdmin, createOrUpdateRole);

// NOTE: /regions is served further down by the richer implementation that
// returns the bare array with users_count/shops_count/features_json that the
// admin territories table consumes. Registering getRegions here would shadow it
// and return {success, data} from `zones`, which the UI silently discards.


// GET all premium users for Admin PremiumTab
router.get('/premium/users', authenticate, requireAdmin, async (req, res, next) => {
  try {
    // Return empty array for now since there's no premium_users table in the schema
    res.json({ success: true, data: [] });
  } catch (error) {
    next(error);
  }
});

/**
 * Societies for the admin console's Society tab.
 *
 * Scoped by who is asking. Platform staff — ADMIN and SUPER_ADMIN — see every
 * society, which is the point of the console. Anyone else who reaches this
 * route sees only the societies they actually run.
 *
 * Today `requireAdmin` admits platform staff alone, so the scoping below never
 * narrows anything. It is here because the alternative is a query that returns
 * the whole estate and relies on one middleware, three files away, never being
 * widened. The brief asks for society admins to have a view of their own
 * society; the day that is granted, this endpoint is already correct rather
 * than already leaking.
 */
router.get('/societies', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const role = String(req.adminRole?.role || req.user?.role || '').toUpperCase();
    const isPlatformStaff = role === 'ADMIN' || role === 'SUPER_ADMIN';

    if (isPlatformStaff) {
      const societies = await query(
        'SELECT * FROM societies ORDER BY created_at DESC LIMIT $1',
        [limit]
      );
      return res.json({ success: true, scope: 'platform', data: societies.rows || societies });
    }

    const societies = await query(
      `SELECT s.* FROM societies s
         JOIN society_admin_roles sar ON sar.society_id = s.id
        WHERE sar.user_id = $1 AND sar.is_active = '1'
        ORDER BY s.created_at DESC
        LIMIT $2`,
      [req.user.id || req.user.userId, limit]
    );

    return res.json({ success: true, scope: 'society', data: societies.rows || societies });
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


// GET all shops for Admin ShopsTab
router.get('/shops', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { page, limit, offset } = pageParams(req.query);
    const where = [];
    const params = [];
    if (req.query.search) {
      params.push(likePattern(req.query.search));
      where.push(`(LOWER(s.name) LIKE LOWER($${params.length}) ESCAPE '\\' OR LOWER(COALESCE(u.full_name, '')) LIKE LOWER($${params.length}) ESCAPE '\\')`);
    }
    if (req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status)) {
      params.push(req.query.status);
      where.push(`s.approval_status = $${params.length}`);
    }
    if (req.query.category) {
      params.push(req.query.category);
      where.push(`LOWER(s.category) = LOWER($${params.length})`);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = Number((await queryOne(
      `SELECT count(*) AS n FROM local_shops s LEFT JOIN users u ON s.owner_id = u.id ${clause}`, params)).n);
    params.push(limit, offset);
    const shops = await query(`
      SELECT s.*, u.full_name as owner_name, u.phone_number as owner_phone, u.email as owner_email
      FROM local_shops s
      LEFT JOIN users u ON s.owner_id = u.id
      ${clause}
      ORDER BY s.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);
    res.json({ success: true, shops: shops.rows || shops, total, page, limit });
  } catch (error) {
    next(error);
  }
});


// --- Shop Categories (Commission Config) ---
// Ecommerce Domain
router.get('/shop-categories', authenticate, requireStaff, requirePermission('ecommerce', 'read'), async (req, res, next) => {
  try {
    const categories = await query('SELECT * FROM shop_categories ORDER BY name ASC');
    res.json(categories.rows || categories);
  } catch (error) {
    next(error);
  }
});

router.put('/shop-categories/:id', authenticate, requireStaff, requirePermission('ecommerce', 'write'), async (req, res, next) => {
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
    const region = await queryOne('UPDATE regions SET is_active = \'0\' WHERE id = $1 RETURNING *', [req.params.id]);
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


// GET aggregated summary across all territories
router.get('/regions/summary', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const totalRegions = await queryOne('SELECT COUNT(*) as count FROM regions');
    const activeRegions = await queryOne('SELECT COUNT(*) as count FROM regions WHERE is_active = \'1\'');
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
router.put('/franchises/:id/split', authenticate, requireStaff, requirePermission('crm', 'write'), async (req, res, next) => {
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

// ─── Console list endpoints ───────────────────────────────────────────────────
// Seven console tabs (CRM, Events, Marketplace, Medical, Properties, SOS, Wallet) called these
// paths and nothing served them, so each showed an error or an empty table. All are paged and
// searchable; the body carries `data` plus the tab's own key and the total.
function listRoute(path, { count, select, searchColumns = [], filters = {}, orderBy, shape, alias }) {
  router.get(path, authenticate, requireAdmin, async (req, res, next) => {
    try {
      const { page, limit, offset } = pageParams(req.query);
      const where = [];
      const params = [];
      if (req.query.search && searchColumns.length) {
        params.push(likePattern(req.query.search));
        const n = params.length;
        where.push('(' + searchColumns.map((c) => `LOWER(COALESCE(${c}, '')) LIKE LOWER(${n}) ESCAPE '\\'`).join(' OR ') + ')');
      }
      for (const [param, column] of Object.entries(filters)) {
        if (req.query[param]) {
          params.push(req.query[param]);
          where.push(`${column} = ${params.length}`);
        }
      }
      const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const total = Number((await queryOne(`SELECT count(*) AS n FROM ${count} ${clause}`, params)).n);
      params.push(limit, offset);
      const result = await query(
        `SELECT ${select} FROM ${count} ${clause} ORDER BY ${orderBy} LIMIT ${params.length - 1} OFFSET ${params.length}`,
        params
      );
      let rows = result.rows || result;
      if (shape) rows = rows.map(shape);
      const body = { success: true, data: rows, total, page, limit };
      if (alias) body[alias] = rows;
      res.json(body);
    } catch (error) {
      next(error);
    }
  });
}

listRoute('/crm/leads', {
  count: 'crm_leads l',
  select: "l.id, TRIM(COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, '')) AS name, l.phone, l.email, l.lead_source AS source, l.status, l.created_at",
  searchColumns: ["l.first_name", "l.last_name", "l.phone", "l.email"],
  filters: { status: 'l.status' },
  orderBy: 'l.created_at DESC',
});

listRoute('/events', {
  count: 'events e',
  select: 'e.id, e.title, e.category, e.venue, e.event_date, e.start_time AS event_time, e.ticket_price, e.total_tickets AS total_capacity, e.available_tickets, e.status, e.is_approved, e.created_at',
  searchColumns: ['e.title', 'e.venue'],
  filters: { status: 'e.status', category: 'e.category' },
  orderBy: 'e.created_at DESC',
  alias: 'events',
});

listRoute('/marketplace/products', {
  count: 'marketplace_listings m',
  select: 'm.id, m.seller_id, m.title, m.category, m.condition, m.price, m.status, m.created_at',
  searchColumns: ['m.title', 'm.category'],
  filters: { status: 'm.status', category: 'm.category' },
  orderBy: 'm.created_at DESC',
});

listRoute('/medical/records', {
  count: 'medical_doctors d',
  select: 'd.id, d.name, d.clinic_name, d.specialization, d.license_no, d.consultation_fee, d.is_verified, d.created_at',
  searchColumns: ['d.name', 'd.clinic_name', 'd.specialization', 'd.license_no'],
  orderBy: 'd.created_at DESC',
});

listRoute('/properties', {
  count: 'property_listings p',
  select: 'p.id, p.title, p.property_type, p.listing_type, p.price, p.is_active, p.is_verified, p.created_at',
  searchColumns: ['p.title'],
  filters: { listing_type: 'p.listing_type', property_type: 'p.property_type' },
  orderBy: 'p.created_at DESC',
  alias: 'properties',
  shape: (p) => ({ ...p, status: p.is_active ? 'Active' : 'Audit Pending', address: null }),
});

listRoute('/sos/active', {
  count: "sos_alerts a LEFT JOIN users u ON a.user_id = u.id",
  select: 'a.id, a.type, a.status, a.pincode, a.latitude, a.longitude, a.created_at, u.full_name AS user_name, u.phone_number',
  searchColumns: ['u.full_name', 'u.phone_number', 'a.pincode'],
  filters: { status: 'a.status' },
  orderBy: 'a.created_at DESC',
  shape: (a) => ({ ...a, location: [a.pincode && `Pincode ${a.pincode}`, a.latitude != null && `${Number(a.latitude).toFixed(4)}, ${Number(a.longitude).toFixed(4)}`].filter(Boolean).join(' · ') || 'Unknown' }),
});

listRoute('/wallet/transactions/all', {
  count: 'wallet_transactions t JOIN wallets w ON t.wallet_id = w.id LEFT JOIN users u ON w.user_id = u.id',
  select: 't.id, t.amount, t.type, t.purpose, t.status, t.created_at, u.full_name AS user_name, u.phone_number',
  searchColumns: ['u.full_name', 'u.phone_number', 't.purpose'],
  filters: { status: 't.status', type: 't.type' },
  orderBy: 't.created_at DESC',
});

// GET Admin audit logs
router.get('/audit', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { page, limit, offset } = pageParams(req.query, { defaultLimit: 100, maxLimit: 200 });
    const params = [];
    let clause = '';
    if (req.query.q) {
      params.push(likePattern(req.query.q));
      clause = `WHERE LOWER(a.action) LIKE LOWER($1) ESCAPE '\\'`;
    }
    const total = Number((await queryOne(`SELECT count(*) AS n FROM admin_audit_log a ${clause}`, params)).n);
    params.push(limit, offset);
    const logs = await query(`
      SELECT a.*, u.full_name as admin_name, u.phone_number
      FROM admin_audit_log a
      LEFT JOIN users u ON a.admin_id = u.id
      ${clause}
      ORDER BY a.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);
    res.json({ success: true, rows: logs.rows || logs, total, page, limit });
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

// â”€â”€â”€ Phase 7: Revenue & Payouts â”€â”€â”€

router.get('/revenue/chart', authenticate, requireStaff, requirePermission('finance', 'read'), getRevenueChart);
router.get('/franchises', authenticate, requireStaff, requirePermission('crm', 'read'), getFranchises);
// /franchises/:id/split is registered above with the same RBAC guard.
router.get('/payouts/pending', authenticate, requireStaff, requirePermission('finance', 'read'), getPendingPayouts);

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

// â”€â”€â”€ Revenue Models â”€â”€â”€

// â”€â”€â”€ Shop Categories Management â”€â”€â”€

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


router.delete('/shop-categories/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await query(`UPDATE shop_categories SET is_active='0' WHERE id=$1`, [req.params.id]);
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
    // An unknown id used to be a TypeError on shop.owner_id: a 500 for a 404.
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
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
      // delivery_agents tracks availability as is_online; there is no is_active.
      activeAgents: (await queryOne('SELECT count(*) as count FROM delivery_agents WHERE is_online = true')).count,
      pendingOrders: (await queryOne("SELECT count(*) as count FROM shop_orders WHERE delivery_type = 'delivery' AND status = 'accepted'")).count,
    };
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// ─── Phase 2.5: Admin Delivery Fleet Endpoints (R1, R5) ───
router.get('/delivery/agents', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { kyc_status, status } = req.query;
    const filter = kyc_status || status;
    const params = [];
    let where = '';
    if (filter) {
      params.push(String(filter).toLowerCase());
      where = ' WHERE LOWER(da.kyc_status) = $1';
    }

    const agents = await query(`
      SELECT da.*, u.full_name as name, u.phone_number as phone, u.email as email
      FROM delivery_agents da 
      JOIN users u ON da.user_id = u.id 
      ${where}
      ORDER BY da.created_at DESC LIMIT 50
    `, params);

    const rows = agents.rows || agents || [];
    const storage = getStorageProvider();
    const enriched = await Promise.all(rows.map(async (agent) => {
      const docFields = ['profile_image_url', 'dl_image_url', 'rc_image_url', 'aadhaar_image_url'];
      const signedDocs = {};
      for (const f of docFields) {
        if (agent[f]) {
          try {
            signedDocs[`${f}_signed`] = await storage.getSignedUrl(agent[f], 600);
          } catch {
            signedDocs[`${f}_signed`] = null;
          }
        }
      }
      return { ...agent, ...signedDocs };
    }));

    res.json({ agents: enriched });
  } catch (e) { next(e); }
});

router.get('/delivery/pending-kyc', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const agents = await query(`
      SELECT da.*, u.full_name as name, u.phone_number as phone, u.email as email
      FROM delivery_agents da 
      JOIN users u ON da.user_id = u.id 
      WHERE LOWER(COALESCE(da.kyc_status, 'pending')) IN ('pending', 'resubmission')
      ORDER BY da.created_at ASC LIMIT 50
    `);

    const rows = agents.rows || agents || [];
    const storage = getStorageProvider();
    const enriched = await Promise.all(rows.map(async (agent) => {
      const docFields = ['profile_image_url', 'dl_image_url', 'rc_image_url', 'aadhaar_image_url'];
      const signedDocs = {};
      for (const f of docFields) {
        if (agent[f]) {
          try {
            signedDocs[`${f}_signed`] = await storage.getSignedUrl(agent[f], 600);
          } catch {
            signedDocs[`${f}_signed`] = null;
          }
        }
      }
      return { ...agent, ...signedDocs };
    }));

    res.json({ success: true, count: enriched.length, agents: enriched });
  } catch (e) { next(e); }
});

const handleAgentKycStatusUpdate = async (req, res, next) => {
  try {
    const { status, rejectionReason, rejection_reason } = req.body || {};
    const rawStatus = String(status || '').toLowerCase();
    const reason = rejectionReason || rejection_reason || null;

    const VALID_STATUSES = ['pending', 'active', 'approved', 'verified', 'suspended', 'rejected', 'resubmission'];
    if (!VALID_STATUSES.includes(rawStatus)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const agent = await queryOne('SELECT * FROM delivery_agents WHERE CAST(id AS TEXT) = $1 OR CAST(user_id AS TEXT) = $1', [String(req.params.id)]);
    if (!agent) return res.status(404).json({ error: 'Delivery agent not found' });

    const targetKycStatus = (rawStatus === 'approved' || rawStatus === 'verified') ? 'approved' : rawStatus;

    if (['approved', 'active', 'verified'].includes(rawStatus)) {
      await query(
        `UPDATE delivery_agents
            SET kyc_status = $1, rejection_reason = NULL, updated_at = ${NOW}
          WHERE id = $2`,
        [targetKycStatus, agent.id]
      );
      // Promote user role to delivery_agent
      await query("UPDATE users SET role = 'delivery_agent' WHERE id = $1", [agent.user_id]);
    } else {
      await query(
        `UPDATE delivery_agents
            SET kyc_status = $1, rejection_reason = $2, updated_at = ${NOW}
          WHERE id = $3`,
        [targetKycStatus, reason, agent.id]
      );
    }

    res.json({ success: true, agentId: agent.id, kycStatus: targetKycStatus });
  } catch (e) { next(e); }
};

router.put('/delivery/agents/:id/status', authenticate, requireAdmin, handleAgentKycStatusUpdate);
router.put('/delivery/agents/:id/kyc', authenticate, requireAdmin, handleAgentKycStatusUpdate);

/*
 * A second GET /societies used to sit here.
 *
 * Express matches the first route that fits, so this one never ran — but it
 * looked authoritative, and it returned `{ data }` where the live one returns
 * `{ success, data }`. Anyone debugging the Society tab and finding this first
 * would have edited a handler that cannot execute. Removed; the live one is
 * above.
 */

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
      WHERE ata.is_active = '1'
      ORDER BY ata.created_at DESC
    `);
    res.json({ success: true, data: result.rows || result });
  } catch (error) { next(error); }
});

/**
 * POST /admin/territory-assignments { userId, territoryId, role?, notes? }
 *
 * Gives a franchise partner a territory. The admin console's "Assign" button
 * posted to /admin/assign-territory, which never existed, so no territory could
 * be assigned from the console at all. A super admin only: this decides whose
 * data a partner can see. One active partner per territory; an assignment that
 * was removed is re-activated rather than duplicated.
 */
const TERRITORY_ROLES = new Set(['territory_franchise', 'territory_admin', 'franchise_owner']);
router.post('/territory-assignments', authenticate, requireAdmin, requireSuperAdmin, async (req, res, next) => {
  try {
    const { userId, territoryId, notes } = req.body || {};
    const role = String((req.body || {}).role || 'territory_franchise').toLowerCase();
    if (!userId || !territoryId) return res.status(400).json({ error: 'userId and territoryId are required' });
    if (!TERRITORY_ROLES.has(role)) return res.status(400).json({ error: `role must be one of: ${[...TERRITORY_ROLES].join(', ')}` });

    const [user, territory] = await Promise.all([
      queryOne('SELECT id FROM users WHERE id = $1', [userId]),
      queryOne('SELECT id, name FROM territories WHERE id = $1', [territoryId]),
    ]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!territory) return res.status(404).json({ error: 'Territory not found' });

    const held = await queryOne(
      "SELECT ata.id, u.full_name FROM admin_territory_assignments ata JOIN users u ON u.id = ata.user_id WHERE ata.territory_id = $1 AND ata.is_active = '1' AND ata.user_id <> $2",
      [territoryId, userId]
    );
    if (held) return res.status(409).json({ error: `${territory.name} is already assigned to ${held.full_name || 'another partner'}. Remove that assignment first.` });

    const id = crypto.randomUUID();
    await query(
      `INSERT INTO admin_territory_assignments (id, user_id, territory_id, role, assigned_by, is_active, notes)
       VALUES ($1, $2, $3, $4, $5, '1', $6)
       ON CONFLICT (user_id, territory_id)
       DO UPDATE SET is_active = '1', role = EXCLUDED.role, assigned_by = EXCLUDED.assigned_by, notes = EXCLUDED.notes, updated_at = CURRENT_TIMESTAMP`,
      [id, userId, territoryId, role, req.user.id, notes ? String(notes).slice(0, 500) : null]
    );
    res.status(201).json({ success: true, message: `${territory.name} assigned.` });
  } catch (error) { next(error); }
});

// DELETE /admin/territory-assignments/:id — Remove assignment
router.delete('/territory-assignments/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await query('UPDATE admin_territory_assignments SET is_active = \'0\' WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Assignment removed.' });
  } catch (error) { next(error); }
});

// ─── GOD MODE: CUSTOMER SUPPORT & CRM (Phase 11) ─────────────


// ─── GOD MODE: JOBS & SERVICES (Phase 12) ──────────────


// ─── GOD MODE: KRISHI & RURAL (Phase 13) ──────────────


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


// ─── GOD MODE: ENVIRONMENT & WASTE (Phase 16) ──────────


// ─── GOD MODE: ANIMAL WELFARE (Phase 17) ───────────────


// ─── GOD MODE: CIVIC & LEGAL (Phase 18) ───────────────


// ─── GOD MODE: MEDICAL & CARE (Phase 19) ───────────────


// ─── GOD MODE: UTILITY BILLS (Phase 20) ───────────────


// ─── GOD MODE: OMNI-SEARCH (Phase 21) ───────────────

// ─── GOD MODE: ANALYTICS (Phase 22) ───────────────

// ─── GOD MODE: SYSTEM HEALTH (Phase 23) ───────────────


// ─── GOD MODE: DISASTER RECOVERY (Phase 24) ───────────────


// A second GET/PUT /settings pair used to sit here. Express matches the first
// registration (adminSettingsController, near the top of this file), so it
// never ran. It created an admin_settings table on each request and seeded
// it with invented "live" API keys. Removed.

// Pricing settings, merchant plans, cash held by riders and pending refunds.
router.use(require('./admin-pricing.routes'));

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
