const { queryOne } = require('../config/database');

/**
 * Middleware: verify that the authenticated user owns the shop they are trying
 * to access. Used on all /my-shop/* routes to prevent cross-shop data access.
 *
 * This resolved `req.shop` from the Prisma `shops` table while every other
 * middleware in this file — and nearly every handler downstream — works against
 * `local_shops`. Those are separate id spaces, so `req.shop.id` did not identify
 * a row in any table the handlers then queried: of the 37 handlers that read
 * `req.shop`, 34 query raw-SQL tables whose shop_id references local_shops
 * (shop_staff, shop_products, shop_orders, shop_appointments, shop_reviews,
 * shop_services, job_cards, kds_tickets, restaurant_tables, universal_orders,
 * universal_leads, shop_owner_payouts, service_quotations). Every one of them
 * silently matched nothing.
 *
 * It now resolves from local_shops, which is the stack the storefront, cart,
 * checkout, analytics and seeds all use, matching requireOrderAccess and
 * requireAppointmentAccess below.
 */
const requireShopOwner = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';

    if (isAdmin) {
      const shopId = req.query.shopId || req.params.shopId;
      if (shopId) {
        const shop = await queryOne('SELECT * FROM local_shops WHERE id = $1', [shopId]);
        if (!shop) return res.status(404).json({ error: 'Shop not found' });
        req.shop = shop;
        return next();
      }

      // The admin branch used to fall through to next() with req.shop unset
      // whenever no shopId was supplied, so every downstream handler then read
      // `req.shop.id` off undefined and the request died as a 500 rather than a
      // usable error.
      return res.status(400).json({
        error: 'shopId is required when acting as an admin on a shop-scoped route.',
      });
    }

    const shop = await queryOne(
      'SELECT * FROM local_shops WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1',
      [req.user.id]
    );

    if (!shop) {
      return res.status(403).json({
        error: 'Shop owner access required. You either don\'t own a shop or your shop is not verified yet.',
      });
    }

    // Verification is checked after ownership so an owner whose shop is pending
    // gets told that, rather than being told they own no shop.
    const verified = shop.is_verified === 1 || shop.is_verified === true;
    if (!verified) {
      return res.status(403).json({
        error: 'Your shop is not verified yet. You will get access once it is approved.',
      });
    }

    req.shop = shop;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Verify shop owner OR the customer who placed the order.
 * Used on order detail/tracking routes.
 */
const requireOrderAccess = async (req, res, next) => {
  try {
    const orderId = req.params.orderId || req.params.id;
    if (!orderId) return res.status(400).json({ error: 'Order ID required' });

    const order = await queryOne('SELECT * FROM shop_orders WHERE id = $1', [orderId]);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const isOwner = await queryOne(
      'SELECT id FROM local_shops WHERE id = $1 AND owner_id = $2',
      [order.shop_id, req.user.id]
    );
    const isCustomer = order.user_id === req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin' || req.user.role === 'territory_admin';

    if (!isOwner && !isCustomer && !isAdmin) {
      return res.status(403).json({ error: 'You do not have access to this order' });
    }

    req.order = order;
    req.orderRole = isOwner ? 'shop_owner' : (isCustomer ? 'customer' : 'admin');
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Verify shop owner OR the customer who booked the appointment.
 */
const requireAppointmentAccess = async (req, res, next) => {
  try {
    const appointmentId = req.params.appointmentId || req.params.id;
    if (!appointmentId) return res.status(400).json({ error: 'Appointment ID required' });

    const appointment = await queryOne('SELECT * FROM shop_appointments WHERE id = $1', [appointmentId]);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    const isOwner = await queryOne(
      'SELECT id FROM local_shops WHERE id = $1 AND owner_id = $2',
      [appointment.shop_id, req.user.id]
    );
    const isCustomer = appointment.user_id === req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';

    if (!isOwner && !isCustomer && !isAdmin) {
      return res.status(403).json({ error: 'You do not have access to this appointment' });
    }

    req.appointment = appointment;
    req.appointmentRole = isOwner ? 'shop_owner' : (isCustomer ? 'customer' : 'admin');
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { requireShopOwner, requireOrderAccess, requireAppointmentAccess };
