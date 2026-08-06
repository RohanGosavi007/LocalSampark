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

// requestDelivery: P2P delivery is disabled for Phase 3 Prisma Schema
const requestDelivery = async (req, res, next) => {
  res.status(501).json({ success: false, error: 'Manual P2P delivery is currently disabled for Phase 3.' });
};

// autoCreateShopDelivery: Deprecated in Phase 3. unified-superapp.controller.js directly creates DeliveryRoute.
const autoCreateShopDelivery = async () => {
    console.warn('autoCreateShopDelivery is deprecated. DeliveryRoute is created directly during checkout.');
    return null;
}

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
    const { otp } = req.body; // Phase 3: Add OTP verification logic later if schema supports tracking_otp
    const userId = req.user.id;

    const result = await prisma.$transaction(async (tx) => {
      const route = await tx.deliveryRoute.findUnique({ 
          where: { id: jobId },
          include: { order: true } 
      });
      
      if (!route || route.runnerId !== userId || !['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(route.status)) {
        throw { status: 400, message: 'Invalid job or already completed.' };
      }
      
      const updatedRoute = await tx.deliveryRoute.update({
        where: { id: jobId },
        data: { status: 'DELIVERED', deliveredAt: new Date() }
      });

      await tx.order.update({
        where: { id: route.orderId },
        data: { status: 'DELIVERED', deliveredAt: new Date() }
      });
      
      // Update Agent Profile Delivery Count
      await tx.deliveryAgentProfile.update({
          where: { userId },
          data: { totalDeliveries: { increment: 1 } }
      });

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
