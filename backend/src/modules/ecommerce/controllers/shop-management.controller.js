const crypto = require('crypto');
const { query, queryMany, queryOne } = require('../../../config/database');
const { cacheInvalidate } = require('../../../config/redis');
const notificationService = require('../../core/services/notification.service');
const emailService = require('../../core/services/email.service');
const { PrismaClient } = require('@prisma/client');
/**
 * 10x FIX: Use centralized Prisma singleton instead of creating a new instance.
 * Previously: `const prisma = new PrismaClient()` — each import created a separate
 * connection pool, wasting database connections.
 */
let prisma;
try {
  const { getPrismaClient } = require('../../../config/prisma');
  prisma = getPrismaClient();
} catch {
  prisma = new PrismaClient();
}

// ═══════════════════════════════════════════════════════════════════════
// SHOP MANAGEMENT CONTROLLER
// Central controller for all 18 management systems
// ═══════════════════════════════════════════════════════════════════════

// ─── MANAGEMENT ARCHETYPE MAPPING ────────────────────────────────────
const ARCHETYPE_MAP = {
  'grocery-supermarkets': 'retail', 'restaurants-cafes': 'restaurant',
  'pharmacy-healthcare': 'pharmacy', 'fresh-produce-meat': 'pharmacy',
  'dairy-sweets-bakery': 'retail', 'stationery-gifts-books': 'retail',
  'florists-nurseries': 'fresh_perishable', 'pet-care-supplies': 'retail',
  'pooja-samagri-religious': 'retail', 'eyewear-opticians': 'eyewear',
  'home-services-plumbers': 'home_visit', 'salon-beauty-spa': 'salon_wellness',
  'electricians-electronics': 'garage_repair', 'tutors-education': 'education',
  'hardware-sanitary': 'retail', 'clothing-fashion': 'retail',
  'gym-fitness': 'salon_wellness', 'real-estate-brokers': 'professional',
  'automotive-mechanic': 'garage_repair', 'dentists-orthodontists': 'healthcare',
  'pathology-labs': 'healthcare', 'physiotherapy': 'healthcare',
  'ayurvedic-homeopathic': 'healthcare', 'pest-control': 'home_visit',
  'deep-cleaning': 'home_visit', 'ac-appliance-repair': 'garage_repair',
  'ro-water-purifier': 'garage_repair', 'laundry-dry-cleaning': 'laundry',
  'tailoring-boutiques': 'tailoring', 'car-bike-wash': 'salon_wellness',
  'driving-schools': 'education', 'catering-party': 'event_creative',
  'event-planners-decorators': 'event_creative', 'photographers-videographers': 'event_creative',
  'cas-tax-consultants': 'professional', 'lawyers-advocates': 'professional',
  'insurance-agents': 'professional', 'yoga-wellness': 'salon_wellness',
  'dieticians-nutritionists': 'healthcare',
  'tiffin-meal-subscription': 'tiffin', 'mobile-computer-repair': 'garage_repair',
  'courier-parcel-services': 'print_counter', 'travel-agents-visa': 'professional',
  'printing-xerox-dtp': 'print_counter', 'locksmith-key-maker': 'home_visit',
  'packers-movers': 'home_visit', 'water-tanker-supply': 'subscription',
  'gas-cylinder-lpg': 'subscription', 'jewellery-gold': 'retail',
  'wedding-party-planner': 'event_creative', 'interior-design-decor': 'event_creative',
  'painting-renovation': 'home_visit', 'security-cctv': 'home_visit',
  'coaching-test-prep': 'education', 'astrologer-pandit': 'event_creative',
  'turf-grounds': 'event_creative'
};

function getArchetype(categorySlug) {
  return ARCHETYPE_MAP[categorySlug] || 'retail';
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 1: SHOP OWNER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════

async function getShopDashboard(req, res, next) {
  try {
    const shop = req.shop;
    const shopId = shop.id;

    // Get category info for archetype
    const category = await prisma.category.findUnique({ where: { id: shop.categoryId } });
    const archetype = getArchetype(category?.slug || '');

    // Common stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [ordersToday, ordersPending, revenueTotalAgg, appointmentsToday, appointmentsPending, productsCount, servicesCount] = await Promise.all([
      prisma.order.count({ where: { shopId, createdAt: { gte: todayStart } } }),
      prisma.order.count({ where: { shopId, status: { in: ['PENDING', 'ACCEPTED', 'PREPARING'] } } }),
      prisma.order.aggregate({ _sum: { totalAmountPaise: true }, where: { shopId, status: { not: 'CANCELLED' } } }),
      prisma.appointment.count({ where: { shopId, scheduledDate: todayStart } }),
      prisma.appointment.count({ where: { shopId, status: { in: ['REQUESTED', 'CONFIRMED'] } } }),
      prisma.product.count({ where: { shopId, isAvailable: true } }),
      prisma.serviceSlot.count({ where: { shopId, status: 'AVAILABLE' } })
    ]);

    const products = await prisma.product.findMany({ where: { shopId } });
    const serviceSlots = await prisma.serviceSlot.findMany({ where: { shopId } });

    shop.products = products;
    shop.serviceSlots = serviceSlots;

    // Calculate revenue (paise to rupees)
    const revenueTotal = (revenueTotalAgg._sum.totalAmountPaise || 0) / 100;
    const revenueToday = 0; // Stub for now, can be calculated similarly if needed

    // Stub missing tables
    const reviewsCount = 0;
    const avgRating = 0;
    const disputesOpen = 0;
    const staffCount = 0;

    // Recent orders (last 20)
    const recentOrders = await prisma.order.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { name: true, phone: true } } }
    });

    // Recent appointments (upcoming)
    const upcomingAppointments = await prisma.appointment.findMany({
      where: { shopId, status: { notIn: ['CANCELLED', 'COMPLETED', 'NO_SHOW'] } },
      orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
      take: 20,
      include: { user: { select: { name: true, phone: true } } }
    });

    res.json({
      success: true,
      shop: { ...shop, archetype, category },
      stats: {
        ordersToday,
        ordersPending,
        revenueToday,
        revenueTotal,
        appointmentsToday,
        appointmentsPending,
        reviewsCount,
        avgRating,
        disputesOpen,
        productsCount,
        servicesCount,
        staffCount,
      },
      recentOrders,
      upcomingAppointments,
    });
  } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 2: ORDER LIFECYCLE (Accept, Reject, Prepare, Dispatch, etc.)
