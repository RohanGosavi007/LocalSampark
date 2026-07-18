const { queryOne } = require('../config/database');

/**
 * Middleware: Verify that the authenticated user owns the shop they're trying to access.
 * Used on all /my-shop/* routes to prevent cross-shop data access.
 */
const requireShopOwner = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Allow admin/super_admin to bypass ownership check
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      // If admin passes shopId query param, use that; otherwise find first shop
      const shopId = req.query.shopId || req.params.shopId;
      if (shopId) {
        const shop = await queryOne('SELECT * FROM local_shops WHERE id = $1', [shopId]);
        if (!shop) return res.status(404).json({ error: 'Shop not found' });
        req.shop = shop;
      }
      return next();
    }

    // For shop owners, find their shop
    const shop = await queryOne(
      'SELECT * FROM local_shops WHERE owner_id = $1 AND is_verified = 1',
      [req.user.id]
    );

    if (!shop) {
      return res.status(403).json({ 
        error: 'Shop owner access required. You either don\'t own a shop or your shop is not verified yet.' 
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
