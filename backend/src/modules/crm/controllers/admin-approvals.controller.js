const { query } = require('../../../config/database');

/**
 * Get all pending approvals across different modules
 */
const getPendingApprovals = async (req, res, next) => {
  try {
    // Fetch pending shops
    const shops = await query(`
      SELECT s.id, s.name, c.name as category, s.address, s.phone_number, s.region_id, s.created_at
      FROM local_shops s
      LEFT JOIN shop_categories c ON s.category_id = c.id
      WHERE s.approval_status = 'pending'
      ORDER BY s.created_at ASC
    `);

    // Fetch pending events
    const events = await query(`
      SELECT e.id, e.title, e.category, e.venue, e.event_date, u.region_id, e.created_at
      FROM events e
      LEFT JOIN users u ON e.organizer_id = u.id
      WHERE e.is_approved = 0
      ORDER BY e.created_at ASC
    `);

    // Fetch pending property listings
    const properties = await query(`
      SELECT id, title, property_type, listing_type, price, region_id, created_at
      FROM property_listings
      WHERE is_verified = 0
      ORDER BY created_at ASC
    `);

    // Fetch pending health providers
    const healthProviders = await query(`
      SELECT id, name, type, specialization, phone, created_at
      FROM health_providers
      WHERE is_verified = 0
      ORDER BY created_at ASC
    `);

    // Fetch pending franchise partners
    const franchises = await query(`
      SELECT f.id, f.territory_name as title, f.territory_pincode as pincode, u.full_name as user_name, f.created_at
      FROM franchise_partners f
      JOIN users u ON f.user_id = u.id
      WHERE f.status = 'pending'
      ORDER BY f.created_at ASC
    `);

    // Fetch pending user skills (service providers)
    const skills = await query(`
      SELECT s.id, s.skill_name as name, u.full_name as user_name, u.phone_number, u.region_id, s.created_at
      FROM user_skills s
      JOIN users u ON s.user_id = u.id
      WHERE s.is_certified = 0
      ORDER BY s.created_at ASC
    `);

    // Fetch pending user KYC
    const usersKyc = await query(`
      SELECT id, full_name as name, phone_number, role, region_id, created_at
      FROM users
      WHERE is_verified = 0
      ORDER BY created_at ASC
    `);

    // Fetch pending ad campaigns
    const adCampaigns = await query(`
      SELECT a.id, a.title, a.ad_type as type, a.budget, u.full_name as user_name, u.region_id, a.created_at
      FROM ad_campaigns a
      JOIN users u ON a.advertiser_id = u.id
      WHERE a.status = 'pending'
      ORDER BY a.created_at ASC
    `);

    // Fetch pending marketplace listings
    const marketplace = await query(`
      SELECT m.id, m.title as name, m.category, m.price, u.full_name as user_name, u.region_id, m.created_at
      FROM marketplace_listings m
      JOIN users u ON m.seller_id = u.id
      WHERE m.status = 'pending'
      ORDER BY m.created_at ASC
    `);

    // Fetch pending loyalty redemptions
    const redemptions = await query(`
      SELECT lr.id, 'Reward Redemption' as name, lr.points_used as amount, u.full_name as user_name, u.region_id, lr.redeemed_at as created_at
      FROM loyalty_redemptions lr
      JOIN users u ON lr.user_id = u.id
      WHERE lr.status = 'pending'
      ORDER BY lr.redeemed_at ASC
    `);

    // Fetch pending job vacancies
    const jobs = await query(`
      SELECT j.id, j.title as name, j.job_type as category, s.name as user_name, s.region_id, j.created_at
      FROM job_vacancies j
      JOIN local_shops s ON j.shop_id = s.id
      WHERE j.is_active = 0
      ORDER BY j.created_at ASC
    `);

    // Fetch pending carpool rides
    const carpool = await query(`
      SELECT c.id, c.from_location as name, c.to_location as category, u.full_name as user_name, u.region_id, c.created_at
      FROM carpool_rides c
      JOIN users u ON c.driver_id = u.id
      WHERE c.status = 'pending'
      ORDER BY c.created_at ASC
    `);

    // Fetch pending pet alerts
    const pets = await query(`
      SELECT p.id, p.alert_type as name, p.description as category, u.full_name as user_name, u.region_id, p.created_at
      FROM pet_alerts p
      JOIN users u ON p.user_id = u.id
      WHERE p.status = 'pending'
      ORDER BY p.created_at ASC
    `);

    // Fetch pending delivery agents
    const deliveryAgents = await query(`
      SELECT d.id, d.vehicle_type as name, d.vehicle_number as category, u.full_name as user_name, u.region_id, d.created_at
      FROM delivery_agents d
      JOIN users u ON d.user_id = u.id
      WHERE u.is_verified = 0
      ORDER BY d.created_at ASC
    `);

    res.json({
      success: true,
      data: {
        shops,
        events,
        properties,
        healthProviders,
        franchises,
        skills,
        usersKyc,
        adCampaigns,
        marketplace,
        redemptions,
        jobs,
        carpool,
        pets,
        deliveryAgents
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve or Reject an item
 */
const updateApprovalStatus = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    let tableName, idColumn, statusColumn, approvedValue, rejectedValue;

    switch (type) {
      case 'shops':
      case 'shop':
        tableName = 'local_shops';
        idColumn = 'id';
        statusColumn = 'approval_status';
        approvedValue = 'approved';
        rejectedValue = 'rejected';
        break;
      case 'event':
        tableName = 'events';
        idColumn = 'id';
        statusColumn = 'is_approved';
        approvedValue = 1;
        rejectedValue = -1;
        break;
      case 'property':
        tableName = 'property_listings';
        idColumn = 'id';
        statusColumn = 'is_verified';
        approvedValue = 1;
        rejectedValue = -1;
        break;
      case 'health':
        tableName = 'health_providers';
        idColumn = 'id';
        statusColumn = 'is_verified';
        approvedValue = 1;
        rejectedValue = -1;
        break;
      case 'franchise':
        tableName = 'franchise_partners';
        idColumn = 'id';
        statusColumn = 'status';
        approvedValue = 'active';
        rejectedValue = 'rejected';
        break;
      case 'skill':
        tableName = 'user_skills';
        idColumn = 'id';
        statusColumn = 'is_certified';
        approvedValue = 1;
        rejectedValue = -1;
        break;
      case 'userKyc':
        tableName = 'users';
        idColumn = 'id';
        statusColumn = 'is_verified';
        approvedValue = 1;
        rejectedValue = -1;
        break;
      case 'adCampaign':
        tableName = 'ad_campaigns';
        idColumn = 'id';
        statusColumn = 'status';
        approvedValue = 'active';
        rejectedValue = 'rejected';
        break;
      case 'marketplace':
        tableName = 'marketplace_listings';
        idColumn = 'id';
        statusColumn = 'status';
        approvedValue = 'active';
        rejectedValue = 'rejected';
        break;
      case 'redemption':
        tableName = 'loyalty_redemptions';
        idColumn = 'id';
        statusColumn = 'status';
        approvedValue = 'completed';
        rejectedValue = 'rejected';
        break;
      case 'job':
        tableName = 'job_vacancies';
        idColumn = 'id';
        statusColumn = 'is_active';
        approvedValue = 1;
        rejectedValue = -1;
        break;
      case 'carpool':
        tableName = 'carpool_rides';
        idColumn = 'id';
        statusColumn = 'status';
        approvedValue = 'active';
        rejectedValue = 'rejected';
        break;
      case 'pet':
        tableName = 'pet_alerts';
        idColumn = 'id';
        statusColumn = 'status';
        approvedValue = 'active';
        rejectedValue = 'rejected';
        break;
      case 'deliveryAgent':
        // For delivery agent, we actually update the USER table's is_verified flag.
        // Wait, the action handles `tableName`. Let's just update delivery_agents is_online=1 for now, or users is_verified.
        // It's safer to update users.
        tableName = 'users';
        idColumn = 'id';
        statusColumn = 'is_verified';
        approvedValue = 1;
        rejectedValue = -1;
        break;
      default:
        return res.status(400).json({ success: false, error: 'Invalid approval type' });
    }

    if (action === 'approve') {
      if (type === 'shops' || type === 'shop') {
        await query(`UPDATE ${tableName} SET ${statusColumn} = $1, is_active = 1 WHERE ${idColumn} = $2`, [approvedValue, id]);
      } else {
        await query(`UPDATE ${tableName} SET ${statusColumn} = $1 WHERE ${idColumn} = $2`, [approvedValue, id]);
      }
    } else if (action === 'reject') {
      // For string statuses (like franchise), we set it. Otherwise delete.
      if (typeof rejectedValue === 'string') {
        await query(`UPDATE ${tableName} SET ${statusColumn} = $1 WHERE ${idColumn} = $2`, [rejectedValue, id]);
      } else {
        await query(`DELETE FROM ${tableName} WHERE ${idColumn} = $1`, [id]);
      }
    } else {
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    res.json({
      success: true,
      message: `Successfully ${action}d ${type}`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingApprovals,
  updateApprovalStatus
};