// ═══════════════════════════════════════════════════════════════════════

async function updateOrderStatus(req, res, next) {
  try {
    const { orderId } = req.params;
    const { status, preparation_time_minutes, rejection_reason } = req.body;
    const shop = req.shop;

    const order = await queryOne('SELECT * FROM universal_orders WHERE id = $1 AND shop_id = $2', [orderId, shop.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Validate state transitions
    const validTransitions = {
      PENDING: ['ACCEPTED', 'CANCELLED'],
      ACCEPTED: ['PREPARING', 'CANCELLED'],
      PREPARING: ['READY_FOR_PICKUP', 'CANCELLED'],
      READY_FOR_PICKUP: ['OUT_FOR_DELIVERY', 'CANCELLED'],
      OUT_FOR_DELIVERY: ['DELIVERED'],
      DELIVERED: ['RETURN_REQUESTED'],
      RETURN_REQUESTED: ['RETURNED'],
      CANCELLED: []
    };
    const currentStatus = order.status.toUpperCase();
    const newStatus = status.toUpperCase();

    if (currentStatus !== newStatus && !validTransitions[currentStatus]?.includes(newStatus)) {
      return res.status(400).json({ error: `Invalid transition from ${currentStatus} to ${newStatus}` });
    }

    await query(`UPDATE universal_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newStatus, orderId]
    );

    const updated = await queryOne('SELECT * FROM universal_orders WHERE id = $1', [orderId]);
    const customer = await queryOne('SELECT * FROM users WHERE id = $1', [updated.user_id]);
    const shopInfo = shop;

    // Send notifications
    if (customer) {
      await notificationService.notifyOrderUpdate(customer.id, orderId, status, shopInfo?.name || 'Shop');
      if (customer.email) {
        if (['ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].includes(status)) {
          await emailService.sendOrderConfirmation(customer, updated, shopInfo);
        }
      }
    }

    // Emit real-time socket event
    notificationService.emitOrderStatus(orderId, status, { preparationTime: preparation_time_minutes });

    // Auto-create delivery job when dispatched
    if (status === 'OUT_FOR_DELIVERY' && updated.fulfillmentMethod === 'DELIVERY') {
      try {
        const deliveryController = require('./delivery.controller');
        // deliveryRoute is already created by checkout, so we just update the status via acceptJob/completeJob flows.
      } catch (err) {
        console.error('[ORDER] Auto-delivery creation failed:', err.message);
      }
    }

    res.json({ success: true, order: updated });
  } catch (error) { next(error); }
}

async function getShopOrders(req, res, next) {
  try {
    const shop = req.shop;
    let { status, page = 1, limit = 20, date } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Map Kanban lowercase status to uppercase DB status
    if (status) {
      status = status.toUpperCase();
      if (status === 'READY_FOR_PICKUP') status = 'READY_FOR_PICKUP';
      else if (status === 'DISPATCHED') status = 'OUT_FOR_DELIVERY'; // Map dispatched to out_for_delivery
    }

    let sql = 'SELECT uo.*, u.name as customer_name, u.phone as customer_phone FROM universal_orders uo JOIN users u ON uo.user_id = u.id WHERE uo.shop_id = ?';
    let countSql = 'SELECT COUNT(*) as count FROM universal_orders uo WHERE uo.shop_id = ?';
    const params = [shop.id];

    if (status) {
      sql += ' AND uo.status = ?';
      countSql += ' AND uo.status = ?';
      params.push(status);
    }
    
    if (date) {
        sql += " AND date(uo.created_at) = date(?)";
        countSql += " AND date(uo.created_at) = date(?)";
        params.push(date);
    }

    sql += ' ORDER BY uo.created_at DESC LIMIT ? OFFSET ?';
    const pagedParams = [...params, parseInt(limit), offset];

    const ordersData = await queryMany(sql, pagedParams);
    const countRow = await queryOne(countSql, params);

    // Fetch items for each order to format like prisma response
    const orders = [];
    for (let o of ordersData) {
      const items = await queryMany('SELECT uoi.*, uci.title as product_name FROM universal_order_items uoi JOIN universal_catalog_items uci ON uoi.item_id = uci.id WHERE uoi.order_id = $1', [o.id]);
      orders.push({
        ...o,
        id: o.id.toString(), // stringify for react key
        status: o.status.toLowerCase() === 'out_for_delivery' ? 'dispatched' : o.status.toLowerCase(), // Map back to frontend expected status
        items: JSON.stringify(items) // Frontend expects stringified JSON
      });
    }

    res.json({
      success: true,
      orders,
      total: countRow ? countRow.count : 0,
      page: parseInt(page), limit: parseInt(limit),
    });
  } catch (error) { next(error); }
}

async function getShopLedger(req, res, next) {
  try {
    const shop = req.shop;

    // Fetch all completed/delivered orders for this shop to calculate ledger
    const orders = await queryMany("SELECT id, total_amount, created_at, status FROM universal_orders WHERE shop_id = $1 AND status IN ('DELIVERED', 'COMPLETED')",
      [shop.id]
    );

    let grossSales = 0;
    let platformCommission = 0;
    let netPayout = 0;
    
    // We'll calculate pending payouts as those orders that are delivered but not yet "paid out"
    // Since we don't have a payout table yet, we'll just simulate the metrics based on orders
    const transactions = orders.map(o => {
      const gross = o.total_amount || 0;
      const commission = gross * 0.10; // 10% platform commission
      const net = gross - commission;

      grossSales += gross;
      platformCommission += commission;
      netPayout += net;

      return {
        order_id: o.id.toString(),
        created_at: o.created_at,
        gross_amount: gross,
        commission: commission,
        net_amount: net
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      success: true,
      ledger: {
        grossSales,
        platformCommission,
        netPayout,
        pendingPayouts: netPayout, // Assuming nothing has been paid out yet for this demo
        transactions
      }
    });
  } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 3: APPOINTMENT LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════

async function updateAppointmentStatus(req, res, next) {
  try {
    const { appointmentId } = req.params;
    const { status, rejection_reason } = req.body;
    const shop = req.shop;

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, shopId: shop.id },
      include: { user: true }
    });
    
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    const validTransitions = {
      REQUESTED: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    };
    
    const allowed = validTransitions[appointment.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Cannot transition from '${appointment.status}' to '${status}'` });
    }

    const data = { status };
    if (status === 'CONFIRMED') data.confirmedAt = new Date();
    if (status === 'IN_PROGRESS') data.startedAt = new Date();
    if (status === 'COMPLETED') data.completedAt = new Date();
    if (status === 'CANCELLED') {
      data.cancelledAt = new Date();
      data.cancellationReason = rejection_reason || null;
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data
    });

    // Notify customer
    if (appointment.user) {
      await notificationService.sendToUser(appointment.user.id, {
        type: 'appointment_update',
        title: status === 'CONFIRMED' ? 'Appointment Confirmed! ✅' : `Appointment ${status}`,
        body: `Your appointment has been ${status}.`,
        data: { appointmentId, status },
        actionUrl: '/my-orders',
        icon: '📅',
      });
    }

    res.json({ success: true, appointment: updated });
  } catch (error) { next(error); }
}

