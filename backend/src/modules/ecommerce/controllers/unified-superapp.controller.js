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
const { query, queryOne, queryMany, withTransaction } = require('../../../config/database');
const razorpay = require('../../../services/razorpay.service');
const payments = require('../../../services/payments.service');
const orders = require('../../../services/orderPlacement.service');
const lifecycle = require('../../../services/orderLifecycle.service');


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

/** Sends the response for an error from order placement. */
function sendOrderError(res, error, next) {
  if (error instanceof orders.OrderError) {
    return res.status(error.status).json({ success: false, code: error.code, error: error.message, ...error.details });
  }
  return next(error);
}

/** The bill as clients read it. */
function presentBill(bill) {
  return {
    subtotal: bill.subtotal,
    deliveryFee: bill.deliveryFee,
    smallOrderFee: bill.smallOrderFee,
    platformFee: bill.platformFee,
    total: bill.total,
    distanceKm: bill.distanceKm,
    surgeMultiplier: bill.surgeMultiplier,
    freeDelivery: bill.freeDelivery,
    etaMinutes: bill.etaMinutes,
    deliveryBreakdown: bill.deliveryBreakdown,
  };
}

/**
 * POST /checkout/quote — what this cart will cost, without ordering it.
 *
 * Every client was working the total out for itself, and no two agreed: the
 * web cart added a "distance fee", a permanent "high demand surge" and a
 * "small order fee"; the shop page added ₹40; the mobile app ₹40 and ₹5. The
 * server charged none of those. Clients now show this — the same calculation
 * the order itself is charged by (services/orderPlacement.service.js), with
 * the delivery charge worked out from the distance to the customer.
 *
 * For a delivery the request carries the customer's location
 * (deliveryCoordinate: { lat, lng }) or a saved addressId; without one the
 * answer is 400 LOCATION_REQUIRED, and the client asks for it.
 */
async function quoteCheckout(req, res, next) {
  try {
    const body = req.body || {};
    const quote = await orders.quoteOrder({
      user: req.user || null,
      shopId: body.shopId ?? body.shop_id,
      items: body.items,
      body,
    });

    res.json({
      success: true,
      bill: presentBill(quote.bill),
      items: quote.lines.map(({ productId, name, price, quantity }) => ({ id: productId, name, price, quantity })),
      // The wallet only while it is switched on (Decision D10: off at launch).
      paymentMethods: { cod: quote.bill.cod.available, wallet: require('../../../services/refundPayouts.service').walletEnabled(), razorpay: razorpay.isConfigured() },
      // C8: ASAP, or one of these windows (services/deliverySlots.service.js).
      slots: quote.slots,
      cod: quote.bill.cod,
    });
  } catch (error) {
    sendOrderError(res, error, next);
  }
}

/**
 * POST /checkout — the customer checkout.
 *
 * Both spellings of the request are read. The web client sends camelCase; the
 * mobile checkout sends shop_id, product_id and payment_method. Reading only
 * the first meant every mobile checkout was answered 400 — and the app, on any
 * failure, showed "Payment Successful" from a canned response.
 *
 * The order is placed for the authenticated caller, full stop: this used to
 * prefer req.body.userId and, failing that, "whichever CUSTOMER row comes back
 * first", on a route with no auth middleware.
 */
async function processCheckout(req, res, next) {
  try {
    const body = req.body || {};
    const method = payments.paymentMethod(body.paymentMethod ?? body.payment_method);
    if (!method) {
      return res.status(400).json({ success: false, error: 'paymentMethod must be cod, razorpay or wallet' });
    }

    const placed = await orders.placeOrder({
      user: req.user,
      shopId: body.shopId ?? body.shop_id,
      items: body.items,
      body,
      method,
    });

    const io = req.app?.get ? req.app.get('io') : null;
    if (io) {
      io.emit(`vendor:orders:${placed.shop.id}`, { event: 'ORDER_CREATED', order: placed.order });
    }
    require('../../../services/orderEvents.service').orderPlaced({ order: placed.order, shop: placed.shop, user: req.user });

    return res.status(201).json({
      success: true,
      message: method === 'razorpay' ? 'Order placed; payment pending' : 'Checkout successful',
      order: { ...placed.order, items: placed.items },
      // What the order came to, itemised. Clients were adding their own
      // delivery and handling fees and showing a total the server never used.
      bill: presentBill(placed.bill),
      paymentData: placed.paymentData,
      ...(placed.paymentError ? { paymentError: placed.paymentError } : {}),
    });
  } catch (error) {
    sendOrderError(res, error, next);
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
 * The rules are in services/orderLifecycle.service.js. This endpoint had its
 * own: any status from any status, and "delivered" also wrote payment_status
 * = 'paid' — so a shop could have an order that was never paid for recorded
 * as paid, and a rider could close a delivery without the customer's code.
 */
async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, cancellationReason } = req.body;

    let outcome;
    try {
      outcome = await lifecycle.changeStatus({ orderId: id, to: status, user: req.user, reason: cancellationReason });
    } catch (error) {
      if (error instanceof lifecycle.LifecycleError) {
        return res.status(error.status).json({ success: false, code: error.code, error: error.message });
      }
      throw error;
    }

    const io = req.app?.get ? req.app.get('io') : null;
    if (io && !outcome.unchanged) {
      io.emit(`order:${id}:status`, { orderId: id, oldStatus: outcome.from, newStatus: outcome.to });
      io.to(`order_${id}`).to(`order:${id}`).emit('order_status_update', { orderId: id, status: outcome.to.toUpperCase() });
    }

    return res.json({
      success: true,
      message: `Order status updated to ${outcome.to}`,
      order: outcome.order,
      refund: outcome.refund,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getShopById,
  processCheckout,
  quoteCheckout,
  processBooking,
  updateOrderStatus,
};
