const crypto = require('crypto');
const prisma = require('../../../config/prisma');

exports.getListings = async (req, res, next) => {
  try {
    const listings = await prisma.adminKrishiListing.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: listings });
  } catch (error) {
    next(error);
  }
};

exports.createListing = async (req, res, next) => {
  try {
    const { title, description, price, type, auto_expire } = req.body;
    const adminId = req.user.id || req.user.userId;

    await prisma.adminKrishiListing.create({
      data: {
        title,
        description,
        price,
        type,
        autoExpire: auto_expire,
        adminId
      }
    });

    res.json({ success: true, message: 'Krishi listing published successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await prisma.adminKrishiListing.update({
      where: { id },
      data: { status }
    });
    res.json({ success: true, message: `Listing status updated to ${status}` });
  } catch (error) {
    next(error);
  }
};

exports.toggleVerification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { verified_farmer } = req.body;
    await prisma.adminKrishiListing.update({
      where: { id },
      data: { verifiedFarmer: verified_farmer }
    });
    res.json({ success: true, message: verified_farmer ? 'Farmer Verified' : 'Farmer Unverified' });
  } catch (error) {
    next(error);
  }
};
