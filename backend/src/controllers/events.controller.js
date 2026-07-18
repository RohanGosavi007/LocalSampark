const { query, queryOne } = require('../config/database');

/**
 * Get all active events
 */
const getEvents = async (req, res, next) => {
  try {
    const events = await query(`
      SELECT e.*, u.full_name as organizer_name 
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.status = 'active'
      ORDER BY e.event_date ASC
    `);
    res.json({ success: true, data: events.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * Get My Events (Hosted and Booked)
 */
const getMyEvents = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const hosted = await query(`SELECT * FROM events WHERE organizer_id = $1 ORDER BY event_date ASC`, [userId]);
    const booked = await query(`
      SELECT t.*, e.title as event_title, e.event_date, e.location 
      FROM event_tickets t 
      JOIN events e ON t.event_id = e.id 
      WHERE t.user_id = $1 
      ORDER BY t.created_at DESC
    `, [userId]);
    
    res.json({ success: true, data: { hosted: hosted.rows, booked: booked.rows } });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending events (Admin Only)
 */
const getPendingEvents = async (req, res, next) => {
  try {
    const events = await query(`
      SELECT e.*, u.full_name as organizer_name 
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.status = 'pending'
      ORDER BY e.created_at ASC
    `);
    res.json({ success: true, data: events.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * Create an event
 * Logic: Admins & Verified Shops get instant 'active' status. Standard Residents get 'pending'.
 */
const createEvent = async (req, res, next) => {
  try {
    const { title, description, eventDate, location, ticketPrice, totalTickets, allowCoinDiscount } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    let status = 'pending';
    if (['admin', 'superadmin', 'territory_admin', 'shop_owner'].includes(userRole)) {
      status = 'active';
    }

    const newEvent = await query(
      `INSERT INTO events (organizer_id, title, description, event_date, location, ticket_price, total_tickets, available_tickets, allow_coin_discount, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [userId, title, description, eventDate, location, ticketPrice, totalTickets, totalTickets, allowCoinDiscount, status]
    );

    res.status(201).json({
      success: true,
      message: status === 'active' ? 'Event published successfully.' : 'Event submitted for admin approval.',
      data: newEvent.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve an event (Admin Only)
 */
const approveEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await query(`UPDATE events SET status = 'active' WHERE id = $1 RETURNING *`, [id]);
    if (updated.rowCount === 0) return res.status(404).json({ error: 'Event not found.' });
    
    res.json({ success: true, message: 'Event approved and published.', data: updated.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject and Delete a pending event (Admin Only)
 */
const rejectEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM events WHERE id = $1 AND status = 'pending'`, [id]);
    res.json({ success: true, message: 'Event rejected and deleted.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Book a ticket
 * Supports applying SamparkCoins for a discount (100 coins = ₹10) if the event allows it.
 */
const bookTicket = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { applyDiscount, numTickets } = req.body;
    const userId = req.user.id;
    const qty = numTickets || 1;

    // 1. Fetch event
    const event = await queryOne(`SELECT * FROM events WHERE id = $1 AND status = 'active'`, [eventId]);
    if (!event) return res.status(404).json({ error: 'Event not found or not active.' });

    if (event.available_tickets < qty) {
      return res.status(400).json({ error: 'Not enough tickets available.' });
    }

    let finalPrice = event.ticket_price * qty;
    let coinsDeducted = 0;
    let discountAmount = 0;

    // 2. Handle Gamification Discount
    if (applyDiscount && event.allow_coin_discount) {
      // 100 coins = Rs 10 discount.
      // Let's assume max discount is the total ticket price itself or a flat rate. 
      // For simplicity, we apply a flat 100 coins = Rs 10 discount per ticket.
      const requestedCoins = 100 * qty; 
      
      const wallet = await queryOne(`SELECT total_coins FROM loyalty_wallets WHERE user_id = $1`, [userId]);
      if (wallet && wallet.total_coins >= requestedCoins) {
        // Apply discount
        coinsDeducted = requestedCoins;
        discountAmount = 10 * qty;
        finalPrice = Math.max(0, finalPrice - discountAmount);

        // Deduct from wallet
        await query(`UPDATE loyalty_wallets SET total_coins = total_coins - $1 WHERE user_id = $2`, [coinsDeducted, userId]);
        await query(
          `INSERT INTO loyalty_transactions (user_id, amount, type, source) VALUES ($1, $2, 'spent', 'Event Ticket Discount')`,
          [userId, coinsDeducted]
        );
      }
    }

    // 3. Update Available Tickets
    await query(`UPDATE events SET available_tickets = available_tickets - $1 WHERE id = $2`, [qty, eventId]);

    // 4. Create Booking Record
    const bookingRef = 'TKT-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const qrCodeFake = 'QR_' + bookingRef;

    await query(
      `INSERT INTO event_tickets (id, event_id, user_id, ticket_count, total_price, qr_code) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [bookingRef, eventId, userId, qty, finalPrice, qrCodeFake]
    );

    res.json({
      success: true,
      message: 'Ticket booked successfully!',
      data: {
        bookingRef,
        finalPricePaid: finalPrice,
        discountApplied: discountAmount,
        coinsDeducted
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEvents,
  getMyEvents,
  getPendingEvents,
  createEvent,
  approveEvent,
  rejectEvent,
  bookTicket
};
