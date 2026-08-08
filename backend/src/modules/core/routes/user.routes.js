const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate } = require('../../../../middleware/auth.middleware');

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.put('/me', authenticate, async (req, res, next) => {
  try {
    // Note: languagePreference and bio were removed in the Postgres migration.
    const { fullName, name, email, avatarUrl, regionId } = req.body;
    
    const user = await prisma.user.update({
        where: { id: req.user.id },
        data: {
            name: name || fullName || undefined,
            email: email || undefined,
            avatarUrl: avatarUrl || undefined,
            regionId: regionId || undefined
        }
    });
    
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.get('/me/wallet', authenticate, async (req, res, next) => {
  try {
    // Wallet tables removed in Postgres migration. Returning stub.
    res.json({ wallet: { balance: 0 }, transactions: [] });
  } catch (error) {
    next(error);
  }
});

router.get('/me/points', authenticate, async (req, res, next) => {
  try {
    // Points tables removed in Postgres migration. Returning stub.
    res.json({ points: [], balance: 0 });
  } catch (error) {
    next(error);
  }
});

router.get('/me/documents', authenticate, async (req, res, next) => {
  try {
    // Documents tables removed in Postgres migration. Returning stub.
    res.json([]);
  } catch (error) {
    next(error);
  }
});

router.post('/me/documents', authenticate, async (req, res, next) => {
  try {
    // Documents tables removed in Postgres migration. Returning stub.
    res.status(501).json({ error: 'Document upload temporarily disabled during database migration.' });
  } catch (error) {
    next(error);
  }
});

// GET user recommendations (Gig jobs & property matches)
router.get('/me/recommendations', authenticate, async (req, res, next) => {
  try {
    // Job vacancies and property listings tables removed in Postgres migration. Returning stub.
    res.json({
      jobs: [],
      properties: []
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
