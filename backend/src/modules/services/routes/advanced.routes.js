const express = require('express');
const geo = require('../../../utils/geo');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const uploads = require('../../core/services/upload.service');
const { query, queryOne, queryMany } = require('../../../config/database');
const { sqlTimestamp } = require('../../../utils/sqlTime');
const escrowService = require('../../../services/escrow.service');
const { authenticate } = require('../../../middleware/auth.middleware');
const { parseResumeText, extractTextFromBuffer } = require('../../../utils/resumeParser');

// ═══════════════════════════════════════════════════════════════
// FILE UPLOAD (multer config)
// ═══════════════════════════════════════════════════════════════
// File uploads are handled by modules/core/routes/upload.routes.js (POST
// /upload), through upload.service.js. This router had its own POST /upload,
// which accepted any file whose name ended in an allowed extension and kept
// that extension. Because the router is mounted four times (/, /carpool,
// /marketplace, /jobs) it was also reachable at /carpool/upload and so on.

// ═══════════════════════════════════════════════════════════════
// CARPOOL ADVANCED (C1-C5)
// ═══════════════════════════════════════════════════════════════

// C3: Ride Cost Splitter Calculator
router.post('/carpool/cost-calculator', (req, res) => {
  const { distance_km, fuel_price_per_liter = 105, mileage_kmpl = 15, toll_amount = 0, passengers = 1 } = req.body;
  const fuelCost = (distance_km / mileage_kmpl) * fuel_price_per_liter;
  const totalCost = fuelCost + toll_amount;
  const perPerson = totalCost / Math.max(1, passengers + 1); // +1 for driver
  const soloOlaCost = distance_km * 14; // ~₹14/km Ola estimate
  const savings = Math.max(0, soloOlaCost - perPerson);
  const co2Saved = distance_km * 0.12 * passengers; // ~120g CO₂/km saved per shared passenger

  res.json({
    success: true,
    calculation: {
      distance_km, fuel_price_per_liter, mileage_kmpl,
      fuel_cost: Math.round(fuelCost),
      toll_amount,
      total_cost: Math.round(totalCost),
      per_person_cost: Math.round(perPerson),
      passengers_sharing: passengers,
      comparison: {
        ola_estimate: Math.round(soloOlaCost),
        savings_per_person: Math.round(savings),
        savings_percent: Math.round((savings / soloOlaCost) * 100),
      },
      eco_impact: {
        co2_saved_grams: Math.round(co2Saved),
        trees_equivalent: (co2Saved / 21000).toFixed(3), // ~21kg CO₂ per tree/year
      }
    }
  });
});

// C5: Generate OTP for ride verification
router.post('/carpool/rides/:rideId/generate-otp', authenticate, async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const ride = await queryOne('SELECT * FROM carpool_rides WHERE id = $1 AND driver_id = $2', [rideId, req.user.id]);
    if (!ride) return res.status(404).json({ success: false, error: 'Ride not found or unauthorized' });

    const bookings = await queryMany(`SELECT * FROM carpool_bookings WHERE ride_id = $1 AND status = 'confirmed'`, [rideId]);
    const otps = [];

    for (const booking of bookings) {
      // crypto.randomInt, not Math.random: this OTP is what the driver checks
      // to confirm the right passenger is boarding, and a predictable code lets
      // someone claim a seat that is not theirs. randomInt is also unbiased,
      // which Math.floor(min + random*range) is not.
      const otp = String(crypto.randomInt(1000, 10000)); // 4-digit OTP
      // One statement for both engines. The expiry was datetime('now', '+30
      // minutes'), which PostgreSQL does not have, and the fallback for when
      // that failed was INSERT OR REPLACE, which it does not have either — so
      // in production no OTP was ever stored. The table carries
      // UNIQUE(ride_id, booking_id) on both, which is all ON CONFLICT needs.
      await query(
        `INSERT INTO carpool_ride_otps (ride_id, booking_id, otp_code, expires_at) VALUES ($1, $2, $3, $4)
         ON CONFLICT(ride_id, booking_id) DO UPDATE SET otp_code = $3, verified = 0, expires_at = $4`,
        [rideId, booking.id, otp, sqlTimestamp(30 * 60 * 1000)]
      );
      otps.push({ booking_id: booking.id, passenger_id: booking.passenger_id, otp });
    }

    res.json({ success: true, otps, message: 'Share OTPs with passengers before ride starts' });
  } catch (error) { next(error); }
});

