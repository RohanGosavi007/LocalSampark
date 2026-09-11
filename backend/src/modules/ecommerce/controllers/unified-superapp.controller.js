const crypto = require('crypto');
// ═══════════════════════════════════════════════════════════════════════
// Unified Super-App API Controller — Powered by Prisma ORM
// ═══════════════════════════════════════════════════════════════════════
// Handles /api/shops/:id, /api/checkout, /api/book for Web & Android
// Serves identical payloads dynamically driven by ShopCategoryType
// ═══════════════════════════════════════════════════════════════════════

// This controller no longer uses Prisma. Its three live handlers — checkout,
// booking and order status — ran against the Prisma models `shops`, `products`,
// `service_slots`, `appointments`, `delivery_routes` and `audit_logs`, of which
// only one exists in the migrations and that one under different column names.
// They now use local_shops, shop_products, orders, order_items, shop_services
// and shop_appointments, the same tables the merchant, rider and customer
// screens read.
const { query, queryOne, queryMany } = require('../../../config/database');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret'
});

/**
 * GET /api/shops/:id — shadowed, and now retired.
 *
 * routes/index.js mounts /shops (shop.routes.js, which declares its own
 * GET /:id) before it mounts this router, so Express has always resolved
 * /shops/:id there and this handler never ran.
 *
 * Its implementation read prisma.shop, prisma.product and prisma.serviceSlot —
 * `shops`, `products` and `service_slots`, none of which the migrations create.
 * Had the mount order ever changed it would have started failing rather than
 * start working, so it is replaced with an explicit refusal rather than left as
 * a plausible-looking alternative implementation. Its route registration in
 * unified-superapp.routes.js is commented out to match.
 *
 * The live shop payload is shop.routes.js GET /:id.
 */
async function getShopById(req, res) {
  return res.status(410).json({
    success: false,
    error: 'This endpoint has been retired. Use GET /api/v1/shops/:id.',
  });
}

/**
 * The customer checkout.
 *
 * This ran entirely on Prisma: `prisma.shop` (`shops`), `prisma.product`
 * (`products`), `prisma.order` with paise columns, a nested
 * `deliveryRoute.create` (`delivery_routes`) and `prisma.auditLog`
 * (`audit_logs`). Of those, only `orders` exists in the migrations, and even
 * there the column names differ — the schema has total_amount in rupees, not
 * totalAmountPaise.
 *
 * The mobile app POSTs here (app/modules/checkout/index.js -> /checkout), so
 * this is the live customer checkout, and it could not have completed an order
 * against a database built from the migrations.
 *
 * It now uses local_shops, shop_products, orders and order_items — the same
 * tables the merchant queue, the delivery flow and the customer's own order
 * history read. Stock moves through inventory_count, which is what the cart
 * checks and what shop_products records.
 */
