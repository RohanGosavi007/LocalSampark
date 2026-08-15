const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, queryOne, queryMany } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');

// ═══════════════════════════════════════════════════════════════
// M3: TIMED AUCTION MODE
// ═══════════════════════════════════════════════════════════════

// Create auction for a listing
router.post('/marketplace/auctions', authenticate, async (req, res, next) => {
  try {
    const { listing_id, starting_price, bid_increment = 50, duration_hours = 24 } = req.body;
    const listing = await queryOne('SELECT * FROM marketplace_listings WHERE id = $1 AND seller_id = $2', [listing_id, req.user.id]);
    if (!listing) return res.status(404).json({ success: false, error: 'Listing not found or unauthorized' });

    const id = crypto.randomUUID();
    const endsAt = new Date(Date.now() + duration_hours * 3600000).toISOString();

    await query(
      `INSERT INTO marketplace_auctions (id, listing_id, starting_price, current_bid, bid_increment, ends_at, status) VALUES ($1,$2,$3,$4,$5,$6,'active')`,
      [id, listing_id, starting_price || listing.price, starting_price || listing.price, bid_increment, endsAt]
    );
    await query(`UPDATE marketplace_listings SET listing_mode = 'auction' WHERE id = $1`, [listing_id]);

    res.json({
      success: true,
      auction: { id, listing_id, starting_price: starting_price || listing.price, bid_increment, ends_at: endsAt, status: 'active', duration_hours }
    });
  } catch (error) { next(error); }
});

// Get auction details
router.get('/marketplace/auctions/:auctionId', async (req, res, next) => {
  try {
    const auction = await queryOne(
      `SELECT a.*, l.title, l.category, l.condition, l.photo_urls, u.full_name as seller_name
       FROM marketplace_auctions a LEFT JOIN marketplace_listings l ON a.listing_id = l.id LEFT JOIN users u ON l.seller_id = u.id WHERE a.id = $1`, [req.params.auctionId]
    );
    if (!auction) return res.status(404).json({ success: false, error: 'Auction not found' });

    const bids = await queryMany(
      `SELECT ab.*, u.full_name as bidder_name FROM marketplace_auction_bids ab LEFT JOIN users u ON ab.bidder_id = u.id WHERE ab.auction_id = $1 ORDER BY ab.bid_amount DESC LIMIT 20`,
      [req.params.auctionId]
    );

    const now = new Date();
    const endsAt = new Date(auction.ends_at);
    const secondsRemaining = Math.max(0, Math.floor((endsAt - now) / 1000));
    const isExpired = secondsRemaining <= 0;

    if (isExpired && auction.status === 'active') {
      await query(`UPDATE marketplace_auctions SET status = 'ended', winner_id = $1 WHERE id = $2`, [auction.highest_bidder_id, req.params.auctionId]);
      auction.status = 'ended';
      auction.winner_id = auction.highest_bidder_id;
    }

    res.json({
      success: true,
      auction: { ...auction, photo_urls: (() => { try { return JSON.parse(auction.photo_urls || '[]'); } catch { return []; } })() },
      bids,
      seconds_remaining: secondsRemaining,
      is_expired: isExpired
    });
  } catch (error) { next(error); }
});

// Place bid on auction
router.post('/marketplace/auctions/:auctionId/bid', authenticate, async (req, res, next) => {
  try {
    const { bid_amount } = req.body;
    const auction = await queryOne('SELECT * FROM marketplace_auctions WHERE id = $1', [req.params.auctionId]);
    if (!auction) return res.status(404).json({ success: false, error: 'Auction not found' });
    if (auction.status !== 'active') return res.status(400).json({ success: false, error: 'Auction has ended' });

    const now = new Date();
    if (new Date(auction.ends_at) <= now) return res.status(400).json({ success: false, error: 'Auction expired' });
    if (bid_amount < (auction.current_bid || 0) + auction.bid_increment) {
      return res.status(400).json({ success: false, error: `Minimum bid: ₹${(auction.current_bid || 0) + auction.bid_increment}` });
    }

    await query(
      `INSERT INTO marketplace_auction_bids (auction_id, bidder_id, bid_amount) VALUES ($1,$2,$3)`,
      [req.params.auctionId, req.user.id, bid_amount]
    );
    await query(
      `UPDATE marketplace_auctions SET current_bid = $1, highest_bidder_id = $2, total_bids = total_bids + 1 WHERE id = $3`,
      [bid_amount, req.user.id, req.params.auctionId]
    );

    // Real-time broadcast
    try {
      const io = req.app.get('io');
      if (io) io.to(`auction_${req.params.auctionId}`).emit('marketplace:bid_placed', {
        auction_id: req.params.auctionId, bid_amount, bidder_id: req.user.id, total_bids: (auction.total_bids || 0) + 1, timestamp: Date.now()
      });
    } catch (e) {}

    res.json({ success: true, bid: { amount: bid_amount, auction_id: req.params.auctionId }, new_current_bid: bid_amount });
  } catch (error) { next(error); }
});

