const { query } = require('../../../config/database');

/**
 * Admin ecosystem overview tiles (Krishi, Mobility, Charity, Environment,
 * Animal welfare, Civic, Rewards).
 *
 * Every endpoint here used to answer a fixed list of invented numbers —
 * "1240 farmer registrations", "312 active bike taxis", "8900 loyalty points"
 * — which the admin console showed as platform metrics. Each row is now a
 * COUNT over the table the matching admin module actually manages, so an
 * empty table reads 0.
 *
 * Shape (unchanged for the clients): { success, stats: [{ id, module, count, status }] }
 * `status` is derived from the data: 'Active' when there is something to
 * manage, 'Pending review' when items await an admin, 'No data' when empty.
 *
 * Flag columns are compared with a quoted '1' so the same SQL works whether
 * the column is INTEGER (SQLite, most tables) or BOOLEAN (some Postgres twins).
 */

async function count(sql, params = []) {
  const result = await query(sql, params);
  const row = (result.rows || result || [])[0];
  return Number((row && (row.count ?? row.n)) || 0);
}

const statusFor = (n, { pending = false } = {}) => {
  if (!n) return 'No data';
  return pending ? 'Pending review' : 'Active';
};

async function respond(res, rows) {
  const stats = rows.map(([id, module, n, opts]) => ({ id, module, count: n, status: statusFor(n, opts) }));
  res.json({ success: true, stats });
}

const STATUS = (value) => `LOWER(COALESCE(status, '')) = '${value}'`;

// Agriculture (Krishi)
exports.getKrishiStats = async (req, res, next) => {
  try {
    const [active, verified, waitlist] = await Promise.all([
      count(`SELECT COUNT(*) AS count FROM admin_krishi_listings WHERE ${STATUS('active')}`),
      count("SELECT COUNT(*) AS count FROM admin_krishi_listings WHERE verified_farmer = '1'"),
      count("SELECT COUNT(*) AS count FROM feature_interest_leads WHERE feature_key = 'krishi'"),
    ]);
    await respond(res, [
      ['k1', 'Active Krishi Listings', active],
      ['k2', 'Verified Farmer Listings', verified],
      ['k3', 'Waitlist Sign-ups (Krishi)', waitlist],
    ]);
  } catch (error) { next(error); }
};

// Mobility & Transport
exports.getMobilityStats = async (req, res, next) => {
  try {
    const [fleet, unverified, rides] = await Promise.all([
      count(`SELECT COUNT(*) AS count FROM admin_mobility_fleet WHERE ${STATUS('active')}`),
      count("SELECT COUNT(*) AS count FROM admin_mobility_fleet WHERE (verified_driver <> '1' OR verified_driver IS NULL)"),
      count(`SELECT COUNT(*) AS count FROM carpool_rides WHERE ${STATUS('active')}`),
    ]);
    await respond(res, [
      ['m1', 'Active Fleet Vehicles', fleet],
      ['m2', 'Drivers Awaiting Verification', unverified, { pending: true }],
      ['m3', 'Active Carpool Rides', rides],
    ]);
  } catch (error) { next(error); }
};

// Charity & NGO
exports.getCharityStats = async (req, res, next) => {
  try {
    const [campaigns, verifiedNgos, openTasks] = await Promise.all([
      count(`SELECT COUNT(*) AS count FROM charity_campaigns WHERE ${STATUS('active')}`),
      count("SELECT COUNT(*) AS count FROM charity_campaigns WHERE verified_ngo = '1'"),
      count(`SELECT COUNT(*) AS count FROM volunteer_tasks WHERE ${STATUS('open')}`),
    ]);
    await respond(res, [
      ['c1', 'Active Donation Campaigns', campaigns],
      ['c2', 'Campaigns by Verified NGOs', verifiedNgos],
      ['c3', 'Open Volunteer Tasks', openTasks],
    ]);
  } catch (error) { next(error); }
};

// Environment & Waste
exports.getEnvironmentStats = async (req, res, next) => {
  try {
    const [pending, completed, total] = await Promise.all([
      count(`SELECT COUNT(*) AS count FROM environment_scrap WHERE ${STATUS('pending')}`),
      count(`SELECT COUNT(*) AS count FROM environment_scrap WHERE LOWER(COALESCE(status, '')) IN ('completed', 'collected')`),
      count('SELECT COUNT(*) AS count FROM environment_scrap'),
    ]);
    await respond(res, [
      ['e1', 'Scrap Pickups Pending', pending, { pending: true }],
      ['e2', 'Scrap Pickups Completed', completed],
      ['e3', 'All Scrap Requests', total],
    ]);
  } catch (error) { next(error); }
};

// Animal Welfare
exports.getAnimalStats = async (req, res, next) => {
  try {
    const [pendingRescues, totalRescues, petAlerts] = await Promise.all([
      count(`SELECT COUNT(*) AS count FROM admin_animal_rescue WHERE ${STATUS('pending')}`),
      count('SELECT COUNT(*) AS count FROM admin_animal_rescue'),
      count(`SELECT COUNT(*) AS count FROM pet_alerts WHERE ${STATUS('active')}`),
    ]);
    await respond(res, [
      ['a1', 'Rescue Requests Pending', pendingRescues, { pending: true }],
      ['a2', 'All Rescue Requests', totalRescues],
      ['a3', 'Active Lost/Found Pet Alerts', petAlerts],
    ]);
  } catch (error) { next(error); }
};

// Civic & Legal
exports.getCivicStats = async (req, res, next) => {
  try {
    const [pending, resolved, total] = await Promise.all([
      count(`SELECT COUNT(*) AS count FROM civic_issues WHERE ${STATUS('pending')}`),
      count(`SELECT COUNT(*) AS count FROM civic_issues WHERE ${STATUS('resolved')}`),
      count('SELECT COUNT(*) AS count FROM civic_issues'),
    ]);
    await respond(res, [
      ['cv1', 'Civic Issues Pending', pending, { pending: true }],
      ['cv2', 'Civic Issues Resolved', resolved],
      ['cv3', 'All Civic Issues', total],
    ]);
  } catch (error) { next(error); }
};

// Rewards & Earn
exports.getRewardsStats = async (req, res, next) => {
  try {
    const [referrals, pendingRedemptions, wallets] = await Promise.all([
      count('SELECT COUNT(*) AS count FROM referrals'),
      count(`SELECT COUNT(*) AS count FROM loyalty_redemptions WHERE ${STATUS('pending')}`),
      count('SELECT COUNT(*) AS count FROM loyalty_wallets'),
    ]);
    await respond(res, [
      ['r1', 'Referrals Recorded', referrals],
      ['r2', 'Reward Redemptions Pending', pendingRedemptions, { pending: true }],
      ['r3', 'Loyalty Wallets', wallets],
    ]);
  } catch (error) { next(error); }
};