async function processCheckout(req, res, next) {
  try {
    const { shopId, items, deliveryAddress, deliveryCoordinate, paymentMethod = 'cod', specialInstructions } = req.body;

    if (!shopId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'shopId and items array are required' });
    }

    // The order is placed for the authenticated caller, full stop.
    //
    // This used to prefer req.body.userId and, failing that, fall back to
    // "whichever CUSTOMER row comes back first". On a route with no auth
    // middleware, that meant an anonymous request could place an order against
    // any user id it named — and one that named nobody landed on an arbitrary
    // real customer.
    const targetUserId = req.user?.id;
    if (!targetUserId) {
      return res.status(401).json({ success: false, error: 'Authentication required to place an order.' });
    }

    const shop = await queryOne('SELECT * FROM local_shops WHERE id = $1', [shopId]);
    if (!shop) {
      return res.status(404).json({ success: false, error: 'Shop not found' });
    }

    // Price and stock are read from the database, never from the request.
    let subtotal = 0;
    const lines = [];

    for (const item of items) {
      const quantity = parseInt(item.quantity, 10);
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ success: false, error: 'Each item needs a quantity of at least 1' });
      }

      const product = await queryOne(
        'SELECT * FROM shop_products WHERE id = $1 AND shop_id = $2',
        [item.productId, shopId]
      );
      if (!product) {
        return res.status(400).json({ success: false, error: `Invalid product ID: ${item.productId}` });
      }

      const tracked = Number(product.track_inventory) === 1;
      const onHand = Number(product.inventory_count ?? 0);
      if (tracked && onHand < quantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for ${product.name}. Available: ${onHand}`,
        });
      }

      const price = Number(product.price) || 0;
      subtotal += price * quantity;
      lines.push({ id: product.id, name: product.name, price, quantity, tracked });
    }

    const deliveryFee = shop.delivery_available === 1 || shop.delivery_available === true ? 30 : 0;
    const platformFee = 5;
    const totalAmount = subtotal + deliveryFee + platformFee;

    const orderId = crypto.randomUUID();
    // The handover code the rider must produce to complete the delivery. It was
    // never generated on this path, so an order placed through it could not be
    // completed by a rider at all.
    const otpCode = String(crypto.randomInt(1000, 10000));

    await query(
      `INSERT INTO orders
         (id, user_id, shop_id, total_amount, delivery_fee, platform_fee, payment_method,
          payment_status, order_status, delivery_address, delivery_coordinate, otp_code,
          fulfillment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11, 'delivery')`,
      [
        orderId,
        targetUserId,
        shopId,
        totalAmount,
        deliveryFee,
        platformFee,
        paymentMethod,
        String(paymentMethod).toLowerCase() === 'cod' ? 'pending' : 'paid',
        deliveryAddress || '',
        deliveryCoordinate || '',
        otpCode,
      ]
    );

    for (const line of lines) {
      await query(
        'INSERT INTO order_items (id, order_id, product_id, name, price, quantity) VALUES ($1, $2, $3, $4, $5, $6)',
        [crypto.randomUUID(), orderId, line.id, line.name, line.price, line.quantity]
      );
      if (line.tracked) {
        await query(
          'UPDATE shop_products SET inventory_count = inventory_count - $1, stock_quantity = stock_quantity - $1 WHERE id = $2',
          [line.quantity, line.id]
        );
      }
    }

    if (specialInstructions) {
      // orders.special_instructions is added by migration 093 — the column did
      // not exist before, so a customer's note ("leave at the gate") was taken
      // by the form and discarded.
      await query('UPDATE orders SET special_instructions = $1 WHERE id = $2', [specialInstructions, orderId]);
    }

    const newOrder = await queryOne('SELECT * FROM orders WHERE id = $1', [orderId]);
    const orderItems = await queryMany('SELECT * FROM order_items WHERE order_id = $1', [orderId]);

    const io = req.app?.get ? req.app.get('io') : null;
    if (io) {
      io.emit(`vendor:orders:${shopId}`, { event: 'ORDER_CREATED', order: newOrder });
    }

    let paymentData = null;
    if (String(paymentMethod).toLowerCase() === 'razorpay') {
      // No mock order id on failure: the old fallback returned
      // `mock_rzp_<timestamp>`, which the client would then try to pay against.
      paymentData = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100),
        currency: 'INR',
        receipt: `receipt_order_${orderId}`,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Checkout successful',
      order: { ...newOrder, items: orderItems },
      paymentData,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/book
 * Unified Appointment Booking Endpoint
 * Enforces Appointment State Machine: REQUESTED -> CONFIRMED -> IN_PROGRESS -> COMPLETED
 */
/**
 * The customer's appointment booking.
 *
 * This ran on prisma.serviceSlot (`service_slots`), prisma.appointment
 * (`appointments`) and prisma.auditLog (`audit_logs`) — none of which any
 * migration creates. Bookings live in `shop_appointments` and the bookable
 * services in `shop_services`, which is what the merchant's appointment book,
 * the reception desk and the salon manager all read.
 *
 * Capacity was tracked on the slot row (currentBookings / maxCapacity).
 * shop_services has no such counter, so a double-booking is prevented the way
 * the rest of the app does it: by checking existing appointments for that
 * service and time.
 */
async function processBooking(req, res, next) {
  try {
    const { shopId, serviceId, appointmentDate, timeSlot, customerNotes, paymentMethod = 'cod' } = req.body;

    if (!shopId || !serviceId || !appointmentDate || !timeSlot) {
      return res.status(400).json({
        success: false,
        error: 'shopId, serviceId, appointmentDate and timeSlot are required',
      });
    }

    // Same reasoning as processCheckout: the booking belongs to the caller.
    // `userId || (first CUSTOMER in the table)` meant the web booking flow —
    // which sends neither an auth header nor a userId — attributed every
    // appointment to one arbitrary customer.
    const targetUserId = req.user?.id;
    if (!targetUserId) {
      return res.status(401).json({ success: false, error: 'Authentication required to book an appointment.' });
    }

    const service = await queryOne(
      'SELECT * FROM shop_services WHERE id = $1 AND shop_id = $2',
      [serviceId, shopId]
    );
    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }
    if (service.is_available === 0 || service.is_available === false) {
      return res.status(400).json({ success: false, error: 'That service is not currently bookable' });
    }

    // One appointment per service per slot. Checked immediately before the
    // insert; a unique index on (shop_id, service_id, appointment_date,
    // time_slot) would close the remaining race and is worth adding when the
    // booking volume justifies it.
    const clash = await queryOne(
      `SELECT id FROM shop_appointments
        WHERE shop_id = $1 AND service_id = $2
          AND date(appointment_date) = date($3) AND time_slot = $4
          AND LOWER(status) NOT IN ('cancelled', 'no_show')`,
      [shopId, serviceId, appointmentDate, timeSlot]
    );
    if (clash) {
      return res.status(400).json({ success: false, error: 'Selected time slot is already booked' });
    }

    const appointmentId = crypto.randomUUID();
    const price = Number(service.price) || 0;

    await query(
      `INSERT INTO shop_appointments
         (id, shop_id, user_id, service_id, appointment_date, time_slot, status,
          payment_method, payment_status, customer_notes, service_price)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10)`,
      [
        appointmentId,
        shopId,
        targetUserId,
        serviceId,
        appointmentDate,
        timeSlot,
        paymentMethod,
        String(paymentMethod).toLowerCase() === 'cod' ? 'pending' : 'paid',
        customerNotes || null,
        price,
      ]
    );

    const appointment = await queryOne('SELECT * FROM shop_appointments WHERE id = $1', [appointmentId]);

    const io = req.app?.get ? req.app.get('io') : null;
    if (io) {
      io.emit(`vendor:appointments:${shopId}`, { event: 'APPOINTMENT_REQUESTED', appointment });
    }

    return res.status(201).json({
      success: true,
      message: 'Appointment requested successfully',
      appointment: {
        id: appointment.id,
        status: appointment.status,
        serviceName: service.name,
        scheduledDate: appointment.appointment_date,
        scheduledTime: appointment.time_slot,
        priceFormatted: `₹${price.toFixed(2)}`,
        createdAt: appointment.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/orders/:id/status
 * Vendor/Admin State Machine Transition for Orders
 * State Flow: PENDING -> ACCEPTED -> PREPARING -> OUT_FOR_DELIVERY -> DELIVERED
 */
/**
 * Vendor / rider / customer order state transitions.
 *
 * This used prisma.order (paise columns, camelCase timestamps),
 * prisma.deliveryRoute (`delivery_routes`, no such table) and prisma.auditLog
 * (`audit_logs`, no such table). The authorisation logic below was correct and
 * is kept; only the storage moves onto `orders`, where the rider is
 * assigned_agent_id rather than a separate route row.
 *
 * The status vocabulary is the one stored in orders.order_status (lowercase),
 * not the uppercase Prisma enum. The uppercase names are still accepted from
 * clients so the existing callers keep working.
 */
async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, cancellationReason } = req.body;

    const VALID = ['pending', 'confirmed', 'preparing', 'ready', 'assigned', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'];
    // ACCEPTED is the old name for what the orders table calls confirmed.
    const requested = String(status || '').toLowerCase() === 'accepted'
      ? 'confirmed'
      : String(status || '').toLowerCase();

    if (!VALID.includes(requested)) {
      return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${VALID.join(', ')}` });
    }

    const order = await queryOne(
      `SELECT o.*, s.owner_id AS shop_owner_id
         FROM orders o
         LEFT JOIN local_shops s ON s.id = o.shop_id
        WHERE o.id = $1`,
      [id]
    );

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // ── Who may move this order, and where to ───────────────────────────
    //
    // authenticate() proves who is calling; it does not say they have any
    // business touching this order. Without the check below any signed-in user
    // could set any order to delivered — which also writes payment_status =
    // 'paid' a few lines down, so it is a way to mark an order paid without
    // paying.
    //
    // Roles, narrowest first:
    //   customer  — may cancel their own order, and only before it ships
    //   runner    — the assigned rider, may only move it through delivery
    //   vendor    — the shop owner, full control of their own orders
    //   admin     — full control
    const actorId = req.user?.id;
    const ADMIN_ROLES = new Set(['admin', 'super_admin', 'territory_admin', 'moderator']);
    const isAdmin = ADMIN_ROLES.has(String(req.user?.role || '').toLowerCase());
    const isVendor = order.shop_owner_id && String(order.shop_owner_id) === String(actorId);
    const isRunner = order.assigned_agent_id && String(order.assigned_agent_id) === String(actorId);
    const isCustomer = String(order.user_id) === String(actorId);

    const currentStatus = String(order.order_status || 'pending').toLowerCase();
    const RUNNER_STATUSES = new Set(['out_for_delivery', 'delivered']);
    const CUSTOMER_STATUSES = new Set(['cancelled']);
    const CUSTOMER_CANCELLABLE_FROM = new Set(['pending', 'confirmed']);

    let permitted = false;
    if (isAdmin || isVendor) {
      permitted = true;
    } else if (isRunner && RUNNER_STATUSES.has(requested)) {
      permitted = true;
    } else if (isCustomer && CUSTOMER_STATUSES.has(requested) && CUSTOMER_CANCELLABLE_FROM.has(currentStatus)) {
      permitted = true;
    }

    if (!permitted) {
      // Deliberately does not distinguish "not yours" from "not allowed from
      // here" — that difference tells an unrelated caller whether an order id
      // exists and what state it is in.
      return res.status(403).json({
        success: false,
        error: 'You are not allowed to change this order to that status.',
      });
    }

    const sets = ['order_status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [requested];

    if (requested === 'delivered') {
      sets.push('delivered_at = CURRENT_TIMESTAMP');
      params.push('paid');
      sets.push(`payment_status = $${params.length}`);
    }
    if (requested === 'cancelled' && cancellationReason) {
      params.push(cancellationReason);
      sets.push(`special_instructions = $${params.length}`);
    }

    params.push(id);
    await query(`UPDATE orders SET ${sets.join(', ')} WHERE id = $${params.length}`, params);

    const updatedOrder = await queryOne('SELECT * FROM orders WHERE id = $1', [id]);

    const io = req.app?.get ? req.app.get('io') : null;
    if (io) {
      io.emit(`order:${id}:status`, { orderId: id, oldStatus: currentStatus, newStatus: requested });
    }

    return res.json({ success: true, message: `Order status updated to ${requested}`, order: updatedOrder });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getShopById,
  processCheckout,
  processBooking,
  updateOrderStatus,
};