// C5: Verify ride OTP
// The driver checks a passenger's boarding code. Only the ride's driver may do
// it — this accepted the call from anyone — and a code past its expiry is not
// a code: expires_at was written and never read.
router.post('/carpool/rides/:rideId/verify-otp', authenticate, async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { otp_code, booking_id } = req.body || {};
    if (!otp_code || !booking_id) {
      return res.status(400).json({ success: false, error: 'otp_code and booking_id are required' });
    }

    const ride = await queryOne('SELECT id FROM carpool_rides WHERE id = $1 AND driver_id = $2', [rideId, req.user.id]);
    if (!ride) return res.status(404).json({ success: false, error: 'Ride not found or unauthorized' });

    const otpRecord = await queryOne(
      `SELECT * FROM carpool_ride_otps
        WHERE ride_id = $1 AND booking_id = $2 AND otp_code = $3 AND verified = 0
          AND (expires_at IS NULL OR expires_at > $4)`,
      [rideId, booking_id, String(otp_code), sqlTimestamp(0)]
    );
    if (!otpRecord) return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });

    await query('UPDATE carpool_ride_otps SET verified = 1 WHERE id = $1', [otpRecord.id]);
    res.json({ success: true, message: '✅ OTP verified! Ride can start.' });
  } catch (error) { next(error); }
});

// C2: Smart Route Matching (find overlapping routes)
router.get('/carpool/route-match', async (req, res, next) => {
  try {
    const { from_lat, from_lng, to_lat, to_lng, radius = 5 } = req.query;
    if (!from_lat || !from_lng || !to_lat || !to_lng) {
      return res.status(400).json({ success: false, error: 'Provide from_lat, from_lng, to_lat, to_lng' });
    }
    const fLat = parseFloat(from_lat), fLng = parseFloat(from_lng);
    const tLat = parseFloat(to_lat), tLng = parseFloat(to_lng);
    const R = parseFloat(radius);

    const rides = await queryMany(`SELECT r.*, u.full_name as driver_name FROM carpool_rides r LEFT JOIN users u ON r.driver_id = u.id WHERE r.status = 'active'`);

    const matched = rides.filter(r => {
      if (!r.from_lat || !r.from_lng || !r.to_lat || !r.to_lng) return false;
      // Check if pickup is near rider's origin AND dropoff is near rider's destination
      const pickupDist = haversineKm(fLat, fLng, r.from_lat, r.from_lng);
      const dropDist = haversineKm(tLat, tLng, r.to_lat, r.to_lng);
      return pickupDist <= R && dropDist <= R;
    }).map(r => ({
      ...r,
      pickup_distance_km: haversineKm(fLat, fLng, r.from_lat, r.from_lng).toFixed(1),
      dropoff_distance_km: haversineKm(tLat, tLng, r.to_lat, r.to_lng).toFixed(1),
      route_overlap_score: Math.round(100 - (haversineKm(fLat, fLng, r.from_lat, r.from_lng) + haversineKm(tLat, tLng, r.to_lat, r.to_lng)) / (2 * R) * 100)
    })).sort((a, b) => b.route_overlap_score - a.route_overlap_score);

    res.json({ success: true, rides: matched, total: matched.length });
  } catch (error) { next(error); }
});

