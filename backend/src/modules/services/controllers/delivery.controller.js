const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const SurgeEngine = require('../../../services/surge.engine');
const RoutingService = require('../services/routing.service');

async function calculateDeliveryFee(req, res, next) {
  try {
    const { pincode = '411015', activeOrders = 10, availableDrivers = 2 } = req.query;
    const surgeData = await SurgeEngine.calculateSurge(pincode, parseInt(activeOrders), parseInt(availableDrivers));
    return res.json({ success: true, deliveryDetails: surgeData });
  } catch (err) {
    next(err);
  }
}

// Haversine
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// requestDelivery: P2P courier and on-demand parcel delivery
const requestDelivery = async (req, res, next) => {
  try {
    const {
      pickupAddress,
      deliveryAddress,
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
      packageDetails = 'Parcel / Courier Document',
      pincode = '411015',
      estimatedDistanceKm = 3.5,
      deliveryFee = 45
    } = req.body;

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Find or create default logistics shop
    let shop = await prisma.shop.findFirst({
      where: { categoryType: { in: ['PRODUCT', 'HYBRID'] } }
    });
    if (!shop) {
      shop = await prisma.shop.findFirst();
    }

    if (!shop) {
      return res.status(400).json({ success: false, error: 'No active logistics channel found in region' });
    }

    const calculatedSurge = await SurgeEngine.calculateSurge(pincode, 5, 2);
    const finalFeePaise = Math.round((deliveryFee || (calculatedSurge.totalDeliveryFee || 45)) * 100);
    const orderNumber = `LS-P2P-${Date.now().toString().slice(-6)}`;

    // Create Order and DeliveryRoute
    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        shopId: shop.id,
        status: 'PENDING',
        subtotalPaise: 0,
        deliveryFeePaise: finalFeePaise,
        platformFeePaise: 500,
        totalAmountPaise: finalFeePaise + 500,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        fulfillmentMethod: 'DELIVERY',
        specialInstructions: `[P2P Parcel] ${packageDetails} | Pickup: ${pickupAddress || 'Address'} -> Drop: ${deliveryAddress || 'Address'}`,
        deliveryRoute: {
          create: {
            status: 'PENDING',
            pickupLatitude: pickupLat ? parseFloat(pickupLat) : shop.latitude,
            pickupLongitude: pickupLng ? parseFloat(pickupLng) : shop.longitude,
            dropLatitude: dropLat ? parseFloat(dropLat) : null,
            dropLongitude: dropLng ? parseFloat(dropLng) : null,
            distanceKm: parseFloat(estimatedDistanceKm) || 3.5,
            estimatedMinutes: Math.round((parseFloat(estimatedDistanceKm) || 3.5) * 5 + 10),
          }
        }
      },
      include: {
        deliveryRoute: true
      }
    });

    // Notify online riders via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('new_delivery_job', {
        jobId: newOrder.deliveryRoute?.id,
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        pincode,
        fee: finalFeePaise / 100
      });
    }

    res.status(201).json({
      success: true,
      message: 'P2P Delivery requested successfully. Finding nearest delivery partner.',
      order: newOrder,
      jobId: newOrder.deliveryRoute?.id
    });
  } catch (error) {
    next(error);
  }
};

// autoCreateShopDelivery: Creates DeliveryRoute during checkout
const autoCreateShopDelivery = async (orderId, shopLat, shopLng, dropLat, dropLng, distanceKm) => {
  try {
    return await prisma.deliveryRoute.create({
      data: {
        orderId,
        status: 'PENDING',
        pickupLatitude: shopLat,
        pickupLongitude: shopLng,
        dropLatitude: dropLat,
        dropLongitude: dropLng,
        distanceKm: distanceKm || 3.0,
        estimatedMinutes: Math.round((distanceKm || 3.0) * 5 + 10)
      }
    });
  } catch (e) {
    console.error('Failed to create delivery route:', e);
    return null;
  }
};

/**
 * Get active/pending delivery jobs in pincode
 */
const getJobs = async (req, res, next) => {
  try {
    const { pincode } = req.query;
    const routes = await prisma.deliveryRoute.findMany({
      where: { status: 'PENDING' },
      include: {
        order: {
          include: {
            shop: { select: { name: true, addressLine1: true, locality: true, pincode: true } },
            deliveryAddress: true,
            user: { select: { name: true, phone: true } }
          }
        }
      }
    });

    const filtered = pincode 
      ? routes.filter(r => r.order?.shop?.pincode === pincode || r.order?.deliveryAddress?.pincode === pincode)
      : routes;

    res.json({ success: true, data: filtered });
  } catch (error) {
    next(error);
  }
};

