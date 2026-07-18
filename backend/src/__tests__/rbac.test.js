const { hasAccess, ROLES } = require('../middleware/auth.middleware');

describe('RBAC Middleware (hasAccess)', () => {
  it('should allow access if user role is in the allowed roles', () => {
    const middleware = hasAccess([ROLES.SUPER_ADMIN, ROLES.SHOP_OWNER]);
    
    const req = { user: { role: ROLES.SUPER_ADMIN } };
    const res = {};
    const next = jest.fn();

    middleware(req, res, next);
    
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should block access if user role is not allowed', () => {
    const middleware = hasAccess([ROLES.SUPER_ADMIN]);
    
    const req = { user: { role: ROLES.USER } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    middleware(req, res, next);
    
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Forbidden: Insufficient permissions' });
  });
});