// C7: Carbon footprint dashboard (graceful fallback if unauthenticated)
router.get('/carpool/carbon-dashboard', async (req, res, next) => {
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        // Was `process.env.JWT_SECRET || 'your-jwt-secret'` — a literal in this
        // repository. config/secrets is the single resolver and throws in
        // production rather than verifying against a known key.
        const { getJwtSecret } = require('../../../config/secrets');
        const decoded = jwt.verify(authHeader.split(' ')[1], getJwtSecret());
        userId = decoded.id || decoded.userId;
      } catch (e) {}
    }

    if (userId) {
      const logs = await queryMany('SELECT * FROM carpool_carbon_logs WHERE user_id = $1 ORDER BY logged_at DESC LIMIT 100', [userId]);
      const totals = await queryOne(
        `SELECT SUM(distance_km) as total_km, SUM(co2_saved_kg) as total_co2, SUM(fuel_saved_liters) as total_fuel, SUM(money_saved) as total_money, COUNT(*) as total_rides FROM carpool_carbon_logs WHERE user_id = $1`,
        [userId]
      );
      return res.json({
        success: true,
        dashboard: {
          total_km: totals?.total_km || 0,
          total_co2_saved_kg: totals?.total_co2 || 0,
          total_fuel_saved_liters: totals?.total_fuel || 0,
          total_money_saved: totals?.total_money || 0,
          total_shared_rides: totals?.total_rides || 0,
          trees_equivalent: ((totals?.total_co2 || 0) / 21).toFixed(1),
        },
        recent_logs: logs
      });
    }

    // Community-wide totals for guest visitors
    const communityTotals = await queryOne(
      `SELECT SUM(distance_km) as total_km, SUM(co2_saved_kg) as total_co2, SUM(fuel_saved_liters) as total_fuel, SUM(money_saved) as total_money, COUNT(*) as total_rides FROM carpool_carbon_logs`
    );

    res.json({
      success: true,
      dashboard: {
        total_km: communityTotals?.total_km || 1240,
        total_co2_saved_kg: communityTotals?.total_co2 || 186.4,
        total_fuel_saved_liters: communityTotals?.total_fuel || 78,
        total_money_saved: communityTotals?.total_money || 14200,
        total_shared_rides: communityTotals?.total_rides || 62,
        trees_equivalent: (((communityTotals?.total_co2 || 186.4)) / 21).toFixed(1),
        is_community_overview: true
      },
      recent_logs: []
    });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════
// MARKETPLACE ADVANCED (M2-M6)
// ═══════════════════════════════════════════════════════════════

// M2: AI Price Suggestion
router.post('/marketplace/price-suggest', async (req, res, next) => {
  try {
    const { category, condition, title } = req.body;
    // Get similar listings' prices from DB
    let sql = `SELECT price, condition FROM marketplace_listings WHERE status = 'active'`;
    const params = [];
    if (category) { params.push(category); sql += ` AND category = $${params.length}`; }
    sql += ' LIMIT 100';
    const similar = await queryMany(sql, params);

    if (similar.length === 0) {
      return res.json({ success: true, suggestion: null, message: 'Not enough data' });
    }

    const prices = similar.map(s => s.price).filter(p => p > 0);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const median = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];

    // Condition adjustment
    const conditionMultiplier = { 'Like New': 1.15, 'Excellent': 1.0, 'Good': 0.85, 'Fair': 0.65 };
    const multiplier = conditionMultiplier[condition] || 1.0;
    const suggestedPrice = Math.round(median * multiplier);

    res.json({
      success: true,
      suggestion: {
        recommended_price: suggestedPrice,
        price_range: { min: Math.round(min * 0.8), max: Math.round(max * 1.1) },
        market_data: { avg_price: Math.round(avg), median_price: Math.round(median), sample_size: prices.length },
        condition_adjustment: `${condition} (${Math.round(multiplier * 100)}%)`,
        tip: suggestedPrice > avg ? 'Your item is priced above average — highlight unique features!' : 'Competitive price — should sell quickly!'
      }
    });
  } catch (error) { next(error); }
});

// M5: Escrow — the buyer's money, held until the item changes hands.
// services/escrow.service.js does the work and explains what these three
// routes used to be: status changes described to both parties as payments.
function sendEscrowError(res, error, next) {
  if (error instanceof escrowService.EscrowError) {
    return res.status(error.status).json({ success: false, code: error.code, error: error.message });
  }
  return next(error);
}

router.post('/marketplace/escrow/create', authenticate, async (req, res, next) => {
  try {
    const { listing_id, amount } = req.body || {};
    if (!listing_id) return res.status(400).json({ success: false, error: 'listing_id is required' });

    const escrow = await escrowService.hold({ buyerId: req.user.id, listingId: listing_id, amount });
    res.json({
      success: true,
      escrow: {
        ...escrow,
        message: `₹${escrow.amount} has been taken from your wallet and is being held. Confirm receipt to pay the seller.`
      }
    });
  } catch (error) { sendEscrowError(res, error, next); }
});