async function getShopAppointments(req, res, next) {
  try {
    const shop = req.shop;
    const { status, date, staffId, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = { shopId: shop.id };
    if (status) where.status = status;
    if (date) where.scheduledDate = new Date(date);
    // staffId maps to providerName in this snapshot schema since staff isn't modeled separately in Appointment
    if (staffId) where.providerName = staffId; 

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: [
        { scheduledDate: 'asc' },
        { scheduledTime: 'asc' }
      ],
      skip: offset,
      take: parseInt(limit),
      include: {
        user: { select: { name: true, phone: true } }
      }
    });

    const formatted = appointments.map(a => ({
      ...a,
      customer_name: a.user?.name,
      customer_phone: a.user?.phone,
      service_name: a.serviceName,
      staff_name: a.providerName,
      appointment_date: a.scheduledDate,
      time_slot: a.scheduledTime,
      duration_minutes: a.durationMinutes
    }));

    res.json({ success: true, appointments: formatted });
  } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 4: PRODUCT & INVENTORY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════

async function toggleLiveVisibility(req, res, next) {
  try {
    const shop = req.shop;
    const { isLive } = req.body;
    
    if (typeof isLive !== 'boolean') {
      return res.status(400).json({ error: 'isLive must be a boolean' });
    }

    const updatedShop = await prisma.shop.update({
      where: { id: shop.id },
      data: { isLive }
    });

    res.json({ success: true, isLive: updatedShop.isLive, message: `Shop is now ${updatedShop.isLive ? 'Live' : 'Offline'}` });
  } catch (error) { next(error); }
}

async function addProduct(req, res, next) {
  try {
    const shop = req.shop;
    const { name, slug, price, description, masterCategoryId, imageUrl, stockQuantity } = req.body;

    // Pillar 1: Strict Product-Category Isolation
    if (masterCategoryId && masterCategoryId !== shop.categoryId) {
      return res.status(403).json({ error: 'Isolation Error: Product does not belong to your Shop Category Master Catalog.' });
    }

    const product = await prisma.product.create({
      data: {
        shopId: shop.id,
        name,
        slug: slug || name.toLowerCase().replace(/ /g, '-'),
        pricePaise: Math.round((price || 0) * 100),
        mrpPaise: Math.round((price || 0) * 100),
        description,
        masterCategoryId: masterCategoryId || shop.categoryId,
        imageUrls: imageUrl ? `["${imageUrl}"]` : undefined,
        stockQuantity: stockQuantity || 100,
        isActive: true
      }
    });

    res.status(201).json({ success: true, product });
  } catch (error) { next(error); }
}

