/**
 * TOKEN QUEUE ROUTES — Archetype 3: Clinic/Salon/Doctor Token Management
 * For: Dentists, Pathology Labs, Salons, Physiotherapy, Ayurvedic, Dieticians
 */
const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
// Running a shop's queue is for that shop. "Call next" was open to any signed-in
// account, and pause / reset / the visitor list (names and phone numbers) to
// anyone holding the shop-owner role — which is every shop owner, for every
// shop. requireShopParam checks the shop in the URL against the caller.
const { requireShopParam } = require('../../../middleware/shop-owner.middleware');

// â”€â”€ GET /api/v1/token-queue/:shopId — Get current queue state â”€â”€
router.get('/:shopId', async (req, res, next) => {
  try {
    const { shopId } = req.params;

    const queueState = await query(`SELECT current_token, total_tokens_today, avg_service_minutes, is_paused, last_updated
       FROM token_queues WHERE shop_id = $1`,
      [shopId]
    );

    // Visitors are counted whether or not the shop has a queue-state row: joining creates a
    // visitor, not a state row, so a queue people had joined used to read as empty (0 waiting).
    const today = await query(`SELECT COUNT(*) AS waiting, COALESCE(MAX(token_number), 0) AS last_token
         FROM token_queue_visitors
        WHERE shop_id = $1 AND DATE(created_at) = CURRENT_DATE`, [shopId]);
    const waiting = await query(`SELECT COUNT(*) AS count FROM token_queue_visitors
       WHERE shop_id = $1 AND status = 'waiting' AND DATE(created_at) = CURRENT_DATE`, [shopId]);
    const lastToken = parseInt((today.rows || today)[0]?.last_token || 0, 10);

    const state = (queueState.rows || queueState || [])[0] || {};
    res.json({
      currentToken: state.current_token || 0,
      totalTokensToday: Math.max(state.total_tokens_today || 0, lastToken),
      avgServiceMinutes: state.avg_service_minutes || 10,
      isPaused: Boolean(state.is_paused),
      waitingCount: parseInt((waiting.rows || waiting)[0]?.count || 0, 10),
      lastUpdated: state.last_updated || null,
    });
  } catch (error) {
    next(error);
  }
});

// â”€â”€ POST /api/v1/token-queue/:shopId/increment — Merchant calls next token â”€â”€
router.post('/:shopId/increment', authenticate, requireShopParam(), async (req, res, next) => {
  try {
    const { shopId } = req.params;

    // UPSERT token logic
    const result = await query(`
      INSERT INTO token_queues (shop_id, current_token, total_tokens_today, last_updated)
      VALUES ($1, 1, 1, NOW())
      ON CONFLICT (shop_id)
      DO UPDATE SET current_token = token_queues.current_token + 1,
                    total_tokens_today = token_queues.total_tokens_today + 1,
                    last_updated = NOW()
      RETURNING current_token, total_tokens_today
    `, [shopId]);

    const newToken = result.rows[0].current_token;

    // Mark the visitor with this token as 'serving'
    await query(`UPDATE token_queue_visitors SET status = 'serving'
       WHERE shop_id = $1 AND token_number = $2 AND DATE(created_at) = CURRENT_DATE`,
      [shopId, newToken]
    ).catch(() => {});

    // Mark previous token as 'completed'
    if (newToken > 1) {
      await query(`UPDATE token_queue_visitors SET status = 'completed'
         WHERE shop_id = $1 AND token_number = $2 AND DATE(created_at) = CURRENT_DATE`,
        [shopId, newToken - 1]
      ).catch(() => {});
    }

    // Emit via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`shop_${shopId}`).emit('queue_updated', {
        currentToken: newToken,
        totalTokensToday: result.rows[0].total_tokens_today,
      });
    }

    res.json({ success: true, currentToken: newToken });
  } catch (error) {
    next(error);
  }
});