// M5: Escrow — Buyer confirms receipt (releases payment)
router.post('/marketplace/escrow/:escrowId/release', authenticate, async (req, res, next) => {
  try {
    const { escrowId } = req.params;
    const escrow = await escrowService.releaseByBuyer({ buyerId: req.user.id, escrowId });

    // Emit socket event
    try {
      const io = req.app.get('io');
      if (io) io.to(`mkt_chat_${escrow.listing_id}`).emit('marketplace:escrow_released', { escrow_id: escrowId });
    } catch (e) { /* notification only */ }

    res.json({ success: true, message: '✅ Payment released to seller! Transaction complete.' });
  } catch (error) { sendEscrowError(res, error, next); }
});

// M5: Escrow — Raise dispute
router.post('/marketplace/escrow/:escrowId/dispute', authenticate, async (req, res, next) => {
  try {
    await escrowService.dispute({ buyerId: req.user.id, escrowId: req.params.escrowId, reason: (req.body || {}).reason });
    res.json({ success: true, message: 'Dispute raised. Your payment stays held until an administrator has reviewed it.' });
  } catch (error) { sendEscrowError(res, error, next); }
});

// M6: Seller Trust Score Calculator
router.get('/marketplace/seller-score/:sellerId', async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const user = await queryOne('SELECT id, full_name, created_at, phone_number, email FROM users WHERE id = $1', [sellerId]);
    if (!user) return res.status(404).json({ success: false, error: 'Seller not found' });

    const listings = await queryOne(`SELECT COUNT(*) as total, SUM(CASE WHEN status='sold' THEN 1 ELSE 0 END) as sold FROM marketplace_listings WHERE seller_id = $1`, [sellerId]);
    const escrows = await queryOne(`SELECT COUNT(*) as total, SUM(CASE WHEN status='released' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status='disputed' THEN 1 ELSE 0 END) as disputed FROM marketplace_escrow WHERE seller_id = $1`, [sellerId]);

    // Calculate trust score (0-100)
    const accountAgeDays = Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000);
    let score = 30; // Base score
    if (user.phone_number) score += 10;
    if (user.email) score += 5;
    if (accountAgeDays > 30) score += 5;
    if (accountAgeDays > 90) score += 5;
    if (accountAgeDays > 365) score += 5;
    if ((listings?.total || 0) > 0) score += 5;
    if ((listings?.sold || 0) > 0) score += Math.min(15, (listings.sold || 0) * 3);
    if ((escrows?.completed || 0) > 0) score += Math.min(10, (escrows.completed || 0) * 5);
    if ((escrows?.disputed || 0) > 0) score -= (escrows.disputed || 0) * 10;
    score = Math.max(0, Math.min(100, score));

    const level = score >= 80 ? 'Trusted Seller ⭐' : score >= 60 ? 'Verified Seller ✅' : score >= 40 ? 'Active Seller' : 'New Seller';

    // Cache the score
    try {
      await query(
        `INSERT INTO marketplace_seller_scores (seller_id, account_age_days, verified_phone, total_listings, total_sold, dispute_count, trust_score) VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT(seller_id) DO UPDATE SET account_age_days=$2, verified_phone=$3, total_listings=$4, total_sold=$5, dispute_count=$6, trust_score=$7, last_calculated=CURRENT_TIMESTAMP`,
        [sellerId, accountAgeDays, user.phone_number ? 1 : 0, listings?.total || 0, listings?.sold || 0, escrows?.disputed || 0, score]
      );
    } catch (e) {}

    res.json({
      success: true,
      seller: { id: sellerId, name: user.full_name },
      trust_score: { score, level, account_age_days: accountAgeDays, total_listings: listings?.total || 0, total_sold: listings?.sold || 0, disputes: escrows?.disputed || 0, verified_phone: !!user.phone_number }
    });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════
// JOBS ADVANCED (J1, J3, J5, J6)
// ═══════════════════════════════════════════════════════════════

// J1: Resume PDF Upload & Parse
// The résumé is a private document: the applicant, platform staff, and the
// employers they apply to can open it (upload.service.js canRead). It was
// stored under public/uploads, readable by anyone with the link, and any file
// type with an allowed-looking name was accepted.
const receiveResume = (req, res, next) => {
  // The form field has always been "resume"; the upload service reads "file".
  require('multer')({ storage: require('multer').memoryStorage(), limits: { fileSize: uploads.MAX_FILE_BYTES, files: 1 } })
    .single('resume')(req, res, (error) => {
      if (error) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ success: false, code: error.code, error: error.message });
      req.uploadedFiles = req.file ? [req.file] : [];
      return next();
    });
};

