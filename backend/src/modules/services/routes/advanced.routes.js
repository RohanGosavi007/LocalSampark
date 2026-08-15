const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const { query, queryOne, queryMany } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const { parseResumeText, extractTextFromBuffer } = require('../../../utils/resumeParser');

// ═══════════════════════════════════════════════════════════════
// FILE UPLOAD (multer config)
// ═══════════════════════════════════════════════════════════════
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../../public/uploads');
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${crypto.randomUUID().substring(0, 8)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpg|jpeg|png|webp|gif|pdf|doc|docx|txt|mp4|webm|mp3/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    cb(null, allowed.test(ext));
  }
});

// ═══════════════════════════════════════════════════════════════
// PHOTO UPLOAD ENDPOINT (M1)
// ═══════════════════════════════════════════════════════════════
router.post('/upload', authenticate, upload.array('files', 10), async (req, res, next) => {
  try {
    const { module: mod = 'general', entity_id } = req.body;
    const urls = [];
    for (const file of (req.files || [])) {
      const filePath = `/uploads/${file.filename}`;
      const id = crypto.randomUUID();
      try {
        await query(
          `INSERT INTO file_uploads (id, user_id, module, entity_id, file_name, file_path, file_type, file_size, mime_type) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [id, req.user.id, mod, entity_id || null, file.originalname, filePath, path.extname(file.originalname), file.size, file.mimetype]
        );
      } catch (e) { /* file_uploads table might not exist yet */ }
      urls.push({ id, url: filePath, name: file.originalname, size: file.size, type: file.mimetype });
    }
    res.json({ success: true, files: urls, count: urls.length });
  } catch (error) { next(error); }
});

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
      const otp = String(Math.floor(1000 + Math.random() * 9000)); // 4-digit OTP
      try {
        await query(
          `INSERT INTO carpool_ride_otps (ride_id, booking_id, otp_code, expires_at) VALUES ($1, $2, $3, datetime('now', '+30 minutes'))
           ON CONFLICT(ride_id, booking_id) DO UPDATE SET otp_code = $3, verified = 0, expires_at = datetime('now', '+30 minutes')`,
          [rideId, booking.id, otp]
        );
      } catch (e) {
        await query(
          `INSERT OR REPLACE INTO carpool_ride_otps (ride_id, booking_id, otp_code, expires_at) VALUES ($1, $2, $3, datetime('now', '+30 minutes'))`,
          [rideId, booking.id, otp]
        );
      }
      otps.push({ booking_id: booking.id, passenger_id: booking.passenger_id, otp });
    }

    res.json({ success: true, otps, message: 'Share OTPs with passengers before ride starts' });
  } catch (error) { next(error); }
});

// C5: Verify ride OTP
router.post('/carpool/rides/:rideId/verify-otp', authenticate, async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { otp_code, booking_id } = req.body;

    const otpRecord = await queryOne(
      `SELECT * FROM carpool_ride_otps WHERE ride_id = $1 AND booking_id = $2 AND otp_code = $3 AND verified = 0`,
      [rideId, booking_id, otp_code]
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

// C7: Carbon footprint dashboard
router.get('/carpool/carbon-dashboard', authenticate, async (req, res, next) => {
  try {
    const logs = await queryMany('SELECT * FROM carpool_carbon_logs WHERE user_id = $1 ORDER BY logged_at DESC LIMIT 100', [req.user.id]);
    const totals = await queryOne(
      `SELECT SUM(distance_km) as total_km, SUM(co2_saved_kg) as total_co2, SUM(fuel_saved_liters) as total_fuel, SUM(money_saved) as total_money, COUNT(*) as total_rides FROM carpool_carbon_logs WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({
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

// M5: Escrow — Create payment hold
router.post('/marketplace/escrow/create', authenticate, async (req, res, next) => {
  try {
    const { listing_id, amount, payment_method = 'wallet' } = req.body;
    const listing = await queryOne('SELECT * FROM marketplace_listings WHERE id = $1', [listing_id]);
    if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });
    if (listing.seller_id === req.user.id) return res.status(400).json({ success: false, error: 'Cannot buy your own listing' });

    const id = crypto.randomUUID();
    const platformFee = Math.round(amount * 0.02); // 2% platform fee

    await query(
      `INSERT INTO marketplace_escrow (id, listing_id, buyer_id, seller_id, amount, platform_fee, status, payment_method) VALUES ($1,$2,$3,$4,$5,$6,'held',$7)`,
      [id, listing_id, req.user.id, listing.seller_id, amount, platformFee, payment_method]
    );

    res.json({
      success: true,
      escrow: {
        id, listing_id, amount, platform_fee: platformFee,
        net_to_seller: amount - platformFee,
        status: 'held',
        message: '💰 Payment held safely. Seller will deliver the item. Confirm receipt to release payment.'
      }
    });
  } catch (error) { next(error); }
});

// M5: Escrow — Buyer confirms receipt (releases payment)
router.post('/marketplace/escrow/:escrowId/release', authenticate, async (req, res, next) => {
  try {
    const { escrowId } = req.params;
    const escrow = await queryOne('SELECT * FROM marketplace_escrow WHERE id = $1 AND buyer_id = $2', [escrowId, req.user.id]);
    if (!escrow) return res.status(404).json({ success: false, error: 'Escrow not found' });
    if (escrow.status !== 'held') return res.status(400).json({ success: false, error: 'Escrow not in held status' });

    await query(`UPDATE marketplace_escrow SET status = 'released', released_at = datetime('now') WHERE id = $1`, [escrowId]);
    await query(`UPDATE marketplace_listings SET status = 'sold' WHERE id = $1`, [escrow.listing_id]);

    // Emit socket event
    try {
      const io = req.app.get('io');
      if (io) io.to(`mkt_chat_${escrow.listing_id}`).emit('marketplace:escrow_released', { escrow_id: escrowId });
    } catch (e) {}

    res.json({ success: true, message: '✅ Payment released to seller! Transaction complete.' });
  } catch (error) { next(error); }
});

// M5: Escrow — Raise dispute
router.post('/marketplace/escrow/:escrowId/dispute', authenticate, async (req, res, next) => {
  try {
    const { escrowId } = req.params;
    const { reason } = req.body;
    const escrow = await queryOne('SELECT * FROM marketplace_escrow WHERE id = $1 AND buyer_id = $2', [escrowId, req.user.id]);
    if (!escrow) return res.status(404).json({ success: false, error: 'Escrow not found' });

    await query(`UPDATE marketplace_escrow SET status = 'disputed', dispute_reason = $1, dispute_at = datetime('now') WHERE id = $2`, [reason, escrowId]);
    res.json({ success: true, message: 'Dispute raised. Admin will review within 48 hours.' });
  } catch (error) { next(error); }
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
         ON CONFLICT(seller_id) DO UPDATE SET account_age_days=$2, verified_phone=$3, total_listings=$4, total_sold=$5, dispute_count=$6, trust_score=$7, last_calculated=datetime('now')`,
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
router.post('/jobs/resume-upload', authenticate, upload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const fs = require('fs');
    const buffer = fs.readFileSync(req.file.path);
    const text = extractTextFromBuffer(buffer, req.file.originalname);
    const parsed = parseResumeText(text);

    // Save parsed data to resume
    const filePath = `/uploads/${req.file.filename}`;
    const existing = await queryOne('SELECT id FROM job_resumes WHERE user_id = $1', [req.user.id]);

    if (existing) {
      await query(
        `UPDATE job_resumes SET pdf_resume_url = $1, parsed_data = $2, headline = COALESCE(headline, $3), summary = COALESCE(summary, $4), experience_years = CASE WHEN experience_years = 0 THEN $5 ELSE experience_years END, updated_at = datetime('now') WHERE user_id = $6`,
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
            `INSERT OR IGNORE INTO job_skills (resume_id, skill_name, proficiency) VALUES ($1, $2, 'intermediate')`,
            [resumeRow.id, skill]
          );
        }
      } catch (e) {}
    }

    res.json({
      success: true,
      parsed,
      file: { url: filePath, name: req.file.originalname, size: req.file.size },
      message: `Extracted ${parsed.skills.length} skills, ${parsed.education.length} education entries, ${parsed.experience_years} years experience`
    });
  } catch (error) { next(error); }
});

// J3: Skill Gap Analyzer
router.post('/jobs/skill-gap', authenticate, async (req, res, next) => {
  try {
    const { job_id } = req.body;
    const job = await queryOne('SELECT * FROM job_postings WHERE id = $1', [job_id]);
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
    const myJobs = await queryMany('SELECT * FROM job_postings WHERE employer_id = $1 ORDER BY created_at DESC', [req.user.id]);
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
router.post('/jobs/employer/bulk-action', authenticate, async (req, res, next) => {
  try {
    const { application_ids, action, interview_date, meeting_link } = req.body;
    if (!application_ids || !Array.isArray(application_ids)) return res.status(400).json({ success: false, error: 'Provide application_ids array' });

    let updated = 0;
    for (const appId of application_ids) {
      try {
        if (action === 'shortlist') {
          await query(`UPDATE job_applications SET stage = 'shortlisted' WHERE id = $1`, [appId]);
        } else if (action === 'reject') {
          await query(`UPDATE job_applications SET stage = 'rejected' WHERE id = $1`, [appId]);
        } else if (action === 'interview') {
          await query(`UPDATE job_applications SET stage = 'interviewing', interview_date = $1 WHERE id = $2`, [interview_date, appId]);
        } else if (action === 'offer') {
          await query(`UPDATE job_applications SET stage = 'offered' WHERE id = $1`, [appId]);
        } else if (action === 'hire') {
          await query(`UPDATE job_applications SET stage = 'hired' WHERE id = $1`, [appId]);
        }
        updated++;

        // Emit socket notification
        try {
          const app = await queryOne('SELECT applicant_id FROM job_applications WHERE id = $1', [appId]);
          const io = req.app.get('io');
          if (io && app) io.to(`jobs_user_${app.applicant_id}`).emit('jobs:stage_updated', { application_id: appId, new_stage: action });
        } catch (e) {}
      } catch (e) {}
    }

    res.json({ success: true, updated, action });
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
    const alerts = await queryMany('SELECT * FROM job_alerts WHERE user_id = $1 AND is_active = 1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ success: true, alerts });
  } catch (error) { next(error); }
});

// J6: Delete alert
router.delete('/jobs/alerts/:alertId', authenticate, async (req, res, next) => {
  try {
    await query('UPDATE job_alerts SET is_active = 0 WHERE id = $1 AND user_id = $2', [req.params.alertId, req.user.id]);
    res.json({ success: true, message: 'Alert deactivated' });
  } catch (error) { next(error); }
});

// J7: Referral System — Generate referral link
router.post('/jobs/referral/generate', authenticate, async (req, res, next) => {
  try {
    const { job_id } = req.body;
    const job = await queryOne('SELECT * FROM job_postings WHERE id = $1', [job_id]);
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

// Haversine helper
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

module.exports = router;