// â”€â”€ POST /api/v1/token-queue/:shopId/join — Visitor joins the queue â”€â”€
router.post('/:shopId/join', authenticate, async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const { visitorName, visitorPhone, serviceType } = req.body;
    // The visitor is the signed-in caller. This read `userId` from the body, so anyone could take
    // a place in the queue in someone else's name.
    const userId = req.user.id;

    // One waiting place per person per day: joining twice returns the first token.
    const existing = await query(
      `SELECT token_number FROM token_queue_visitors
        WHERE shop_id = $1 AND user_id = $2 AND status = 'waiting' AND DATE(created_at) = CURRENT_DATE
        ORDER BY token_number ASC LIMIT 1`,
      [shopId, userId]
    );
    const already = (existing.rows || existing || [])[0];
    if (already) {
      const qs = await query('SELECT current_token, avg_service_minutes FROM token_queues WHERE shop_id = $1', [shopId]);
      const q = (qs.rows || qs || [])[0] || {};
      const ahead = Math.max(0, already.token_number - (q.current_token || 0) - 1);
      return res.status(200).json({ success: true, tokenNumber: already.token_number, peopleAhead: ahead, estimatedWaitMinutes: ahead * (q.avg_service_minutes || 10), alreadyJoined: true });
    }

    // Get next available token number for today
    const lastToken = await query(`SELECT COALESCE(MAX(token_number), 0) as last_token FROM token_queue_visitors
       WHERE shop_id = $1 AND DATE(created_at) = CURRENT_DATE`,
      [shopId]
    );
    const myToken = (lastToken.rows?.[0]?.last_token || 0) + 1;

    await query(`INSERT INTO token_queue_visitors (shop_id, token_number, visitor_name, visitor_phone, user_id, service_type, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'waiting', NOW())`,
      [shopId, myToken, visitorName || 'Walk-in', visitorPhone || null, userId, serviceType || null]
    );

    // Get current queue state for estimated wait
    const queueState = await query(`SELECT current_token, avg_service_minutes FROM token_queues WHERE shop_id = $1`,
      [shopId]
    );
    const currentToken = queueState.rows?.[0]?.current_token || 0;
    const avgMinutes = queueState.rows?.[0]?.avg_service_minutes || 10;
    const peopleAhead = Math.max(0, myToken - currentToken - 1);
    const estimatedWait = peopleAhead * avgMinutes;

    // Emit to merchant
    const io = req.app.get('io');
    if (io) {
      io.to(`shop_${shopId}`).emit('queue_visitor_joined', {
        newVisitorToken: myToken,
        visitorName,
      });
    }

    res.status(201).json({
      success: true,
      tokenNumber: myToken,
      peopleAhead,
      estimatedWaitMinutes: estimatedWait,
    });
  } catch (error) {
    next(error);
  }
});

// â”€â”€ PUT /api/v1/token-queue/:shopId/pause — Pause/unpause the queue â”€â”€
router.put('/:shopId/pause', authenticate, requireShopParam(), async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const { isPaused } = req.body;

    await query(`UPDATE token_queues SET is_paused = $1, last_updated = NOW() WHERE shop_id = $2`,
      [isPaused, shopId]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`shop_${shopId}`).emit('queue_updated', { isPaused });
    }

    res.json({ success: true, isPaused });
  } catch (error) {
    next(error);
  }
});

// â”€â”€ POST /api/v1/token-queue/:shopId/reset — Reset queue for the day â”€â”€
router.post('/:shopId/reset', authenticate, requireShopParam(), async (req, res, next) => {
  try {
    const { shopId } = req.params;

    await query(`UPDATE token_queues SET current_token = 0, total_tokens_today = 0, is_paused = false, last_updated = NOW()
       WHERE shop_id = $1`,
      [shopId]
    );

    // Mark all today's visitors as completed
    await query(`UPDATE token_queue_visitors SET status = 'completed'
       WHERE shop_id = $1 AND DATE(created_at) = CURRENT_DATE AND status = 'waiting'`,
      [shopId]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`shop_${shopId}`).emit('queue_updated', {
        currentToken: 0,
        totalTokensToday: 0,
        isPaused: false,
      });
    }

    res.json({ success: true, message: 'Queue reset for today' });
  } catch (error) {
    next(error);
  }
});

// â”€â”€ GET /api/v1/token-queue/:shopId/visitors — Get today's visitor list â”€â”€
router.get('/:shopId/visitors', authenticate, requireShopParam(), async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const { status } = req.query;

    let sql = `SELECT * FROM token_queue_visitors
               WHERE shop_id = $1 AND DATE(created_at) = CURRENT_DATE`;
    const params = [shopId];

    if (status) {
      sql += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    sql += ` ORDER BY token_number ASC`;
    const result = await query(sql, params);

    res.json({ visitors: result.rows || [] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