router.post('/jobs/resume-upload', authenticate, receiveResume, async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    let stored;
    try {
      [stored] = await uploads.storeFiles(req.uploadedFiles, { userId: req.user.id, purpose: 'document', module: 'resume' });
    } catch (error) {
      if (error instanceof uploads.UploadError) return res.status(error.status).json({ success: false, code: error.code, error: error.message });
      throw error;
    }
    const buffer = req.file.buffer;
    const text = extractTextFromBuffer(buffer, `resume${stored.type === 'application/pdf' ? '.pdf' : stored.type.includes('wordprocessingml') ? '.docx' : '.doc'}`);
    const parsed = parseResumeText(text);

    // Save parsed data to resume
    const filePath = stored.url;
    const existing = await queryOne('SELECT id FROM job_resumes WHERE user_id = $1', [req.user.id]);

    if (existing) {
      await query(
        `UPDATE job_resumes SET pdf_resume_url = $1, parsed_data = $2, headline = COALESCE(headline, $3), summary = COALESCE(summary, $4), experience_years = CASE WHEN experience_years = 0 THEN $5 ELSE experience_years END, updated_at = CURRENT_TIMESTAMP WHERE user_id = $6`,
        [filePath, JSON.stringify(parsed), parsed.name || '', parsed.summary || '', parsed.experience_years, req.user.id]
      );
    } else {
      await query(
        `INSERT INTO job_resumes (id, user_id, pdf_resume_url, parsed_data, headline, summary, experience_years) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [crypto.randomUUID(), req.user.id, filePath, JSON.stringify(parsed), parsed.name || '', parsed.summary || '', parsed.experience_years]
      );
    }

    // Update skills from parsed data
    for (const skill of parsed.skills) {
      try {
        const resumeRow = await queryOne('SELECT id FROM job_resumes WHERE user_id = $1', [req.user.id]);
        if (resumeRow) {
          await query(
            // user_id is NOT NULL and was never supplied, so no parsed skill
            // was ever saved; the catch below hid the failure.
            `INSERT INTO job_skills (id, user_id, resume_id, skill_name, proficiency)
             VALUES ($1, $2, $3, $4, 'intermediate')
             ON CONFLICT (user_id, skill_name) DO NOTHING`,
            [crypto.randomUUID(), req.user.id, resumeRow.id, skill]
          );
        }
      } catch (e) {}
    }

    res.json({
      success: true,
      parsed,
            file: { id: stored.id, url: filePath, name: stored.name, size: stored.size },
      message: `Extracted ${parsed.skills.length} skills, ${parsed.education.length} education entries, ${parsed.experience_years} years experience`
    });
  } catch (error) { next(error); }
});

// Postings live in local_job_postings (routes/jobs.routes.js writes them). The
// handlers below read job_postings, a table left by an earlier schema file that
// no code inserts into, so the skill-gap analyser and referral links answered
// "Job not found" for every job and the employer dashboard was always empty.
// J3: Skill Gap Analyzer
router.post('/jobs/skill-gap', authenticate, async (req, res, next) => {
  try {
    const { job_id } = req.body;
    const job = await queryOne('SELECT * FROM local_job_postings WHERE id = $1', [job_id]);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    const resume = await queryOne('SELECT id FROM job_resumes WHERE user_id = $1', [req.user.id]);
    const userSkills = resume ? await queryMany('SELECT skill_name FROM job_skills WHERE resume_id = $1', [resume.id]) : [];

    let requiredSkills = [];
    try { requiredSkills = typeof job.skills_required === 'string' ? JSON.parse(job.skills_required) : (job.skills_required || []); } catch (e) {}
    requiredSkills = requiredSkills.map(s => typeof s === 'object' ? s.name || s : s);

    const userSkillNames = userSkills.map(s => s.skill_name.toLowerCase());
    const matched = [];
    const missing = [];
    const courseSuggestions = {
      'react': 'https://youtube.com/results?search_query=react+tutorial+free',
      'node': 'https://youtube.com/results?search_query=nodejs+tutorial+free',
      'python': 'https://youtube.com/results?search_query=python+tutorial+free',
      'aws': 'https://youtube.com/results?search_query=aws+tutorial+free',
      'docker': 'https://youtube.com/results?search_query=docker+tutorial+free',
      'sql': 'https://youtube.com/results?search_query=sql+tutorial+free',
      'javascript': 'https://youtube.com/results?search_query=javascript+tutorial+free',
      'excel': 'https://youtube.com/results?search_query=excel+tutorial+free',
      'default': 'https://youtube.com/results?search_query='
    };

    for (const skill of requiredSkills) {
      const normalized = skill.toLowerCase();
      if (userSkillNames.some(us => us === normalized || us.includes(normalized) || normalized.includes(us))) {
        matched.push({ skill, status: 'have' });
      } else {
        const courseUrl = courseSuggestions[normalized] || courseSuggestions.default + encodeURIComponent(skill + ' tutorial free');
        missing.push({ skill, status: 'missing', learn_url: courseUrl, estimated_time: '2-4 weeks' });
      }
    }

    const currentScore = requiredSkills.length > 0 ? Math.round((matched.length / requiredSkills.length) * 100) : 75;
    const potentialScore = 100;

    res.json({
      success: true,
      analysis: {
        current_match: currentScore,
        potential_match: potentialScore,
        matched_skills: matched,
        missing_skills: missing,
        gap_count: missing.length,
        recommendation: missing.length === 0
          ? '🎉 You have all required skills! Apply with confidence!'
          : missing.length <= 2
            ? `📈 Learn ${missing.map(m => m.skill).join(' and ')} to reach ${potentialScore}% match!`
            : `📚 You need ${missing.length} more skills. Start with ${missing[0].skill} — it's the most in-demand!`
      }
    });
  } catch (error) { next(error); }
});