async function updateProduct(req, res, next) {
  try {
    const { productId } = req.params;
    const shop = req.shop;
    const { name, price, description, image_url, is_available, category, subcategory,
            sku, stock_quantity, low_stock_threshold } = req.body;

    const product = await prisma.product.findFirst({ where: { id: productId, shopId: shop.id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const data = {};
    if (name !== undefined) data.name = name;
    if (price !== undefined) data.pricePaise = Math.round(price * 100);
    if (description !== undefined) data.description = description;
    if (image_url !== undefined) data.imageUrl = image_url;
    if (is_available !== undefined) data.isAvailable = is_available;
    if (sku !== undefined) data.sku = sku;
    if (stock_quantity !== undefined) data.stockQuantity = stock_quantity;

    const updated = await prisma.product.update({
        where: { id: productId },
        data
    });

    res.json({ success: true, product: updated });
  } catch (error) { next(error); }
}

async function deleteProduct(req, res, next) {
  try {
    const { productId } = req.params;
    const shop = req.shop;
    
    const product = await prisma.product.findFirst({ where: { id: productId, shopId: shop.id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    await prisma.product.delete({ where: { id: productId } });

    res.json({ success: true, message: 'Product deleted' });
  } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 4.5: SERVICE SLOT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════

async function addServiceSlot(req, res, next) {
  try {
    const shop = req.shop;
    const { serviceName, providerName, durationMinutes, price } = req.body;

    if (!serviceName) {
      return res.status(400).json({ error: 'serviceName is required' });
    }

    // Since this is a template slot, we'll create it for a generic future date 
    // or just today, with available status.
    // In a real system we would create a recurring schedule, but for now
    // creating a single slot represents the "service" in the catalog.
    const slot = await prisma.serviceSlot.create({
      data: {
        shopId: shop.id,
        serviceName,
        providerName: providerName || 'General',
        durationMinutes: parseInt(durationMinutes) || 30,
        pricePaise: price ? Math.round(parseFloat(price) * 100) : 0,
        date: new Date(),
        startTime: '09:00',
        endTime: '17:00',
        status: 'AVAILABLE'
      }
    });

    res.status(201).json({ success: true, slot });
  } catch (error) { next(error); }
}

async function deleteServiceSlot(req, res, next) {
  try {
    const { slotId } = req.params;
    const shop = req.shop;
    
    const slot = await prisma.serviceSlot.findFirst({ where: { id: slotId, shopId: shop.id } });
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    await prisma.serviceSlot.delete({ where: { id: slotId } });

    res.json({ success: true, message: 'Slot deleted' });
  } catch (error) { next(error); }
}

// SECTION 5: STAFF MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════

async function updateStaff(req, res, next) {
  try {
    const { staffId } = req.params;
    const shop = req.shop;
    const { name, role, phone, specialization, is_active, bio, commission_percent } = req.body;

    const staff = await queryOne('SELECT * FROM shop_staff WHERE id = $1 AND shop_id = $2', [staffId, shop.id]);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });

    const updates = [];
    const params = [];
    let idx = 1;

    const fields = { name, role, phone, specialization, is_active, bio, commission_percent };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) { updates.push(`${key} = $${idx}`); params.push(value); idx++; }
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(staffId);

    const updated = await queryOne(`UPDATE shop_staff SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params
    );

    res.json({ success: true, staff: updated });
  } catch (error) { next(error); }
}

async function updateStaffAvailability(req, res, next) {
  try {
    const { staffId } = req.params;
    const shop = req.shop;
    const { availability } = req.body; // JSON array of { day, slots: [{start, end}] }

    const staff = await queryOne('SELECT * FROM shop_staff WHERE id = $1 AND shop_id = $2', [staffId, shop.id]);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });

    const updated = await queryOne('UPDATE shop_staff SET availability = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [JSON.stringify(availability), staffId]
    );

    res.json({ success: true, staff: updated });
  } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 6: DISPUTES & RETURNS
// ═══════════════════════════════════════════════════════════════════════

async function createDispute(req, res, next) {
  try {
    const { shopId, orderId, appointmentId, category, description, photoUrls } = req.body;
    const userId = req.user.id;
    const id = crypto.randomUUID();

    const dispute = await queryOne(`INSERT INTO shop_disputes (id, shop_id, order_id, appointment_id, initiator_id, initiator_role, category, description, photo_urls)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [id, shopId, orderId || null, appointmentId || null, userId,
       req.user.role === 'shop_owner' ? 'shop_owner' : 'visitor',
       category, description, JSON.stringify(photoUrls || [])]
    );

    // Notify admin and shop owner
    await notificationService.sendToShopOwner(shopId, {
      type: 'dispute_update', title: 'New Dispute Filed ⚠️',
      body: `A ${category} dispute has been filed.`,
      data: { disputeId: id }, actionUrl: '/shop-dashboard', icon: '⚖️',
    });

    res.status(201).json({ success: true, dispute });
  } catch (error) { next(error); }
}

async function createReturn(req, res, next) {
  try {
    const { orderId, reason, description, photoUrls, returnItems } = req.body;
    const userId = req.user.id;

    const order = await queryOne('SELECT * FROM shop_orders WHERE id = $1 AND user_id = $2', [orderId, userId]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'delivered') return res.status(400).json({ error: 'Only delivered orders can be returned' });

    const id = crypto.randomUUID();
    const returnRecord = await queryOne(`INSERT INTO shop_returns (id, order_id, shop_id, user_id, reason, description, photo_urls, return_items)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, orderId, order.shop_id, userId, reason, description || '',
       JSON.stringify(photoUrls || []), JSON.stringify(returnItems || [])]
    );

    // Update order status
    await query("UPDATE shop_orders SET status = 'return_requested' WHERE id = $1", [orderId]);

    // Notify shop owner
    await notificationService.sendToShopOwner(order.shop_id, {
      type: 'return_update', title: 'Return Requested 📦',
      body: `A return has been requested for order #${orderId.slice(0, 8)}`,
      data: { returnId: id, orderId }, actionUrl: '/shop-dashboard', icon: '📦',
    });

    res.status(201).json({ success: true, return: returnRecord });
  } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 7: CHAT
// ═══════════════════════════════════════════════════════════════════════

async function getChatMessages(req, res, next) {
  try {
    const { shopId, userId } = req.params;
    const currentUserId = req.user.id;

    // Verify access: must be shop owner or the customer
    const shop = await queryOne('SELECT * FROM local_shops WHERE id = $1', [shopId]);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const isOwner = shop.owner_id === currentUserId;
    const isCustomer = userId === currentUserId;
    if (!isOwner && !isCustomer) return res.status(403).json({ error: 'Access denied' });

    const otherUserId = isOwner ? userId : shop.owner_id;

    const messages = await query(`SELECT m.*, u.full_name as sender_name FROM shop_chat_messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.shop_id = $1
         AND ((m.sender_id = $2 AND m.receiver_id = $3) OR (m.sender_id = $3 AND m.receiver_id = $2))
       ORDER BY m.created_at ASC LIMIT 100`,
      [shopId, currentUserId, otherUserId]
    );

    // Mark as read
    await query(`UPDATE shop_chat_messages SET is_read = 1, read_at = CURRENT_TIMESTAMP
       WHERE shop_id = $1 AND receiver_id = $2 AND sender_id = $3 AND is_read = 0`,
      [shopId, currentUserId, otherUserId]
    );

    res.json({ success: true, messages: messages.rows || messages });
  } catch (error) { next(error); }
}

async function sendChatMessage(req, res, next) {
  try {
    const { shopId, userId } = req.params;
    const { message, messageType, referenceId } = req.body;
    const senderId = req.user.id;

    const shop = await queryOne('SELECT * FROM local_shops WHERE id = $1', [shopId]);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const isOwner = shop.owner_id === senderId;
    const receiverId = isOwner ? userId : shop.owner_id;

    const id = crypto.randomUUID();
    const chatMessage = await queryOne(`INSERT INTO shop_chat_messages (id, shop_id, sender_id, receiver_id, message, message_type, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, shopId, senderId, receiverId, message, messageType || 'text', referenceId || null]
    );

    // Real-time push
    notificationService.emitChatMessage(shopId, senderId, receiverId, chatMessage);

    // Notification
    const sender = await queryOne('SELECT full_name FROM users WHERE id = $1', [senderId]);
    await notificationService.sendToUser(receiverId, {
      type: 'chat_message',
      title: `Message from ${sender?.full_name || 'Someone'}`,
      body: message.substring(0, 100),
      data: { shopId, senderId },
      icon: '💬',
    });

    res.status(201).json({ success: true, message: chatMessage });
  } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 8: JOB CARDS (Garage, Repair, Laundry)
// ═══════════════════════════════════════════════════════════════════════

async function createJobCard(req, res, next) {
  try {
    const shop = req.shop;
    const { customerId, title, description, itemType, itemIdentifier, estimatedCost, priority } = req.body;

    // Generate job number
    const countResult = await queryOne('SELECT COUNT(*) as c FROM job_cards WHERE shop_id = $1', [shop.id]);
    const jobNumber = `JC${String(parseInt(countResult?.c || 0) + 1).padStart(4, '0')}`;

    const id = crypto.randomUUID();
    const jobCard = await queryOne(`INSERT INTO job_cards (id, shop_id, customer_id, job_number, title, description, item_type, item_identifier, estimated_cost, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [id, shop.id, customerId || null, jobNumber, title, description || '',
       itemType || '', itemIdentifier || '', estimatedCost || 0, priority || 'normal']
    );

    // Notify customer if known
    if (customerId) {
      await notificationService.sendToUser(customerId, {
        type: 'order_update', title: 'Job Card Created 🔧',
        body: `Your repair job ${jobNumber} has been registered at ${shop.name}.`,
        data: { jobCardId: id }, icon: '🔧',
      });
    }

    res.status(201).json({ success: true, jobCard });
  } catch (error) { next(error); }
}

async function updateJobCard(req, res, next) {
  try {
    const { jobCardId } = req.params;
    const shop = req.shop;
    const { status, estimatedCost, finalCost, estimateItems, technicianNotes, assignedTo, progressPhotos } = req.body;

    const jobCard = await queryOne('SELECT * FROM job_cards WHERE id = $1 AND shop_id = $2', [jobCardId, shop.id]);
    if (!jobCard) return res.status(404).json({ error: 'Job card not found' });

    const updates = ['updated_at = CURRENT_TIMESTAMP'];
    const params = [];
    let idx = 1;

    if (status) { updates.push(`status = $${idx}`); params.push(status); idx++; }
    if (estimatedCost !== undefined) { updates.push(`estimated_cost = $${idx}`); params.push(estimatedCost); idx++; }
    if (finalCost !== undefined) { updates.push(`final_cost = $${idx}`); params.push(finalCost); idx++; }
    if (estimateItems) { updates.push(`estimate_items = $${idx}`); params.push(JSON.stringify(estimateItems)); idx++; }
    if (technicianNotes) { updates.push(`technician_notes = $${idx}`); params.push(technicianNotes); idx++; }
    if (assignedTo) { updates.push(`assigned_to = $${idx}`); params.push(assignedTo); idx++; }
    if (progressPhotos) { updates.push(`progress_photos = $${idx}`); params.push(JSON.stringify(progressPhotos)); idx++; }

    if (status === 'estimate_sent') {
      updates.push(`customer_approved = 0`);
    }

    params.push(jobCardId);
    const updated = await queryOne(`UPDATE job_cards SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params
    );

    // Notify customer
    if (jobCard.customer_id && status) {
      const statusMessages = {
        inspection: 'Your item is being inspected.',
        estimate_sent: `Estimate ready: ₹${estimatedCost || jobCard.estimated_cost}. Please approve.`,
        in_repair: 'Repair work has started on your item.',
        quality_check: 'Quality check in progress.',
        ready: 'Your item is ready for pickup! 🎉',
      };
      if (statusMessages[status]) {
        await notificationService.sendToUser(jobCard.customer_id, {
          type: 'order_update', title: `Job ${jobCard.job_number} Update`,
          body: statusMessages[status],
          data: { jobCardId }, icon: '🔧',
        });
      }
    }

    res.json({ success: true, jobCard: updated });
  } catch (error) { next(error); }
}

async function getJobCards(req, res, next) {
  try {
    const shop = req.shop;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE jc.shop_id = $1';
    const params = [shop.id];
    let idx = 2;

    if (status) { whereClause += ` AND jc.status = $${idx}`; params.push(status); idx++; }

    const jobCards = await query(`SELECT jc.*, u.full_name as customer_name, u.phone_number as customer_phone
       FROM job_cards jc LEFT JOIN users u ON jc.customer_id = u.id
       ${whereClause} ORDER BY jc.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ success: true, jobCards: jobCards.rows || jobCards });
  } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 9: QUOTATIONS (Home Service, Events, Professional)
// ═══════════════════════════════════════════════════════════════════════

async function createQuotation(req, res, next) {
  try {
    const shop = req.shop;
    const { customerId, serviceRequestDescription, items, labourCharge, materialCharge,
            discount, validityDays, serviceAddress, preferredDate, preferredTime } = req.body;

    const totalAmount = (items || []).reduce((sum, i) => sum + (i.amount || 0), 0) + (labourCharge || 0) + (materialCharge || 0);
    const finalAmount = totalAmount - (discount || 0);

    const id = crypto.randomUUID();
    const quotation = await queryOne(`INSERT INTO service_quotations (id, shop_id, customer_id, service_request_description, items,
       labour_charge, material_charge, total_amount, discount_amount, final_amount, validity_days,
       service_address, preferred_date, preferred_time, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'sent') RETURNING *`,
      [id, shop.id, customerId || null, serviceRequestDescription || '',
       JSON.stringify(items || []), labourCharge || 0, materialCharge || 0,
       totalAmount, discount || 0, finalAmount, validityDays || 7,
       serviceAddress || '', preferredDate || '', preferredTime || '']
    );

    if (customerId) {
      await notificationService.sendToUser(customerId, {
        type: 'order_update', title: 'Quotation Received 📋',
        body: `${shop.name} sent you a quotation for ₹${finalAmount}`,
        data: { quotationId: id }, icon: '📋',
      });
    }

    res.status(201).json({ success: true, quotation });
  } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 10: KDS (Kitchen Display System) — Restaurant
// ═══════════════════════════════════════════════════════════════════════

async function createKDSTicket(req, res, next) {
  try {
    const shop = req.shop;
    const { orderId, items, specialInstructions, priority, assignedStation, estimatedPrepMinutes } = req.body;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const countResult = await prisma.kDSTicket.count({
      where: {
        shopId: shop.id,
        createdAt: { gte: todayStart }
      }
    });
    
    const ticketNumber = countResult + 1;

    const ticket = await prisma.kDSTicket.create({
      data: {
        shopId: shop.id,
        orderId: orderId || undefined,
        ticketNumber,
        items: JSON.stringify(items || []),
        specialInstructions: specialInstructions || '',
        priority: priority || 'normal',
        assignedStation: assignedStation || '',
        estimatedPrepMinutes: estimatedPrepMinutes || 15,
        status: 'pending'
      }
    });

    // Emit to KDS displays
    notificationService.emitKDSUpdate(shop.id, ticket);

    res.status(201).json({ success: true, ticket });
  } catch (error) { next(error); }
}

async function updateKDSTicket(req, res, next) {
  try {
    const { ticketId } = req.params;
    const shop = req.shop;
    const { status } = req.body;

    const updates = [`status = '${status}'`];
    if (status === 'preparing') updates.push(`prep_started_at = '${new Date().toISOString()}'`);
    if (status === 'ready') updates.push(`ready_at = '${new Date().toISOString()}'`);
    if (status === 'served') updates.push(`served_at = '${new Date().toISOString()}'`);

    const updated = await queryOne(`UPDATE kds_tickets SET ${updates.join(', ')} WHERE id = $1 AND shop_id = $2 RETURNING *`,
      [ticketId, shop.id]
    );
    if (!updated) return res.status(404).json({ error: 'Ticket not found' });

    notificationService.emitKDSUpdate(shop.id, updated);

    res.json({ success: true, ticket: updated });
  } catch (error) { next(error); }
}

async function getKDSTickets(req, res, next) {
  try {
    const shop = req.shop;
    const { status } = req.query;

    let whereClause = 'WHERE shop_id = $1 AND DATE(created_at) = DATE(CURRENT_TIMESTAMP)';
    const params = [shop.id];
    if (status) { whereClause += ' AND status = $2'; params.push(status); }

    const tickets = await query(`SELECT * FROM kds_tickets ${whereClause} ORDER BY ticket_number ASC`, params
    );

    res.json({ success: true, tickets: tickets.rows || tickets });
  } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 11: TABLE MANAGEMENT — Restaurant
// ═══════════════════════════════════════════════════════════════════════

async function getRestaurantTables(req, res, next) {
  try {
    const shop = req.shop;
    const tables = await query('SELECT * FROM restaurant_tables WHERE shop_id = $1 ORDER BY table_number ASC', [shop.id]);
    res.json({ success: true, tables: tables.rows || tables });
  } catch (error) { next(error); }
}

async function updateTableStatus(req, res, next) {
  try {
    const { tableId } = req.params;
    const shop = req.shop;
    const { status, currentOrderId } = req.body;

    const updates = [`status = '${status}'`];
    if (status === 'occupied') updates.push(`occupied_at = '${new Date().toISOString()}'`);
    if (status === 'available') updates.push(`occupied_at = NULL`, `current_order_id = NULL`);
    if (currentOrderId) updates.push(`current_order_id = '${currentOrderId}'`);

    const updated = await queryOne(`UPDATE restaurant_tables SET ${updates.join(', ')} WHERE id = $1 AND shop_id = $2 RETURNING *`,
      [tableId, shop.id]
    );
    if (!updated) return res.status(404).json({ error: 'Table not found' });

    res.json({ success: true, table: updated });
  } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 12: SHOP ANALYTICS
// ═══════════════════════════════════════════════════════════════════════

async function getShopAnalytics(req, res, next) {
  try {
    const shop = req.shop;
    const { period = '7d' } = req.query;

    const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const days = daysMap[period] || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [revenueByDay, ordersByStatus, topProducts, topServices, reviewTrend] = await Promise.all([
      query(`SELECT DATE(created_at) as date, SUM(total_amount) as revenue, COUNT(*) as orders
             FROM shop_orders WHERE shop_id = $1 AND created_at >= $2 AND status NOT IN ('cancelled')
             GROUP BY DATE(created_at) ORDER BY date ASC`, [shop.id, startDate]),
      query(`SELECT status, COUNT(*) as count FROM shop_orders
             WHERE shop_id = $1 AND created_at >= $2 GROUP BY status`, [shop.id, startDate]),
      query(`SELECT p.name, COUNT(oi.id) as order_count, SUM(oi.quantity * oi.price) as revenue
             FROM order_items oi JOIN shop_products p ON oi.product_id = p.id
             WHERE p.shop_id = $1 AND oi.created_at >= $2
             GROUP BY p.id ORDER BY revenue DESC LIMIT 10`, [shop.id, startDate]),
      query(`SELECT s.name, COUNT(a.id) as booking_count
             FROM shop_appointments a JOIN shop_services s ON a.service_id = s.id
             WHERE a.shop_id = $1 AND a.created_at >= $2
             GROUP BY s.id ORDER BY booking_count DESC LIMIT 10`, [shop.id, startDate]),
      query(`SELECT DATE(created_at) as date, AVG(rating) as avg_rating, COUNT(*) as count
             FROM shop_reviews WHERE shop_id = $1 AND created_at >= $2
             GROUP BY DATE(created_at) ORDER BY date ASC`, [shop.id, startDate]),
    ]);

    res.json({
      success: true,
      analytics: {
        revenueByDay: revenueByDay.rows || revenueByDay,
        ordersByStatus: ordersByStatus.rows || ordersByStatus,
        topProducts: topProducts.rows || topProducts,
        topServices: topServices.rows || topServices,
        reviewTrend: reviewTrend.rows || reviewTrend,
      },
    });
  } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 13: PAYOUTS
// ═══════════════════════════════════════════════════════════════════════

async function getShopPayouts(req, res, next) {
  try {
    const shop = req.shop;
    const payouts = await query('SELECT * FROM shop_owner_payouts WHERE shop_id = $1 ORDER BY created_at DESC LIMIT 50',
      [shop.id]
    );
    res.json({ success: true, payouts: payouts.rows || payouts });
  } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 14: SHOP SETTINGS
// ═══════════════════════════════════════════════════════════════════════

async function updateShopSettings(req, res, next) {
  try {
    const shop = req.shop;
    const { description, address, phone_number, opening_hours, closing_hours,
            is_delivery_available, is_pickup_available, delivery_radius_km,
            minimum_order, dine_in_available, self_delivery_available, accepts_walkin } = req.body;

    const updates = [];
    const params = [];
    let idx = 1;

    const fields = { description, address, phone_number, opening_hours, closing_hours,
      is_delivery_available, is_pickup_available, delivery_radius_km, minimum_order,
      dine_in_available, self_delivery_available, accepts_walkin };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) { updates.push(`${key} = $${idx}`); params.push(value); idx++; }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(shop.id);
    await query(`UPDATE local_shops SET ${updates.join(', ')} WHERE id = $${idx}`, params);

    // 10x Scale: Invalidate cache for the shop's pincode and region
    if (shop.pincode) {
        await cacheInvalidate(`cache:${shop.pincode}:*`);
    } else {
        await cacheInvalidate('cache:*');
    }

    res.json({ message: 'Shop settings updated successfully' });
  } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 15: VISITOR ORDER HISTORY
// ═══════════════════════════════════════════════════════════════════════

async function getVisitorOrderHistory(req, res, next) {
  try {
    const userId = req.user.id;
    const { type, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE user_id = $1';
    const params = [userId];
    let idx = 2;

    if (type) { whereClause += ` AND type = $${idx}`; params.push(type); idx++; }
    if (status) { whereClause += ` AND status = $${idx}`; params.push(status); idx++; }

    // Use the view we created in migration
    const history = await query(`SELECT * FROM visitor_order_history ${whereClause} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ success: true, orders: history.rows || history });
  } catch (error) { next(error); }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 16: NOTIFICATIONS API
// ═══════════════════════════════════════════════════════════════════════

async function getNotifications(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await notificationService.getAll(req.user.id, parseInt(page), parseInt(limit));
    const unreadCount = await notificationService.getUnreadCount(req.user.id);
    res.json({ success: true, ...result, unreadCount });
  } catch (error) { next(error); }
}

async function markNotificationRead(req, res, next) {
  try {
    const { notificationId } = req.params;
    if (notificationId === 'all') {
      await notificationService.markAllRead(req.user.id);
    } else {
      await notificationService.markRead(notificationId, req.user.id);
    }
    res.json({ success: true });
  } catch (error) { next(error); }
}
// ─── DISPUTES & RETURNS ───────────────────────────────────────────────
async function createDispute(req, res, next) {
  try {
    const { orderId, reason, description } = req.body;
    if (!orderId || !reason) return res.status(400).json({ error: 'Order ID and reason are required' });
    
    // In a full implementation, this would insert into a `disputes` table.
    // For now, we mock the creation and return success to integrate with Admin Dashboard.
    res.status(201).json({
      success: true,
      dispute: {
        id: `DSP-${Math.floor(Math.random() * 10000)}`,
        order_id: orderId,
        user_id: req.user.id,
        reason,
        description,
        status: 'open',
        created_at: new Date().toISOString()
      },
      message: 'Dispute created successfully. Admin will review it shortly.'
    });
  } catch (error) { next(error); }
}

async function createReturn(req, res, next) {
  try {
    const { orderId, reason, description } = req.body;
    if (!orderId || !reason) return res.status(400).json({ error: 'Order ID and reason are required' });
    
    // Mock the creation of a return request
    res.status(201).json({
      success: true,
      returnRequest: {
        id: `RET-${Math.floor(Math.random() * 10000)}`,
        order_id: orderId,
        user_id: req.user.id,
        reason,
        description,
        status: 'pending_approval',
        created_at: new Date().toISOString()
      },
      message: 'Return request submitted successfully.'
    });
  } catch (error) { next(error); }
}
// ═══════════════════════════════════════════════════════════════════════
// SECTION 13: LEAD CRM
// ═══════════════════════════════════════════════════════════════════════

async function getShopLeads(req, res, next) {
  try {
    const shop = req.shop;
    const leads = await queryMany('SELECT ul.*, u.name as customer_name, u.phone as customer_phone FROM universal_leads ul JOIN users u ON ul.user_id = u.id WHERE ul.shop_id = $1 ORDER BY ul.created_at DESC',
      [shop.id]
    );

    res.json({ success: true, leads });
  } catch (error) { next(error); }
}

async function updateLeadStatus(req, res, next) {
  try {
    const shop = req.shop;
    const { leadId } = req.params;
    const { status } = req.body;

    await query('UPDATE universal_leads SET lead_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND shop_id = $3',
      [status.toUpperCase(), leadId, shop.id]
    );

    res.json({ success: true, message: 'Lead updated successfully' });
  } catch (error) { next(error); }
}

// ─── PHASE 5: STAFF, REVIEWS, ANALYTICS ──────────────────────────

async function getShopStaff(req, res, next) {
  try {
    const shop = req.shop;
    const staff = await queryMany('SELECT * FROM shop_staff WHERE shop_id = $1 ORDER BY created_at DESC', [shop.id]);
    res.json({ success: true, staff });
  } catch (error) { next(error); }
}

async function addShopStaff(req, res, next) {
  try {
    const shop = req.shop;
    const { name, role, phone, email, status, shift, commission } = req.body;
    await query('INSERT INTO shop_staff (shop_id, name, role, phone, email, status, shift, commission) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [shop.id, name, role, phone, email, status || 'Active', shift, commission || 0.0]
    );
    res.json({ success: true, message: 'Staff added successfully' });
  } catch (error) { next(error); }
}

async function updateShopStaff(req, res, next) {
  try {
    const shop = req.shop;
    const { staffId } = req.params;
    const { name, role, phone, email, status, shift, commission } = req.body;
    await query('UPDATE shop_staff SET name=$1, role=$2, phone=$3, email=$4, status=$5, shift=$6, commission=$7, updated_at=CURRENT_TIMESTAMP WHERE id=$8 AND shop_id=$9',
      [name, role, phone, email, status, shift, commission, staffId, shop.id]
    );
    res.json({ success: true, message: 'Staff updated successfully' });
  } catch (error) { next(error); }
}

async function removeShopStaff(req, res, next) {
  try {
    const shop = req.shop;
    const { staffId } = req.params;
    await query('DELETE FROM shop_staff WHERE id=$1 AND shop_id=$2', [staffId, shop.id]);
    res.json({ success: true, message: 'Staff removed successfully' });
  } catch (error) { next(error); }
}

async function getShopReviews(req, res, next) {
  try {
    const shop = req.shop;
    const reviews = await queryMany('SELECT * FROM shop_reviews WHERE shop_id = $1 ORDER BY created_at DESC', [shop.id]);
    res.json({ success: true, reviews });
  } catch (error) { next(error); }
}

async function replyToShopReview(req, res, next) {
  try {
    const shop = req.shop;
    const { reviewId } = req.params;
    const { reply } = req.body;
    await query('UPDATE shop_reviews SET reply=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND shop_id=$3', [reply, reviewId, shop.id]);
    res.json({ success: true, message: 'Reply added successfully' });
  } catch (error) { next(error); }
}

async function getShopAnalyticsData(req, res, next) {
  try {
    const shop = req.shop;
    
    // In a full implementation, this might read from shop_analytics_snapshots table.
    // For now, we will dynamically aggregate from universal_orders.
    const orders = await queryMany('SELECT * FROM universal_orders WHERE shop_id = $1', [shop.id]);
    
    let totalRevenue = 0;
    let completedOrders = 0;
    
    orders.forEach(o => {
      if (o.status === 'delivered' || o.status === 'completed') {
        completedOrders++;
        totalRevenue += parseFloat(o.total_amount || 0);
      }
    });

    const analytics = {
      revenue: totalRevenue,
      orders: completedOrders,
      views: Math.floor(Math.random() * 1000) + 100, // mock views for now
      conversion: ((completedOrders / (completedOrders + 50)) * 100).toFixed(1)
    };

    res.json({ success: true, analytics });
  } catch (error) { next(error); }
}


// ─── CONSUMER SEARCH (Phase 6) ──────────────────────────────────
async function searchDirectory(req, res, next) {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ success: true, shops: [] });
    }

    // Attempt to use FTS5 Virtual Table for fast search
    let shops = [];
    try {
      shops = await queryMany(`
        SELECT s.id, s.name, s.description, s.category, s.cover_image, s.rating, s.total_ratings, s.is_promoted
        FROM shop_search_index fts
        JOIN local_shops s ON fts.shop_id = s.id
        WHERE shop_search_index MATCH $1
        ORDER BY s.is_promoted DESC, rank LIMIT 50
      `, [q]);
    } catch (ftsError) {
      // Fallback to standard wildcard search if FTS table does not exist or fails
      shops = await queryMany(`
        SELECT id, name, description, category, cover_image, rating, total_ratings, is_promoted
        FROM local_shops 
        WHERE name LIKE $1 OR description LIKE $2 OR category LIKE $3
        ORDER BY is_promoted DESC
        LIMIT 50
      `, [`%${q}%`, `%${q}%`, `%${q}%`]);
    }

    res.json({ success: true, shops });
  } catch (error) { next(error); }
}

// ─── RIDER MANAGEMENT (Phase 7) ──────────────────────────────────
async function assignRiderToOrder(req, res, next) {
  try {
    const { orderId } = req.params;
    const { riderId } = req.body;
    
    // Assign rider
    await query('UPDATE universal_orders SET rider_id = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [riderId, 'dispatched', orderId]);
    await query('UPDATE delivery_riders SET status = $1, current_order_id = $2 WHERE id = $3', ['on_delivery', orderId, riderId]);

    // Broadcast Socket
    const io = req.app.get('io');
    if (io) {
      io.to(`order_${orderId}`).emit('RIDER_ASSIGNED', { riderId });
    }

    res.json({ success: true, message: 'Rider assigned successfully' });
  } catch (error) { next(error); }
}


module.exports = {
  getArchetype, ARCHETYPE_MAP,
  // Dashboard
  getShopDashboard,
  // Consumer
  searchDirectory,
  // Orders
  updateOrderStatus, getShopOrders, assignRiderToOrder,
  // Appointments
  updateAppointmentStatus, getShopAppointments,
  // Products & Visibility
  toggleLiveVisibility, addProduct, updateProduct, deleteProduct,
  // Services
  addServiceSlot, deleteServiceSlot,
  // Staff
  updateStaff, updateStaffAvailability,
  // Disputes & Returns
  createDispute, createReturn,
  // Chat
  getChatMessages, sendChatMessage,
  // Job Cards
  createJobCard, updateJobCard, getJobCards,
  // Quotations
  createQuotation,
  // KDS
  createKDSTicket, updateKDSTicket, getKDSTickets,
  // Tables
  getRestaurantTables, updateTableStatus,
  // Analytics
  getShopAnalytics,
  // Payouts
  getShopPayouts,
  // Settings
  updateShopSettings,
  // Visitor
  getVisitorOrderHistory,
  // Notifications
  getNotifications, markNotificationRead,
  getShopLedger,
  getShopLeads, updateLeadStatus,
  // Phase 5 Additions
  getShopStaff, addShopStaff, updateShopStaff, removeShopStaff,
  getShopReviews, replyToShopReview,
  getShopAnalyticsData
};
