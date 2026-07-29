/**
 * Auth Middleware Unit Tests
 * Tests all RBAC middleware functions: authenticate, requireAdmin, requireRole,
 * hasAccess, enforceMultiTenancy, requireTerritory, requireAreaAgent
 */
const jwt = require('jsonwebtoken');
const {
  authenticate,
  optionalAuth,
  requireAdmin,
  requireRole,
  requireTerritory,
  requireAreaAgent,
  hasAccess,
  enforceMultiTenancy,
  generateTokens,
  ROLES
} = require('../../middleware/auth.middleware');

// Mock database
jest.mock('../../config/database', () => ({
  queryOne: jest.fn(),
  query: jest.fn(),
}));

const { queryOne } = require('../../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-localsampark-2026';

function mockReqResNext() {
  const req = { headers: {}, params: {}, body: {}, query: {} };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-localsampark-2026';
  });

  // ─── authenticate ─────────────────────────────────────────
  describe('authenticate()', () => {
    it('should reject request with no Authorization header', async () => {
      const { req, res, next } = mockReqResNext();
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. No token provided.' });
    });

    it('should reject request with malformed Authorization header', async () => {
      const { req, res, next } = mockReqResNext();
      req.headers.authorization = 'InvalidFormat token123';
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should reject expired token', async () => {
      const { req, res, next } = mockReqResNext();
      const expiredToken = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: '0s' });
      req.headers.authorization = `Bearer ${expiredToken}`;
      
      // Wait a tick for the token to expire
      await new Promise(r => setTimeout(r, 10));
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token expired. Please refresh.' });
    });

    it('should reject token signed with wrong secret', async () => {
      const { req, res, next } = mockReqResNext();
      const tamperedToken = jwt.sign({ userId: 1 }, 'wrong-secret', { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${tamperedToken}`;
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token.' });
    });

    it('should reject if user not found in database', async () => {
      const { req, res, next } = mockReqResNext();
      const token = jwt.sign({ userId: 999 }, JWT_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;
      queryOne.mockResolvedValue(null);
      
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found.' });
    });

    it('should reject deactivated user', async () => {
      const { req, res, next } = mockReqResNext();
      const token = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;
      queryOne.mockResolvedValue({ id: 1, role: 'user', is_active: false });

      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account is deactivated.' });
    });

    it('should authenticate valid token and set req.user', async () => {
      const { req, res, next } = mockReqResNext();
      const token = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;
      const mockUser = { id: 1, phone_number: '9999900001', role: 'user', is_active: true };
      queryOne.mockResolvedValue(mockUser);

      await authenticate(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual(mockUser);
    });
  });

  // ─── optionalAuth ─────────────────────────────────────────
  describe('optionalAuth()', () => {
    it('should proceed with null user when no token provided', async () => {
      const { req, res, next } = mockReqResNext();
      await optionalAuth(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should set user when valid token provided', async () => {
      const { req, res, next } = mockReqResNext();
      const token = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${token}`;
      queryOne.mockResolvedValue({ id: 1, role: 'user' });

      await optionalAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual({ id: 1, role: 'user' });
    });

    it('should proceed with null user on invalid token', async () => {
      const { req, res, next } = mockReqResNext();
      req.headers.authorization = 'Bearer invalid-token';
      await optionalAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeNull();
    });
  });

  // ─── requireAdmin ─────────────────────────────────────────
  describe('requireAdmin()', () => {
    it('should reject unauthenticated request', async () => {
      const { req, res, next } = mockReqResNext();
      await requireAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should grant access to admin role from admin_roles table', async () => {
      const { req, res, next } = mockReqResNext();
      req.user = { id: 5, role: 'user' };
      queryOne.mockResolvedValue({ id: 1, role: 'admin', region_id: null, permissions: '{"all": true}' });

      await requireAdmin(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.adminRole.role).toBe('admin');
    });

    it('should fallback to user.role if admin_roles table fails', async () => {
      const { req, res, next } = mockReqResNext();
      req.user = { id: 5, role: 'super_admin' };
      queryOne.mockRejectedValue(new Error('Table not found'));

      await requireAdmin(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.adminRole.role).toBe('super_admin');
    });

    it('should reject non-admin user', async () => {
      const { req, res, next } = mockReqResNext();
      req.user = { id: 1, role: 'user' };
      queryOne.mockResolvedValue(null);

      await requireAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ─── requireRole ──────────────────────────────────────────
  describe('requireRole()', () => {
    it('should allow matching role', () => {
      const middleware = requireRole('admin', 'territory_admin');
      const { req, res, next } = mockReqResNext();
      req.adminRole = { role: 'admin' };

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should always allow super_admin', () => {
      const middleware = requireRole('territory_admin');
      const { req, res, next } = mockReqResNext();
      req.adminRole = { role: 'super_admin' };

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should reject non-matching role', () => {
      const middleware = requireRole('super_admin');
      const { req, res, next } = mockReqResNext();
      req.adminRole = { role: 'territory_admin' };

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ─── hasAccess ────────────────────────────────────────────
  describe('hasAccess()', () => {
    it.each([
      [ROLES.SUPER_ADMIN, [ROLES.SHOP_OWNER], true],
      [ROLES.ADMIN, [ROLES.SHOP_OWNER], true],
      [ROLES.SHOP_OWNER, [ROLES.SHOP_OWNER, ROLES.DELIVERY_AGENT], true],
      [ROLES.USER, [ROLES.SHOP_OWNER], false],
      [ROLES.DELIVERY_AGENT, [ROLES.SHOP_OWNER], false],
    ])('role=%s with allowedRoles=%j should %s', (role, allowed, shouldPass) => {
      const middleware = hasAccess(allowed);
      const { req, res, next } = mockReqResNext();
      req.user = { role };

      middleware(req, res, next);
      if (shouldPass) {
        expect(next).toHaveBeenCalled();
      } else {
        expect(res.status).toHaveBeenCalledWith(403);
      }
    });

    it('should return 401 when no user present', () => {
      const middleware = hasAccess([ROLES.USER]);
      const { req, res, next } = mockReqResNext();
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ─── requireTerritory ─────────────────────────────────────
  describe('requireTerritory()', () => {
    it.each(['territory_admin', 'area_agent', 'admin', 'super_admin'])(
      'should allow %s',
      (role) => {
        const { req, res, next } = mockReqResNext();
        req.user = { role };
        requireTerritory(req, res, next);
        expect(next).toHaveBeenCalled();
      }
    );

    it('should reject regular user', () => {
      const { req, res, next } = mockReqResNext();
      req.user = { role: 'user' };
      requireTerritory(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ─── requireAreaAgent ─────────────────────────────────────
  describe('requireAreaAgent()', () => {
    it.each(['area_agent', 'admin', 'super_admin'])(
      'should allow %s',
      (role) => {
        const { req, res, next } = mockReqResNext();
        req.user = { role };
        requireAreaAgent(req, res, next);
        expect(next).toHaveBeenCalled();
      }
    );

    it('should reject territory_admin', () => {
      const { req, res, next } = mockReqResNext();
      req.user = { role: 'territory_admin' };
      requireAreaAgent(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ─── generateTokens ──────────────────────────────────────
  describe('generateTokens()', () => {
    it('should return both access and refresh tokens', () => {
      const tokens = generateTokens(1);
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    it('should create valid decodable tokens', () => {
      const tokens = generateTokens(42);
      const decoded = jwt.verify(tokens.accessToken, JWT_SECRET);
      expect(decoded.userId).toBe(42);
    });
  });

  // ─── enforceMultiTenancy ──────────────────────────────────
  describe('enforceMultiTenancy()', () => {
    it('should allow admin to bypass tenant check', async () => {
      const { req, res, next } = mockReqResNext();
      req.user = { id: 5, role: ROLES.SUPER_ADMIN };
      await enforceMultiTenancy(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should inject shopId for shop_owner', async () => {
      const { req, res, next } = mockReqResNext();
      req.user = { id: 2, role: ROLES.SHOP_OWNER };
      queryOne.mockResolvedValue({ id: 100, crm_tier: 'pro', is_locked: false });

      await enforceMultiTenancy(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.shopId).toBe(100);
      expect(req.crmTier).toBe('pro');
    });

    it('should reject shop_owner if shop is locked', async () => {
      const { req, res, next } = mockReqResNext();
      req.user = { id: 2, role: ROLES.SHOP_OWNER };
      queryOne.mockResolvedValue({ id: 100, crm_tier: 'free', is_locked: true });

      await enforceMultiTenancy(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Shop is locked due to billing or policy violation' });
    });

    it('should reject tenant mismatch (shop_owner accessing another shop)', async () => {
      const { req, res, next } = mockReqResNext();
      req.user = { id: 2, role: ROLES.SHOP_OWNER };
      req.params.shopId = 999;
      queryOne.mockResolvedValue({ id: 100, crm_tier: 'free', is_locked: false });

      await enforceMultiTenancy(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Tenant Mismatch: Access Denied' });
    });

    it('should reject regular user from CRM routes', async () => {
      const { req, res, next } = mockReqResNext();
      req.user = { id: 1, role: ROLES.USER };
      await enforceMultiTenancy(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