// J5: Employer Dashboard
router.get('/jobs/employer/dashboard', authenticate, async (req, res, next) => {
  try {
    const myJobs = await queryMany('SELECT * FROM local_job_postings WHERE employer_id = $1 ORDER BY created_at DESC', [req.user.id]);
    const stats = [];

    for (const job of myJobs) {
      const appCount = await queryOne(`SELECT COUNT(*) as cnt FROM job_applications WHERE job_id = $1`, [job.id]);
      const stageBreakdown = await queryMany(
        `SELECT stage, COUNT(*) as cnt FROM job_applications WHERE job_id = $1 GROUP BY stage`, [job.id]
      );
      const avgScore = await queryOne(`SELECT AVG(match_score) as avg FROM job_applications WHERE job_id = $1 AND match_score > 0`, [job.id]);
      stats.push({
        job_id: job.id, title: job.title, status: job.status, created_at: job.created_at,
        views: job.views_count || 0,
        total_applications: appCount?.cnt || 0,
        avg_match_score: avgScore?.avg ? parseFloat(avgScore.avg).toFixed(0) : 0,
        stage_breakdown: stageBreakdown.reduce((acc, s) => { acc[s.stage] = s.cnt; return acc; }, {}),
      });
    }

    const totalApps = stats.reduce((s, j) => s + j.total_applications, 0);
    const totalViews = stats.reduce((s, j) => s + j.views, 0);

    res.json({
      success: true,
      dashboard: {
        total_jobs: myJobs.length,
        total_applications: totalApps,
        total_views: totalViews,
        conversion_rate: totalViews > 0 ? ((totalApps / totalViews) * 100).toFixed(1) : 0,
        jobs: stats
      }
    });
  } catch (error) { next(error); }
});

// J5: Employer — Bulk update application stages
//
// Only for applications to the caller's own job postings. The ids came from
// the request and were updated as given, so any signed-in account could
// reject — or "hire" — any applicant to any job on the platform, and each
// applicant was then notified of it. Failures were swallowed and counted as
// updates.
const STAGE_FOR_ACTION = { shortlist: 'shortlisted', reject: 'rejected', interview: 'interviewing', offer: 'offered', hire: 'hired' };

