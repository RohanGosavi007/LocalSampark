const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

// POST create dispute
router.post('/', authenticate, async (req, res, next) => {
    try {
        const { order_id, type, description } = req.body;
        if (!order_id || !type) {
            return res.status(400).json({ error: 'order_id and type are required' });
        }
        const id = 'DSP-' + Math.floor(Math.random() * 100000);
        
        // Ensure the order exists
        const orderData = await query('SELECT * FROM orders WHERE id = $1', [order_id]);
        const orders = orderData.rows || orderData;
        
        if (!orders || orders.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        const shop_id = orders[0].shop_id;
        
        await query(`
            INSERT INTO disputes (id, user_id, order_id, shop_id, type, description, status) 
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [id, req.user.id, order_id, shop_id, type, description || '', 'open']);
        
        res.status(201).json({ success: true, id, message: 'Dispute raised successfully' });
    } catch (err) {
        next(err);
    }
});

// GET user's disputes
router.get('/my', authenticate, async (req, res, next) => {
    try {
        const disputes = await query('SELECT * FROM disputes WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(disputes.rows || disputes);
    } catch (err) {
        next(err);
    }
});

// GET all disputes (Admin)
router.get('/admin', authenticate, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
        }
        const disputes = await query(`
            SELECT d.*, u.name as user_name, s.name as shop_name, o.total_amount
            FROM disputes d
            LEFT JOIN users u ON d.user_id = u.id
            LEFT JOIN shops s ON d.shop_id = s.id
            LEFT JOIN orders o ON d.order_id = o.id
            ORDER BY d.created_at DESC
        `);
        res.json(disputes.rows || disputes);
    } catch (err) {
        next(err);
    }
});

// PUT resolve dispute (Admin)
router.put('/:id/resolve', authenticate, async (req, res, next) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
        }
        const { resolution } = req.body;
        await query('UPDATE disputes SET status = $1, resolution = $2, resolved_at = NOW() WHERE id = $3', ['resolved', resolution || '', req.params.id]);
        res.json({ success: true, message: 'Dispute resolved successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