/**
 * Accept a delivery job (First come, first serve)
 */
const acceptJob = async (req, res, next) => {
  try {
    const { jobId } = req.params; // jobId is DeliveryRoute.id
    const userId = req.user.id;

    const result = await prisma.$transaction(async (tx) => {
      const route = await tx.deliveryRoute.findUnique({ where: { id: jobId } });
      if (!route || route.status !== 'PENDING') {
        throw { status: 400, message: 'This job has already been accepted or is no longer available.' };
      }

      const updatedRoute = await tx.deliveryRoute.update({
        where: { id: jobId },
        data: { status: 'ASSIGNED', runnerId: userId }
      });

      await tx.order.update({
        where: { id: route.orderId },
        data: { status: 'OUT_FOR_DELIVERY' }
      });

      return updatedRoute;
    });

    res.json({ success: true, message: 'You have accepted the delivery job!', data: result });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
};

/**
 * Complete Delivery
 */
const completeJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { otp, lat, lng } = req.body;
    const userId = req.user.id;

    const result = await prisma.$transaction(async (tx) => {
      const route = await tx.deliveryRoute.findUnique({ 
          where: { id: jobId },
          include: { order: true } 
      });
      
      // Strict State Machine: Must be in transit to be delivered
      if (!route || route.runnerId !== userId || route.status !== 'IN_TRANSIT') {
        throw { status: 400, message: 'Job must be marked IN_TRANSIT before it can be delivered.' };
      }

      // Geo-Fencing Placeholder
      if (!lat || !lng) {
        throw { status: 400, message: 'Delivery location telemetry is required to complete trip.' };
      }

      // OTP Verification Enforcement (Phase 57)
      if (!otp || otp.toString().length !== 4) {
        throw { status: 403, message: 'A valid 4-digit Delivery OTP is required to complete this order.' };
      }
      
      // If we had OTP stored in DB:
      // if (otp !== route.order.delivery_otp) throw { status: 403, message: 'Invalid OTP' };
      
      const updatedRoute = await tx.deliveryRoute.update({
        where: { id: jobId },
        data: { status: 'DELIVERED', deliveredAt: new Date() }
      });

      await tx.order.update({
        where: { id: route.orderId },
        data: { status: 'DELIVERED', deliveredAt: new Date() }
      });
      
      // Update Agent Profile Delivery Count safely
      try {
        await tx.deliveryAgentProfile.upsert({
          where: { userId },
          create: { userId, totalDeliveries: 1, isAvailable: true },
          update: { totalDeliveries: { increment: 1 } }
        });
      } catch (agentErr) {
        console.warn('Could not update agent profile stats:', agentErr.message);
      }

      return updatedRoute;
    });

    res.json({
      success: true,
      message: `Delivery completed successfully!`,
      data: result
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
};

/**
 * Get Agent's accepted jobs
 */
const getMyJobs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const jobs = await prisma.deliveryRoute.findMany({
      where: { runnerId: userId, status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] } },
      include: {
        order: {
          include: {
            shop: { select: { name: true, addressLine1: true, locality: true } },
            deliveryAddress: true,
            user: { select: { name: true, phone: true } }
          }
        }
      }
    });
    res.json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit KYC details for Driver Onboarding
 */
const onboarding = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { vehicleNumber, dlNumber, aadharNumber, profileImage, dlImage, rcImage } = req.body;
        
        await prisma.deliveryAgentProfile.upsert({
            where: { userId: userId },
            update: {
                vehicleNumber,
                licenseNumber: dlNumber,
                isKycVerified: false
            },
            create: {
                userId,
                vehicleNumber,
                licenseNumber: dlNumber,
                isKycVerified: false
            }
        });
        
        // Mark user role
        await prisma.user.update({
            where: { id: userId },
            data: { role: 'DELIVERY' }
        });
        
        res.status(200).json({
            success: true,
            message: 'KYC Application submitted successfully.'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Fetch Delivery Analytics
 */
const getAnalytics = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const agent = await prisma.deliveryAgentProfile.findUnique({ where: { userId } });
        
        if (!agent) {
            return res.status(404).json({ error: 'Driver profile not found' });
        }
        
        res.json({
            success: true,
            data: {
                wallet: { balance: 0, total_earned: 0 },
                todayAnalytics: { total_deliveries: agent.totalDeliveries, total_earnings: 0 },
                transactions: []
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
  calculateDeliveryFee,
  requestDelivery,
  getJobs,
  acceptJob,
  completeJob,
  getMyJobs,
  autoCreateShopDelivery,
  onboarding,
  getAnalytics
};
