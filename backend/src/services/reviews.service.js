/**
 * Shop reviews (C11): one way in, one rule, one rating.
 *
 * Reviews were written five ways (POST /shops/:id/reviews, the order review,
 * /trust-reviews, /engagement/reviews/submit, offline sync) into three
 * tables, with three different rules:
 *   - two of them accepted a review from anyone, signed in, who had never
 *     bought from the shop (one only marked it "not verified", one did not
 *     even do that), which the Consumer Protection (E-Commerce) Rules, 2020
 *     (rule 4(9)) and IS 19000:2022 do not allow;
 *   - three of them overwrote the shop's rating with the average of their own
 *     table, so the rating shown was whichever path last wrote it.
 *
 * Now every path comes here. A review needs a delivered order (or a completed
 * appointment) from the shop; there is one per customer per shop (a new one
 * replaces the old, or is refused, as the caller asks); and the shop's rating
 * is the average of its verified, visible reviews, recomputed on every change.
 * Reports of abuse go to the admin moderation queue; a hidden review leaves
 * the listings and the rating.
 */
const crypto = require('crypto');
const { query, queryOne, queryMany } = require('../config/database');

class ReviewError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ReviewError';
    this.status = status;
    this.code = code;
  }
}

const MAX_TEXT = 2000;
const VISIBLE = "COALESCE(status, 'Published') <> 'Hidden'";
const REPORT_REASONS = ['spam', 'offensive', 'fake', 'personal_information', 'off_topic', 'other'];

const now = () => new Date().toISOString();

/** The delivered order (or completed appointment) that entitles this customer to review this shop. */
async function purchaseFor(userId, shopId, orderId = null) {
  if (orderId) {
    const order = await queryOne('SELECT id, user_id, shop_id, order_status, status FROM orders WHERE CAST(id AS TEXT) = $1', [String(orderId)]);
    if (!order || String(order.shop_id) !== String(shopId)) throw new ReviewError(404, 'ORDER_NOT_FOUND', 'Order not found for this shop');
    if (String(order.user_id) !== String(userId)) throw new ReviewError(403, 'NOT_YOUR_ORDER', 'You can only review your own orders');
    if (String(order.order_status || order.status).toLowerCase() !== 'delivered') {
      throw new ReviewError(400, 'NOT_DELIVERED', 'Only delivered orders can be reviewed');
    }
    return { orderId: order.id };
  }
  const served = await queryOne(
    `SELECT id FROM orders WHERE CAST(shop_id AS TEXT) = $1 AND CAST(user_id AS TEXT) = $2
        AND LOWER(COALESCE(order_status, status)) = 'delivered'
      LIMIT 1`,
    [String(shopId), String(userId)]
  );
  if (served) return { orderId: served.id };
  const booked = await queryOne(
    `SELECT id FROM shop_appointments WHERE CAST(shop_id AS TEXT) = $1 AND CAST(user_id AS TEXT) = $2 AND LOWER(status) = 'completed' LIMIT 1`,
    [String(shopId), String(userId)]
  );
  if (booked) return { orderId: null };
  throw new ReviewError(403, 'NOT_VERIFIED_PURCHASE', 'Only verified buyers who have received a delivered order can review this shop');
}

/** The shop's rating: the average of its verified, visible reviews (0 with none, the column's default). */
async function recomputeRating(shopId) {
  const row = await queryOne(
    `SELECT AVG(rating) AS avg_rating, COUNT(*) AS n FROM shop_reviews
      WHERE CAST(shop_id AS TEXT) = $1 AND ${VISIBLE} AND CAST(COALESCE(is_society_verified, 0) AS INTEGER) = 1`,
    [String(shopId)]
  );
  const rating = row && Number(row.n) > 0 ? Math.round(Number(row.avg_rating) * 10) / 10 : 0;
  await query('UPDATE local_shops SET rating = $1 WHERE CAST(id AS TEXT) = $2', [rating, String(shopId)]);
  return rating;
}

function cleanPhotos(photos) {
  return (Array.isArray(photos) ? photos : [])
    .map((u) => String(u).trim())
    .filter((u) => /^https?:\/\//i.test(u) && u.length <= 2000)
    .slice(0, 5);
}

/**
 * Saves a customer's review of a shop.
 *   mode 'create'  refuse a second review (409)
 *   mode 'upsert'  a second review replaces the first
 */
async function submit({ userId, shopId, rating, text, photos, orderId = null, mode = 'upsert' }) {
  const stars = Number(rating);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new ReviewError(400, 'BAD_RATING', 'rating must be a whole number from 1 to 5');
  }
  const body = text === undefined || text === null ? null : String(text).trim();
  if (body && body.length > MAX_TEXT) throw new ReviewError(400, 'TOO_LONG', `A review can be at most ${MAX_TEXT} characters`);

  const shop = await queryOne('SELECT id, owner_id FROM local_shops WHERE CAST(id AS TEXT) = $1', [String(shopId)]);
  if (!shop) throw new ReviewError(404, 'SHOP_NOT_FOUND', 'Shop not found');
  if (String(shop.owner_id) === String(userId)) throw new ReviewError(403, 'OWN_SHOP', 'You cannot review your own shop');

  await purchaseFor(userId, shop.id, orderId);

  const existing = await queryOne(
    'SELECT id FROM shop_reviews WHERE CAST(shop_id AS TEXT) = $1 AND CAST(user_id AS TEXT) = $2',
    [String(shop.id), String(userId)]
  );
  let id;
  if (existing) {
    if (mode === 'create') throw new ReviewError(409, 'ALREADY_REVIEWED', 'You have already reviewed this shop');
    id = existing.id;
    await query(
      `UPDATE shop_reviews SET rating = $1, review_text = $2, photo_urls = $3, is_society_verified = 1, updated_at = $4
        WHERE id = $5`,
      [stars, body, JSON.stringify(cleanPhotos(photos)), now(), id]
    );
  } else {
    id = crypto.randomUUID();
    await query(
      `INSERT INTO shop_reviews (id, shop_id, user_id, rating, review_text, photo_urls, is_society_verified, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 1, 'Published', $7, $8)`,
      // Separate parameters: created_at and updated_at are different types on PostgreSQL.
      [id, shop.id, userId, stars, body, JSON.stringify(cleanPhotos(photos)), now(), now()]
    );
  }
  const shopRating = await recomputeRating(shop.id);
  return { id, created: !existing, shopRating };
}

