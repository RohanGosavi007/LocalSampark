const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, queryOne, queryMany } = require('../../../config/database');
const { authenticate, requireAdmin } = require('../../../middleware/auth.middleware');

// ═══════════════════════════════════════════════════════════════
// CARPOOL ADMIN CONTROLS
// ═══════════════════════════════════════════════════════════════

router.get('/carpool/stats', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const totalRides = await queryOne('SELECT COUNT(*) as count FROM carpool_rides');
    const activeRides = await queryOne("SELECT COUNT(*) as count FROM carpool_rides WHERE status = 'active'");
    const totalBookings = await queryOne('SELECT COUNT(*) as count FROM carpool_bookings');
    const totalCarbon = await queryOne('SELECT SUM(co2_saved_kg) as total_co2, SUM(money_saved) as total_saved FROM carpool_carbon_logs');
    const totalGroups = await queryOne('SELECT COUNT(*) as count FROM carpool_groups');

    res.json({
      success: true,
      stats: {
        total_rides: totalRides?.count || 0,
        active_rides: activeRides?.count || 0,
        total_bookings: totalBookings?.count || 0,
        total_co2_kg: totalCarbon?.total_co2 || 0,
        total_saved_inr: totalCarbon?.total_saved || 0,
        total_groups: totalGroups?.count || 0
      }
    });
  } catch (err) { next(err); }
});

router.get('/carpool/rides', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const rides = await queryMany(`
      SELECT cr.*, u.full_name as driver_name, u.phone_number as driver_phone
      FROM carpool_rides cr
      LEFT JOIN users u ON cr.driver_id = u.id
      ORDER BY cr.created_at DESC
      LIMIT 100
    `);
    res.json({ success: true, rides: rides || [] });
  } catch (err) { next(err); }
});

router.put('/carpool/rides/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    await query('UPDATE carpool_rides SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ success: true, message: `Ride status updated to ${status}` });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════
// MARKETPLACE ADMIN CONTROLS (Escrows, Auctions, Listings)
// ═══════════════════════════════════════════════════════════════

router.get('/marketplace/stats', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const listingsCount = await queryOne('SELECT COUNT(*) as count FROM marketplace_listings');
    const activeAuctions = await queryOne("SELECT COUNT(*) as count FROM marketplace_auctions WHERE status = 'active'");
    const escrowsHeld = await queryOne("SELECT COUNT(*) as count, SUM(amount) as total_held FROM marketplace_escrow WHERE status = 'held'");
    const disputesCount = await queryOne("SELECT COUNT(*) as count FROM marketplace_escrow WHERE status = 'disputed'");

    res.json({
      success: true,
      stats: {
        total_listings: listingsCount?.count || 0,
        active_auctions: activeAuctions?.count || 0,
        escrows_held_count: escrowsHeld?.count || 0,
        escrows_held_amount: escrowsHeld?.total_held || 0,
        active_disputes: disputesCount?.count || 0
      }
    });
  } catch (err) { next(err); }
});

router.get('/marketplace/listings', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const listings = await queryMany(`
      SELECT ml.*, u.full_name as seller_name, u.phone_number as seller_phone
      FROM marketplace_listings ml
      LEFT JOIN users u ON ml.seller_id = u.id
      ORDER BY ml.created_at DESC
      LIMIT 100
    `);
    res.json({ success: true, listings: listings || [] });
  } catch (err) { next(err); }
});

router.get('/marketplace/escrows', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const escrows = await queryMany(`
      SELECT me.*, 
             b.full_name as buyer_name, b.phone_number as buyer_phone,
             s.full_name as seller_name, s.phone_number as seller_phone,
             ml.title as listing_title
      FROM marketplace_escrow me
      LEFT JOIN users b ON me.buyer_id = b.id
      LEFT JOIN users s ON me.seller_id = s.id
      LEFT JOIN marketplace_listings ml ON me.listing_id = ml.id
      ORDER BY me.created_at DESC
      LIMIT 100
    `);
    res.json({ success: true, escrows: escrows || [] });
  } catch (err) { next(err); }
});

router.put('/marketplace/escrows/:id/resolve', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { resolution } = req.body; // 'release_to_seller' or 'refund_to_buyer'
    const escrow = await queryOne('SELECT * FROM marketplace_escrow WHERE id = $1', [req.params.id]);
    if (!escrow) return res.status(404).json({ success: false, error: 'Escrow not found' });

    if (resolution === 'release_to_seller') {
      await query("UPDATE marketplace_escrow SET status = 'released', released_at = datetime('now') WHERE id = $1", [req.params.id]);
    } else if (resolution === 'refund_to_buyer') {
      await query("UPDATE marketplace_escrow SET status = 'refunded', released_at = datetime('now') WHERE id = $1", [req.params.id]);
    }

    res.json({ success: true, message: `Escrow dispute resolved: ${resolution}` });
  } catch (err) { next(err); }
});

router.put('/marketplace/listings/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body; // 'active', 'suspended', 'sold'
    await query('UPDATE marketplace_listings SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ success: true, message: `Listing status updated to ${status}` });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════
// JOBS ADMIN CONTROLS (Postings, Applications, Assessments)
// ═══════════════════════════════════════════════════════════════

router.get('/jobs/overview-stats', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const totalJobs = await queryOne('SELECT COUNT(*) as count FROM job_postings');
    const totalApplications = await queryOne('SELECT COUNT(*) as count FROM job_applications');
    const totalResumes = await queryOne('SELECT COUNT(*) as count FROM job_resumes');
    const totalAssessments = await queryOne('SELECT COUNT(*) as count FROM job_assessment_attempts');

    res.json({
      success: true,
      stats: {
        total_jobs: totalJobs?.count || 0,
        total_applications: totalApplications?.count || 0,
        total_resumes: totalResumes?.count || 0,
        total_assessments: totalAssessments?.count || 0
      }
    });
  } catch (err) { next(err); }
});

router.get('/jobs/applications', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const applications = await queryMany(`
      SELECT ja.*, jp.title as job_title, u.full_name as applicant_name, u.phone_number as applicant_phone
      FROM job_applications ja
      LEFT JOIN job_postings jp ON ja.job_id = jp.id
      LEFT JOIN users u ON ja.applicant_id = u.id
      ORDER BY ja.created_at DESC
      LIMIT 100
    `);
    res.json({ success: true, applications: applications || [] });
  } catch (err) { next(err); }
});

module.exports = router;
