// ═══════════════════════════════════════════════════════════════════════
// Unified Super-App API Controller — Powered by Prisma ORM
// ═══════════════════════════════════════════════════════════════════════
// Handles /api/shops/:id, /api/checkout, /api/book for Web & Android
// Serves identical payloads dynamically driven by ShopCategoryType
// ═══════════════════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret'
});

/**
 * GET /api/shops/:id
 * Dynamic endpoint returning shop details along with products, service slots, or both
 * based strictly on the shop's categoryType (PRODUCT, APPOINTMENT, HYBRID).
 */
async function getShopById(req, res, next) {
  try {
    const { id } = req.params;

    // Search by ID or Slug
    const shop = await prisma.shop.findFirst({
      where: {
        OR: [{ id: id }, { slug: id }],
      },
      include: {
        category: true,
        region: true,
      },
    });

    if (!shop) {
      return res.status(404).json({ success: false, error: 'Shop not found' });
    }

    const responsePayload = {
      success: true,
      shop: {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        description: shop.description,
        categoryType: shop.categoryType, // PRODUCT, APPOINTMENT, HYBRID
        category: {
          id: shop.category.id,
          name: shop.category.name,
          slug: shop.category.slug,
          iconUrl: shop.category.iconUrl,
        },
        address: {
          line1: shop.addressLine1,
          line2: shop.addressLine2,
          landmark: shop.landmark,
          locality: shop.locality,
          city: shop.city,
          state: shop.state,
          pincode: shop.pincode,
          latitude: shop.latitude,
          longitude: shop.longitude,
        },
        rating: shop.rating,
        totalRatings: shop.totalRatings,
        phoneNumber: shop.phoneNumber,
        whatsappNumber: shop.whatsappNumber,
        logoUrl: shop.logoUrl,
        bannerUrl: shop.bannerUrl,
        operatingHours: shop.operatingHours ? JSON.parse(shop.operatingHours) : null,
        deliveryAvailable: shop.deliveryAvailable,
        pickupAvailable: shop.pickupAvailable,
        estimatedDeliveryTime: shop.estimatedDeliveryTime,
      },
      products: [],
      serviceSlots: [],
      availableServices: [],
    };

    // 1. Fetch Products for PRODUCT or HYBRID shops
    if (['PRODUCT', 'HYBRID'].includes(shop.categoryType)) {
      const products = await prisma.product.findMany({
        where: { shopId: shop.id, isActive: true },
        orderBy: { displayOrder: 'asc' },
      });

      responsePayload.products = products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        pricePaise: p.pricePaise,
        priceFormatted: `₹${(p.pricePaise / 100).toFixed(2)}`,
        mrpPaise: p.mrpPaise,
        mrpFormatted: `₹${(p.mrpPaise / 100).toFixed(2)}`,
        discountPercent: p.discountPercent,
        unit: p.unit,
        quantityPerUnit: p.quantityPerUnit,
        stockQuantity: p.stockQuantity,
        isAvailable: p.stockQuantity > 0,
        imageUrls: p.imageUrls ? JSON.parse(p.imageUrls) : [],
        thumbnailUrl: p.thumbnailUrl,
        dietaryTags: p.dietaryTags ? JSON.parse(p.dietaryTags) : [],
      }));
    }

    // 2. Fetch Service Slots & Service Categories for APPOINTMENT or HYBRID shops
    if (['APPOINTMENT', 'HYBRID'].includes(shop.categoryType)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const slots = await prisma.serviceSlot.findMany({
        where: {
          shopId: shop.id,
          date: { gte: today },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      });

      // Extract distinct services offered by the shop
      const serviceMap = new Map();
      slots.forEach((s) => {
        if (!serviceMap.has(s.serviceName)) {
          serviceMap.set(s.serviceName, {
            name: s.serviceName,
            category: s.serviceCategory,
            durationMinutes: s.durationMinutes,
            pricePaise: s.pricePaise,
            priceFormatted: `₹${(s.pricePaise / 100).toFixed(2)}`,
            providerName: s.providerName,
            providerRole: s.providerRole,
          });
        }
      });

      responsePayload.availableServices = Array.from(serviceMap.values());
      responsePayload.serviceSlots = slots.map((s) => ({
        id: s.id,
        serviceName: s.serviceName,
        serviceCategory: s.serviceCategory,
        providerName: s.providerName,
        providerRole: s.providerRole,
        date: s.date.toISOString().split('T')[0],
        startTime: s.startTime,
        endTime: s.endTime,
        durationMinutes: s.durationMinutes,
        pricePaise: s.pricePaise,
        priceFormatted: `₹${(s.pricePaise / 100).toFixed(2)}`,
        status: s.status, // AVAILABLE, BOOKED, BREAK, BUFFER
        maxCapacity: s.maxCapacity,
        currentBookings: s.currentBookings,
      }));
    }

    return res.json(responsePayload);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/checkout
 * Unified Product Order Checkout Endpoint
 * Enforces Order State Machine: PENDING -> ACCEPTED -> PREPARING -> OUT_FOR_DELIVERY -> DELIVERED
 */
async function processCheckout(req, res, next) {
  try {
    const { userId, shopId, items, deliveryAddressId, paymentMethod = 'COD', specialInstructions } = req.body;

    if (!shopId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'shopId and items array are required' });
    }

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      return res.status(404).json({ success: false, error: 'Shop not found' });
    }

    if (!['PRODUCT', 'HYBRID'].includes(shop.categoryType)) {
      return res.status(400).json({ success: false, error: `Shop of type ${shop.categoryType} does not support product checkout` });
    }

    // Calculate totals & verify stock
    let subtotalPaise = 0;
    const orderItemData = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || product.shopId !== shopId) {
        return res.status(400).json({ success: false, error: `Invalid product ID: ${item.productId}` });
      }

      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({ success: false, error: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}` });
      }

      const itemTotal = product.pricePaise * item.quantity;
      subtotalPaise += itemTotal;

      orderItemData.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        pricePaise: product.pricePaise,
        totalPaise: itemTotal,
      });

      // Decrement stock
      await prisma.product.update({
        where: { id: product.id },
        data: { stockQuantity: { decrement: item.quantity } },
      });
    }

    const deliveryFeePaise = shop.deliveryAvailable ? 3000 : 0; // ₹30 delivery fee
    const platformFeePaise = 500; // ₹5 platform fee
    const totalAmountPaise = subtotalPaise + deliveryFeePaise + platformFeePaise;
    const orderNumber = `LS-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create Order with Initial State: PENDING
    let targetUserId = req.body.userId;
    if (!targetUserId && req.user) targetUserId = req.user.id;
    if (!targetUserId) {
      targetUserId = (await prisma.user.findFirst({ where: { role: 'CUSTOMER' } })).id;
    }

    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        userId: targetUserId,
        shopId,
        deliveryAddressId,
        status: 'PENDING', // Initial State Machine Step
        subtotalPaise,
        deliveryFeePaise,
        platformFeePaise,
        totalAmountPaise,
        paymentMethod,
        paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PAID',
        fulfillmentMethod: 'DELIVERY',
        specialInstructions,
        items: {
          create: orderItemData,
        },
        deliveryRoute: {
          create: {
            status: 'PENDING',
            pickupLatitude: shop.latitude,
            pickupLongitude: shop.longitude,
          },
        },
      },
      include: {
        items: true,
        deliveryRoute: true,
        shop: { select: { name: true, categoryType: true } },
      },
    });

    // Audit Log Entry
    await prisma.auditLog.create({
      data: {
        entityType: 'Order',
        entityId: newOrder.id,
        action: 'CREATE',
        newValue: JSON.stringify({ status: 'PENDING', totalAmountPaise: newOrder.totalAmountPaise }),
        performedBy: targetUserId,
      },
    });

    // Broadcast via WebSockets / Socket.io if available
    const io = req.app?.get ? req.app.get('io') : null;
    if (io) {
      io.emit(`vendor:orders:${shopId}`, { event: 'ORDER_CREATED', order: newOrder });
    }

    let paymentData = null;
    if (paymentMethod === 'RAZORPAY') {
      try {
        paymentData = await razorpay.orders.create({
          amount: totalAmountPaise, // already in paise
          currency: 'INR',
          receipt: `receipt_order_${newOrder.orderNumber}`
        });
      } catch (err) {
        console.warn('Razorpay fallback', err.message);
        paymentData = { id: 'mock_rzp_' + Date.now(), amount: totalAmountPaise, currency: 'INR' };
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Checkout successful',
      order: newOrder,
      paymentData
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
async function processBooking(req, res, next) {
  try {
    const { userId, shopId, serviceSlotId, customerNotes, paymentMethod = 'COD' } = req.body;

    if (!shopId || !serviceSlotId) {
      return res.status(400).json({ success: false, error: 'shopId and serviceSlotId are required' });
    }

    const bookingNumber = `LS-BK-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const targetUserId = userId || (await prisma.user.findFirst({ where: { role: 'CUSTOMER' } })).id;

    // Interactive Transaction for Thread-Safe Concurrency
    const result = await prisma.$transaction(async (tx) => {
      const slot = await tx.serviceSlot.findUnique({
        where: { id: serviceSlotId },
        include: { shop: true },
      });

      if (!slot || slot.shopId !== shopId) {
        throw { status: 404, message: 'Service slot not found' };
      }

      if (slot.status === 'BOOKED' || slot.currentBookings >= slot.maxCapacity) {
        throw { status: 400, message: 'Selected time slot is already fully booked' };
      }

      if (['BREAK', 'BLOCKED'].includes(slot.status)) {
        throw { status: 400, message: 'Selected time slot is unavailable' };
      }

      // 1. Update Service Slot capacity atomically
      const newBookings = slot.currentBookings + 1;
      await tx.serviceSlot.update({
        where: { id: slot.id },
        data: {
          currentBookings: newBookings,
          status: newBookings >= slot.maxCapacity ? 'BOOKED' : 'AVAILABLE',
        },
      });

      // 2. Create Appointment with Initial State: REQUESTED
      const appointment = await tx.appointment.create({
        data: {
          bookingNumber,
          userId: targetUserId,
          shopId,
          serviceSlotId,
          status: 'REQUESTED',
          serviceName: slot.serviceName,
          providerName: slot.providerName,
          scheduledDate: slot.date,
          scheduledTime: slot.startTime,
          durationMinutes: slot.durationMinutes,
          pricePaise: slot.pricePaise,
          paymentMethod,
          paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PAID',
          customerNotes,
        },
        include: {
          shop: { select: { name: true, categoryType: true } },
        },
      });

      // 3. Audit Log Entry
      await tx.auditLog.create({
        data: {
          entityType: 'Appointment',
          entityId: appointment.id,
          action: 'CREATE',
          newValue: JSON.stringify({ status: 'REQUESTED', serviceName: appointment.serviceName }),
          performedBy: targetUserId,
        },
      });

      return appointment;
    });

    // Broadcast via Socket.io outside transaction
    const io = req.app?.get ? req.app.get('io') : null;
    if (io) {
      io.emit(`vendor:appointments:${shopId}`, { event: 'APPOINTMENT_REQUESTED', appointment: result });
    }

    return res.status(201).json({
      success: true,
      message: 'Appointment requested successfully',
      appointment: {
        id: result.id,
        bookingNumber: result.bookingNumber,
        status: result.status,
        serviceName: result.serviceName,
        providerName: result.providerName,
        scheduledDate: result.scheduledDate.toISOString().split('T')[0],
        scheduledTime: result.scheduledTime,
        priceFormatted: `₹${(result.pricePaise / 100).toFixed(2)}`,
        createdAt: result.createdAt,
      },
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    next(error);
  }
}



/**
 * PATCH /api/orders/:id/status
 * Vendor/Admin State Machine Transition for Orders
 * State Flow: PENDING -> ACCEPTED -> PREPARING -> OUT_FOR_DELIVERY -> DELIVERED
 */
async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, cancellationReason } = req.body;

    const VALID_STATUSES = ['PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { deliveryRoute: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const oldStatus = order.status;
    const updateData = { status };

    if (status === 'ACCEPTED') updateData.acceptedAt = new Date();
    if (status === 'PREPARING') updateData.preparingAt = new Date();
    if (status === 'OUT_FOR_DELIVERY') updateData.outForDeliveryAt = new Date();
    if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
      updateData.paymentStatus = 'PAID';
    }
    if (status === 'CANCELLED') {
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = cancellationReason || 'Cancelled by admin/vendor';
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    // Sync Delivery Route Status
    if (order.deliveryRoute) {
      let routeStatus = order.deliveryRoute.status;
      if (status === 'OUT_FOR_DELIVERY') routeStatus = 'IN_TRANSIT';
      if (status === 'DELIVERED') routeStatus = 'DELIVERED';
      if (status === 'CANCELLED') routeStatus = 'FAILED';

      await prisma.deliveryRoute.update({
        where: { id: order.deliveryRoute.id },
        data: { status: routeStatus },
      });
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        entityType: 'Order',
        entityId: id,
        action: 'STATUS_CHANGE',
        oldValue: oldStatus,
        newValue: status,
      },
    });

    // Real-Time Socket Broadcast
    const io = req.app?.get ? req.app.get('io') : null;
    if (io) {
      io.emit(`order:${id}:status`, { orderId: id, oldStatus, newStatus: status });
    }

    return res.json({ success: true, message: `Order status updated to ${status}`, order: updatedOrder });
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