/** The shop's visible reviews, newest first (hidden ones are left out). */
async function listForShop(shopId, limit = 50) {
  return queryMany(
    `SELECT sr.id, sr.rating, COALESCE(sr.review_text, sr.comment) AS review_text, sr.photo_urls, sr.reply,
            sr.created_at, CAST(COALESCE(sr.is_society_verified, 0) AS INTEGER) AS verified,
            u.full_name AS user_name, u.avatar_url AS user_avatar
       FROM shop_reviews sr
       LEFT JOIN users u ON u.id = sr.user_id
      WHERE CAST(sr.shop_id AS TEXT) = $1 AND ${VISIBLE.replace(/status/g, 'sr.status')}
      ORDER BY sr.created_at DESC
      LIMIT ${Math.min(Math.max(Number(limit) || 50, 1), 100)}`,
    [String(shopId)]
  );
}

/** A customer reports a review. One open report per person per review. */
async function report({ reviewId, reporterId, reason, details }) {
  if (!REPORT_REASONS.includes(reason)) {
    throw new ReviewError(400, 'BAD_REASON', `reason must be one of: ${REPORT_REASONS.join(', ')}`);
  }
  const review = await queryOne('SELECT id, user_id FROM shop_reviews WHERE CAST(id AS TEXT) = $1', [String(reviewId)]);
  if (!review) throw new ReviewError(404, 'REVIEW_NOT_FOUND', 'Review not found');
  const open = await queryOne(
    "SELECT id FROM review_reports WHERE review_id = $1 AND reporter_id = $2 AND status = 'open'",
    [String(review.id), String(reporterId)]
  );
  if (open) return { id: open.id, alreadyReported: true };
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO review_reports (id, review_id, reporter_id, reason, details, status, created_at)
     VALUES ($1, $2, $3, $4, $5, 'open', $6)`,
    [id, String(review.id), String(reporterId), reason, details ? String(details).slice(0, 1000) : null, now()]
  );
  await query('UPDATE shop_reviews SET is_flagged = 1 WHERE id = $1', [review.id]);
  return { id, alreadyReported: false };
}

/** The admin moderation queue: reviews with open reports, most reported first. */
async function moderationQueue() {
  return queryMany(
    `SELECT sr.id AS review_id, sr.shop_id, s.name AS shop_name, sr.rating, COALESCE(sr.review_text, sr.comment) AS review_text,
            COALESCE(sr.status, 'Published') AS status, u.full_name AS author,
            COUNT(rr.id) AS reports, MIN(rr.created_at) AS first_reported_at
       FROM review_reports rr
       JOIN shop_reviews sr ON CAST(sr.id AS TEXT) = rr.review_id
       LEFT JOIN local_shops s ON s.id = sr.shop_id
       LEFT JOIN users u ON u.id = sr.user_id
      WHERE rr.status = 'open'
      GROUP BY sr.id, sr.shop_id, s.name, sr.rating, sr.review_text, sr.comment, sr.status, u.full_name
      ORDER BY COUNT(rr.id) DESC, MIN(rr.created_at) ASC`,
    []
  );
}

/**
 * An admin decides: 'hide' takes the review out of the listings and the
 * rating; 'keep' publishes it again. Either way its open reports are closed.
 */
async function moderate({ reviewId, action, adminId, note }) {
  if (!['hide', 'keep'].includes(action)) throw new ReviewError(400, 'BAD_ACTION', "action must be 'hide' or 'keep'");
  const review = await queryOne('SELECT id, shop_id FROM shop_reviews WHERE CAST(id AS TEXT) = $1', [String(reviewId)]);
  if (!review) throw new ReviewError(404, 'REVIEW_NOT_FOUND', 'Review not found');
  await query(
    'UPDATE shop_reviews SET status = $1, is_flagged = 0, updated_at = $2 WHERE id = $3',
    [action === 'hide' ? 'Hidden' : 'Published', now(), review.id]
  );
  await query(
    `UPDATE review_reports SET status = 'resolved', resolution = $1, resolved_by = $2, resolved_at = $3, resolution_note = $4
      WHERE review_id = $5 AND status = 'open'`,
    [action, String(adminId), now(), note ? String(note).slice(0, 1000) : null, String(review.id)]
  );
  const shopRating = await recomputeRating(review.shop_id);
  return { reviewId: review.id, status: action === 'hide' ? 'Hidden' : 'Published', shopRating };
}

module.exports = { submit, listForShop, report, moderationQueue, moderate, recomputeRating, purchaseFor, ReviewError, REPORT_REASONS };