// List active auctions
router.get('/marketplace/auctions', async (req, res, next) => {
  try {
    const auctions = await queryMany(
      `SELECT a.*, l.title, l.category, l.condition, l.photo_urls, u.full_name as seller_name
       FROM marketplace_auctions a LEFT JOIN marketplace_listings l ON a.listing_id = l.id LEFT JOIN users u ON l.seller_id = u.id
       WHERE a.status = 'active' ORDER BY a.ends_at ASC LIMIT 30`
    );
    const enriched = auctions.map(a => {
      const secondsRemaining = Math.max(0, Math.floor((new Date(a.ends_at) - new Date()) / 1000));
      return { ...a, seconds_remaining: secondsRemaining, photo_urls: (() => { try { return JSON.parse(a.photo_urls || '[]'); } catch { return []; } })() };
    });
    res.json({ success: true, auctions: enriched });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════
// M4: PRICE DROP ALERTS
// ═══════════════════════════════════════════════════════════════

router.post('/marketplace/price-alerts', authenticate, async (req, res, next) => {
  try {
    const { listing_id, category, max_price, keywords } = req.body;
    await query(
      `INSERT INTO marketplace_price_alerts (user_id, listing_id, category, max_price, keywords) VALUES ($1,$2,$3,$4,$5)`,
      [req.user.id, listing_id || null, category || null, max_price || null, keywords || null]
    );
    res.json({ success: true, message: '🔔 Price alert set! We\'ll notify you when the price drops.' });
  } catch (error) { next(error); }
});

router.get('/marketplace/price-alerts', authenticate, async (req, res, next) => {
  try {
    const alerts = await queryMany(
      `SELECT pa.*, l.title, l.price as current_price FROM marketplace_price_alerts pa LEFT JOIN marketplace_listings l ON pa.listing_id = l.id WHERE pa.user_id = $1 AND pa.is_active = 1 ORDER BY pa.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, alerts });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════
// J2: VIDEO RESUME (30-SECOND)
// ═══════════════════════════════════════════════════════════════

router.post('/jobs/video-resume', authenticate, async (req, res, next) => {
  try {
    const { video_url } = req.body;
    if (!video_url) return res.status(400).json({ success: false, error: 'Provide video_url' });

    const resume = await queryOne('SELECT id FROM job_resumes WHERE user_id = $1', [req.user.id]);
    if (resume) {
      await query('UPDATE job_resumes SET video_resume_url = $1, updated_at = datetime(\'now\') WHERE user_id = $2', [video_url, req.user.id]);
    } else {
      await query('INSERT INTO job_resumes (id, user_id, video_resume_url, headline) VALUES ($1,$2,$3,$4)',
        [crypto.randomUUID(), req.user.id, video_url, '']);
    }
    res.json({ success: true, message: '🎬 Video resume saved! Employers can now see your introduction.' });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════
// J9: SKILL ASSESSMENT QUIZZES
// ═══════════════════════════════════════════════════════════════

// Get available assessments
router.get('/jobs/assessments', async (req, res, next) => {
  try {
    let assessments = await queryMany('SELECT * FROM job_skill_assessments WHERE is_active = 1 ORDER BY skill_name');
    if (assessments.length === 0) {
      // Seed some default assessments
      const defaults = [
        { skill: 'JavaScript', questions: JSON.stringify([
          { q: 'What does typeof null return?', opts: ['null','object','undefined','number'], ans: 1 },
          { q: 'Which method converts JSON string to object?', opts: ['JSON.stringify()','JSON.parse()','JSON.convert()','JSON.decode()'], ans: 1 },
          { q: 'What is a closure?', opts: ['A function inside a function with access to outer scope','A locked variable','A CSS property','A DOM method'], ans: 0 },
          { q: 'Which is NOT a primitive type?', opts: ['string','boolean','object','number'], ans: 2 },
          { q: 'What does === check?', opts: ['Value only','Type only','Value and type','Reference'], ans: 2 },
        ]) },
        { skill: 'Python', questions: JSON.stringify([
          { q: 'What is the output of print(type([]))?', opts: ['<class \'list\'>','<class \'array\'>','<class \'tuple\'>','list'], ans: 0 },
          { q: 'Which keyword defines a function?', opts: ['function','func','def','define'], ans: 2 },
          { q: 'What does len() return for \'hello\'?', opts: ['4','5','6','Error'], ans: 1 },
          { q: 'Which is immutable?', opts: ['list','dict','tuple','set'], ans: 2 },
          { q: 'What does pip do?', opts: ['Compiles Python','Runs tests','Package manager','Code formatter'], ans: 2 },
        ]) },
        { skill: 'SQL', questions: JSON.stringify([
          { q: 'Which clause filters rows?', opts: ['SELECT','WHERE','FROM','ORDER BY'], ans: 1 },
          { q: 'What does JOIN do?', opts: ['Deletes rows','Combines tables','Creates index','Sorts data'], ans: 1 },
          { q: 'Which returns unique values?', opts: ['UNIQUE','DIFFERENT','DISTINCT','SEPARATE'], ans: 2 },
          { q: 'What does COUNT(*) count?', opts: ['Columns','Tables','All rows','NULL values'], ans: 2 },
          { q: 'Which is used to update data?', opts: ['MODIFY','ALTER','UPDATE','CHANGE'], ans: 2 },
        ]) },
        { skill: 'Excel', questions: JSON.stringify([
          { q: 'Which function sums values?', opts: ['=ADD()','=SUM()','=TOTAL()','=PLUS()'], ans: 1 },
          { q: 'What does VLOOKUP do?', opts: ['Validates data','Vertical lookup','Creates charts','Filters rows'], ans: 1 },
          { q: 'Which shortcut copies?', opts: ['Ctrl+V','Ctrl+X','Ctrl+C','Ctrl+Z'], ans: 2 },
          { q: 'What is a pivot table?', opts: ['A rotated table','Data summarization tool','A chart type','A formula'], ans: 1 },
          { q: 'Which function counts non-empty cells?', opts: ['COUNT','COUNTA','COUNTIF','COUNTBLANK'], ans: 1 },
        ]) },
        { skill: 'Communication', questions: JSON.stringify([
          { q: 'Active listening involves?', opts: ['Interrupting','Multitasking','Full attention and feedback','Preparing your response'], ans: 2 },
          { q: 'Which is non-verbal communication?', opts: ['Email','Body language','Phone call','Text message'], ans: 1 },
          { q: 'Best way to handle criticism?', opts: ['Argue back','Ignore it','Listen and reflect','Walk away'], ans: 2 },
          { q: 'What makes a good presentation?', opts: ['Reading slides word-for-word','Clear structure and engagement','Using complex jargon','Speaking very fast'], ans: 1 },
          { q: 'In email, CC means?', opts: ['Carbon Copy','Central Copy','Certified Copy','Complete Copy'], ans: 0 },
        ]) },
      ];
      for (const d of defaults) {
        const id = crypto.randomUUID();
        try {
          await query('INSERT INTO job_skill_assessments (id, skill_name, questions, passing_score, time_limit_seconds) VALUES ($1,$2,$3,60,300)',
            [id, d.skill, d.questions]);
        } catch (e) {}
      }
      assessments = await queryMany('SELECT * FROM job_skill_assessments WHERE is_active = 1');
    }
    // Don't send answers to client
    const safe = assessments.map(a => {
      let questions = [];
      try { questions = JSON.parse(a.questions); } catch (e) {}
      return { ...a, questions: questions.map(q => ({ q: q.q, opts: q.opts })), total_questions: questions.length };
    });
    res.json({ success: true, assessments: safe });
  } catch (error) { next(error); }
});

// Submit assessment
router.post('/jobs/assessments/:assessmentId/submit', authenticate, async (req, res, next) => {
  try {
    const { answers } = req.body; // array of selected option indices
    const assessment = await queryOne('SELECT * FROM job_skill_assessments WHERE id = $1', [req.params.assessmentId]);
    if (!assessment) return res.status(404).json({ success: false, error: 'Assessment not found' });

    let questions = [];
    try { questions = JSON.parse(assessment.questions); } catch (e) {}

    let correct = 0;
    const results = questions.map((q, i) => {
      const userAns = answers?.[i];
      const isCorrect = userAns === q.ans;
      if (isCorrect) correct++;
      return { question: q.q, correct: isCorrect, your_answer: q.opts[userAns] || 'Not answered', correct_answer: q.opts[q.ans] };
    });

    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    const passed = score >= (assessment.passing_score || 60);

    await query(
      'INSERT INTO job_assessment_attempts (assessment_id, user_id, score, passed, answers, completed_at) VALUES ($1,$2,$3,$4,$5,datetime(\'now\'))',
      [req.params.assessmentId, req.user.id, score, passed ? 1 : 0, JSON.stringify(answers)]
    );

    // If passed, add verified badge to skill
    if (passed) {
      try {
        const resume = await queryOne('SELECT id FROM job_resumes WHERE user_id = $1', [req.user.id]);
        if (resume) {
          await query('INSERT OR IGNORE INTO job_skills (resume_id, skill_name, proficiency, verified) VALUES ($1,$2,\'advanced\',1)',
            [resume.id, assessment.skill_name]);
        }
      } catch (e) {}
    }

    res.json({
      success: true,
      result: {
        score, passed, correct, total: questions.length,
        skill: assessment.skill_name,
        badge: passed ? `✅ Verified ${assessment.skill_name}` : null,
        message: passed ? `🎉 Congratulations! You passed the ${assessment.skill_name} assessment with ${score}%!` : `📚 You scored ${score}%. Need ${assessment.passing_score}% to pass. Keep practicing!`,
        breakdown: results
      }
    });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════
// C6: AUTO-PUBLISH RECURRING RIDES
// ═══════════════════════════════════════════════════════════════

router.post('/carpool/recurring/publish', authenticate, async (req, res, next) => {
  try {
    const { recurring_id } = req.body;
    const recurring = await queryOne('SELECT * FROM carpool_recurring_rides WHERE id = $1 AND driver_id = $2', [recurring_id, req.user.id]);
    if (!recurring) return res.status(404).json({ success: false, error: 'Recurring ride not found' });

    let days = [];
    try { days = JSON.parse(recurring.days_active || '[]'); } catch (e) {}
    const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const today = new Date().getDay();
    const todayName = Object.keys(dayMap).find(k => dayMap[k] === today);

    if (!days.includes(todayName)) {
      return res.json({ success: false, message: `Today is ${todayName} — not in your schedule (${days.join(', ')})` });
    }

    const rideId = crypto.randomUUID();
    const rideDate = new Date().toISOString().split('T')[0];

    await query(
      `INSERT INTO carpool_rides (id, driver_id, from_location, to_location, departure_time, seats_available, available_seats, price_per_seat, ride_type, gender_preference, ride_date, recurring_id, status, from_lat, from_lng, to_lat, to_lng)
       VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,$9,$10,$11,'active',$12,$13,$14,$15)`,
      [rideId, req.user.id, recurring.from_location, recurring.to_location, recurring.departure_time,
       recurring.seats_available || 3, recurring.price_per_seat || 0, recurring.ride_type || 'car',
       recurring.gender_preference || 'any', rideDate, recurring_id,
       recurring.from_lat, recurring.from_lng, recurring.to_lat, recurring.to_lng]
    );

    res.json({ success: true, ride_id: rideId, message: `🚗 Ride auto-published for ${rideDate}!` });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════
// C8: RIDE SHARING GROUPS
// ═══════════════════════════════════════════════════════════════

// Create group
router.post('/carpool/groups', authenticate, async (req, res, next) => {
  try {
    const { name, description, group_type = 'commute', from_location, to_location, from_lat, from_lng, to_lat, to_lng, departure_time, days_active, max_members = 20 } = req.body;
    const id = crypto.randomUUID();

    await query(
      `INSERT INTO carpool_groups (id, name, description, group_type, from_location, to_location, from_lat, from_lng, to_lat, to_lng, departure_time, days_active, max_members, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [id, name, description, group_type, from_location, to_location, from_lat, from_lng, to_lat, to_lng, departure_time,
       JSON.stringify(days_active || ['Mon','Tue','Wed','Thu','Fri']), max_members, req.user.id]
    );
    // Auto-join creator
    await query('INSERT INTO carpool_group_members (group_id, user_id, role) VALUES ($1,$2,\'admin\')', [id, req.user.id]);

    res.json({ success: true, group: { id, name, group_type, max_members } });
  } catch (error) { next(error); }
});

// List groups
router.get('/carpool/groups', async (req, res, next) => {
  try {
    const groups = await queryMany(
      `SELECT g.*, u.full_name as creator_name,
       (SELECT COUNT(*) FROM carpool_group_members WHERE group_id = g.id) as member_count
       FROM carpool_groups g LEFT JOIN users u ON g.created_by = u.id WHERE g.is_active = 1 ORDER BY g.created_at DESC LIMIT 30`
    );
    res.json({ success: true, groups });
  } catch (error) { next(error); }
});

// Join group
router.post('/carpool/groups/:groupId/join', authenticate, async (req, res, next) => {
  try {
    const group = await queryOne('SELECT * FROM carpool_groups WHERE id = $1 AND is_active = 1', [req.params.groupId]);
    if (!group) return res.status(404).json({ success: false, error: 'Group not found' });

    const memberCount = await queryOne('SELECT COUNT(*) as cnt FROM carpool_group_members WHERE group_id = $1', [req.params.groupId]);
    if ((memberCount?.cnt || 0) >= group.max_members) return res.status(400).json({ success: false, error: 'Group is full' });

    await query('INSERT OR IGNORE INTO carpool_group_members (group_id, user_id) VALUES ($1,$2)', [req.params.groupId, req.user.id]);
    res.json({ success: true, message: `Joined "${group.name}"!` });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════
// X4: GAMIFICATION & REWARDS
// ═══════════════════════════════════════════════════════════════

// Get user coins/badges
router.get('/gamification/profile', authenticate, async (req, res, next) => {
  try {
    const user = await queryOne('SELECT id, full_name, created_at FROM users WHERE id = $1', [req.user.id]);

    // Count activities
    const rides = await queryOne('SELECT COUNT(*) as cnt FROM carpool_rides WHERE driver_id = $1', [req.user.id]);
    const ridesTaken = await queryOne('SELECT COUNT(*) as cnt FROM carpool_bookings WHERE passenger_id = $1', [req.user.id]);
    const listings = await queryOne('SELECT COUNT(*) as cnt FROM marketplace_listings WHERE seller_id = $1', [req.user.id]);
    const sold = await queryOne(`SELECT COUNT(*) as cnt FROM marketplace_listings WHERE seller_id = $1 AND status = 'sold'`, [req.user.id]);
    const applications = await queryOne('SELECT COUNT(*) as cnt FROM job_applications WHERE applicant_id = $1', [req.user.id]);

    // Calculate coins
    const ridesOffered = rides?.cnt || 0;
    const ridesBooked = ridesTaken?.cnt || 0;
    const itemsListed = listings?.cnt || 0;
    const itemsSold = sold?.cnt || 0;
    const jobsApplied = applications?.cnt || 0;

    const coins = (ridesOffered * 50) + (ridesBooked * 20) + (itemsListed * 15) + (itemsSold * 30) + (jobsApplied * 10);

    // Determine badges
    const badges = [];
    if (ridesOffered >= 1) badges.push({ name: 'First Ride', icon: '🚗', description: 'Offered your first ride' });
    if (ridesOffered >= 10) badges.push({ name: 'Road Warrior', icon: '🛣️', description: '10+ rides offered' });
    if (ridesOffered >= 50) badges.push({ name: 'Highway King', icon: '👑', description: '50+ rides offered' });
    if (ridesBooked >= 5) badges.push({ name: 'Frequent Rider', icon: '🎫', description: '5+ rides taken' });
    if (itemsListed >= 1) badges.push({ name: 'First Listing', icon: '📦', description: 'Listed your first item' });
    if (itemsSold >= 5) badges.push({ name: 'Power Seller', icon: '💎', description: '5+ items sold' });
    if (itemsSold >= 20) badges.push({ name: 'Market King', icon: '🏆', description: '20+ items sold' });
    if (jobsApplied >= 1) badges.push({ name: 'Job Seeker', icon: '📋', description: 'Applied to first job' });
    if (jobsApplied >= 10) badges.push({ name: 'Active Applicant', icon: '🎯', description: '10+ applications' });
    if (coins >= 500) badges.push({ name: 'Coin Collector', icon: '🪙', description: '500+ coins earned' });
    if (coins >= 2000) badges.push({ name: 'Gold Member', icon: '🥇', description: '2000+ coins earned' });

    // Determine level
    const level = coins >= 5000 ? 'Diamond' : coins >= 2000 ? 'Gold' : coins >= 500 ? 'Silver' : 'Bronze';
    const levelEmoji = { Diamond: '💎', Gold: '🥇', Silver: '🥈', Bronze: '🥉' };

    res.json({
      success: true,
      profile: {
        user_id: req.user.id,
        name: user?.full_name,
        coins,
        level,
        level_emoji: levelEmoji[level],
        next_level_coins: level === 'Bronze' ? 500 : level === 'Silver' ? 2000 : level === 'Gold' ? 5000 : 99999,
        stats: { rides_offered: ridesOffered, rides_taken: ridesBooked, items_listed: itemsListed, items_sold: itemsSold, jobs_applied: jobsApplied },
        badges,
        coin_breakdown: {
          from_rides: ridesOffered * 50,
          from_bookings: ridesBooked * 20,
          from_listings: itemsListed * 15,
          from_sales: itemsSold * 30,
          from_applications: jobsApplied * 10
        }
      }
    });
  } catch (error) { next(error); }
});

// Leaderboard
router.get('/gamification/leaderboard', async (req, res, next) => {
  try {
    // Calculate top users by activity count
    const topDrivers = await queryMany(
      `SELECT u.id, u.full_name, COUNT(*) as ride_count FROM carpool_rides cr LEFT JOIN users u ON cr.driver_id = u.id GROUP BY cr.driver_id ORDER BY ride_count DESC LIMIT 10`
    );
    const topSellers = await queryMany(
      `SELECT u.id, u.full_name, COUNT(*) as sold_count FROM marketplace_listings ml LEFT JOIN users u ON ml.seller_id = u.id WHERE ml.status = 'sold' GROUP BY ml.seller_id ORDER BY sold_count DESC LIMIT 10`
    );

    res.json({
      success: true,
      leaderboard: {
        top_drivers: topDrivers.map((d, i) => ({ rank: i + 1, name: d.full_name || 'User', rides: d.ride_count })),
        top_sellers: topSellers.map((s, i) => ({ rank: i + 1, name: s.full_name || 'User', sold: s.sold_count })),
      }
    });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════
// M10: SELLER STOREFRONT
// ═══════════════════════════════════════════════════════════════

router.get('/marketplace/storefront/:sellerId', async (req, res, next) => {
  try {
    const seller = await queryOne('SELECT id, full_name, profile_photo, created_at FROM users WHERE id = $1', [req.params.sellerId]);
    if (!seller) return res.status(404).json({ success: false, error: 'Seller not found' });

    const listings = await queryMany(
      `SELECT * FROM marketplace_listings WHERE seller_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 50`, [req.params.sellerId]
    );
    const stats = await queryOne(
      `SELECT COUNT(*) as total, SUM(CASE WHEN status='sold' THEN 1 ELSE 0 END) as sold, SUM(views_count) as views FROM marketplace_listings WHERE seller_id = $1`,
      [req.params.sellerId]
    );
    const trustScore = await queryOne('SELECT trust_score, last_calculated FROM marketplace_seller_scores WHERE seller_id = $1', [req.params.sellerId]);

    res.json({
      success: true,
      storefront: {
        seller: { id: seller.id, name: seller.full_name, photo: seller.profile_photo, member_since: seller.created_at },
        stats: { total_listings: stats?.total || 0, total_sold: stats?.sold || 0, total_views: stats?.views || 0 },
        trust_score: trustScore?.trust_score || 50,
        listings: listings.map(l => ({ ...l, photo_urls: (() => { try { return JSON.parse(l.photo_urls || '[]'); } catch { return []; } })() }))
      }
    });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════
// J11: COMPANY COMPARISON
// ═══════════════════════════════════════════════════════════════

router.get('/jobs/compare-companies', async (req, res, next) => {
  try {
    const { ids } = req.query; // comma-separated
    if (!ids) return res.status(400).json({ success: false, error: 'Provide company ids' });
    const idList = ids.split(',').map(s => s.trim()).filter(Boolean);

    const companies = [];
    for (const id of idList) {
      const company = await queryOne('SELECT * FROM company_profiles WHERE id = $1', [id]);
      if (company) {
        const reviews = await queryOne(
          `SELECT AVG(rating) as avg, COUNT(*) as cnt FROM company_reviews WHERE company_id = $1`, [id]
        );
        const jobs = await queryOne(`SELECT COUNT(*) as cnt FROM job_postings WHERE company_id = $1 AND status = 'active'`, [id]);
        companies.push({
          ...company,
          avg_rating: reviews?.avg ? parseFloat(reviews.avg).toFixed(1) : '0',
          review_count: reviews?.cnt || 0,
          active_jobs: jobs?.cnt || 0
        });
      }
    }

    res.json({ success: true, companies, comparison_count: companies.length });
  } catch (error) { next(error); }
});

module.exports = router;