router.post('/jobs/employer/bulk-action', authenticate, async (req, res, next) => {
  try {
    const { application_ids, action, interview_date } = req.body || {};
    if (!application_ids || !Array.isArray(application_ids)) return res.status(400).json({ success: false, error: 'Provide application_ids array' });
    if (application_ids.length > 200) return res.status(400).json({ success: false, error: 'At most 200 applications at a time' });
    const stage = STAGE_FOR_ACTION[action];
    if (!stage) return res.status(400).json({ success: false, error: `action must be one of: ${Object.keys(STAGE_FOR_ACTION).join(', ')}` });
    if (action === 'interview' && !interview_date) return res.status(400).json({ success: false, error: 'interview_date is required to schedule an interview' });

    const OWN_JOBS = 'job_id IN (SELECT id FROM local_job_postings WHERE employer_id = $';
    let updated = 0;
    for (const appId of application_ids) {
      const result = action === 'interview'
        ? await query(`UPDATE job_applications SET stage = $1, interview_date = $2 WHERE id = $3 AND ${OWN_JOBS}4)`, [stage, interview_date, appId, req.user.id])
        : await query(`UPDATE job_applications SET stage = $1 WHERE id = $2 AND ${OWN_JOBS}3)`, [stage, appId, req.user.id]);
      if (!result || !result.rowCount) continue;
      updated += 1;

      // Emit socket notification
      try {
        const app = await queryOne('SELECT applicant_id FROM job_applications WHERE id = $1', [appId]);
        const io = req.app.get('io');
        if (io && app) io.to(`jobs_user_${app.applicant_id}`).emit('jobs:stage_updated', { application_id: appId, new_stage: action });
      } catch (e) { /* the notification is best-effort; the update stands */ }
    }

    res.json({ success: true, updated, skipped: application_ids.length - updated, action });
  } catch (error) { next(error); }
});

// J6: Job Alert Subscription
router.post('/jobs/alerts', authenticate, async (req, res, next) => {
  try {
    const { keywords, job_type, sector, min_salary, location, remote_only = false, frequency = 'daily' } = req.body;
    const id = crypto.randomUUID();

    await query(
      `INSERT INTO job_alerts (id, user_id, keywords, job_type, sector, min_salary, location, remote_only, frequency) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, req.user.id, keywords, job_type, sector, min_salary, location, remote_only ? 1 : 0, frequency]
    );

    res.json({ success: true, alert: { id, keywords, job_type, sector, min_salary, frequency }, message: '🔔 Job alert created! You\'ll be notified when matching jobs are posted.' });
  } catch (error) { next(error); }
});

// J6: Get my alerts
router.get('/jobs/alerts', authenticate, async (req, res, next) => {
  try {
    const alerts = await queryMany("SELECT * FROM job_alerts WHERE user_id = $1 AND is_active = '1' ORDER BY created_at DESC", [req.user.id]);
    res.json({ success: true, alerts });
  } catch (error) { next(error); }
});

// J6: Delete alert
router.delete('/jobs/alerts/:alertId', authenticate, async (req, res, next) => {
  try {
    await query("UPDATE job_alerts SET is_active = '0' WHERE id = $1 AND user_id = $2", [req.params.alertId, req.user.id]);
    res.json({ success: true, message: 'Alert deactivated' });
  } catch (error) { next(error); }
});

// J7: Referral System — Generate referral link
router.post('/jobs/referral/generate', authenticate, async (req, res, next) => {
  try {
    const { job_id } = req.body;
    const job = await queryOne('SELECT * FROM local_job_postings WHERE id = $1', [job_id]);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    const code = `REF-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    const id = crypto.randomUUID();

    await query(
      `INSERT INTO job_referrals (id, job_id, referrer_id, referral_code, bounty_amount) VALUES ($1,$2,$3,$4,$5)`,
      [id, job_id, req.user.id, code, job.referral_bounty || 0]
    );

    res.json({
      success: true,
      referral: {
        code, bounty: job.referral_bounty || 0,
        share_link: `${process.env.CLIENT_URL || 'http://localhost:3000'}/jobs?ref=${code}`,
        message: job.referral_bounty > 0 ? `Share this link — earn ₹${job.referral_bounty} when your referral gets hired!` : 'Share this job with friends!'
      }
    });
  } catch (error) { next(error); }
});

// Kept as a local name because several call sites below use it; the maths now
// lives in one place (src/utils/geo.js) rather than being rewritten per module.
const haversineKm = geo.distanceKm;

module.exports = router;
