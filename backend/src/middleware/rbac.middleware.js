/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces the Principle of Least Privilege across domain modules.
 */

const requirePermission = (domain, action) => {
    return (req, res, next) => {
        // If not authenticated or no adminRole, deny
        if (!req.user || !req.adminRole) {
            return res.status(403).json({ error: 'Admin access required.' });
        }

        // Super Admin bypass.
        //
        // Both sides are upper-cased before comparing. requireAdmin in
        // auth.middleware.js deliberately normalises req.adminRole.role to upper
        // case ("SUPER_ADMIN") so that admin.routes.js can compare against
        // 'SUPER_ADMIN' directly, so the literal lower-case comparison that used
        // to be here could never match an admin_roles grant. It went unnoticed
        // only because requireAdmin also sets permissions to {"all": true}, and
        // the permissions.all check below then let the request through. A real
        // super admin whose admin_roles row carries scoped permissions instead
        // of {"all": true} fell past both and got a 403 on every domain.
        const roleName = String(req.adminRole.role || req.user.role || '').toUpperCase();
        if (roleName === 'SUPER_ADMIN') {
            return next();
        }

        try {
            // Parse permissions. It defaults to {} if not provided.
            // Expected format: { "medical": ["read", "write"], "ecommerce": ["read"] }
            let permissions = {};
            
            if (typeof req.adminRole.permissions === 'string') {
                permissions = JSON.parse(req.adminRole.permissions);
            } else if (typeof req.adminRole.permissions === 'object') {
                permissions = req.adminRole.permissions;
            }

            // Global generic admin fallback check
            if (permissions.all === true) {
                return next();
            }

            // Default to zero permissions - deny if domain not found
            if (!permissions[domain]) {
                return res.status(403).json({ error: `Forbidden: Missing permissions for domain '${domain}'.` });
            }

            // If an action is specified, ensure it's in the array
            if (action && Array.isArray(permissions[domain])) {
                if (!permissions[domain].includes(action)) {
                    return res.status(403).json({ error: `Forbidden: Missing '${action}' permission for domain '${domain}'.` });
                }
            } else if (action && permissions[domain] !== action && permissions[domain] !== 'all') {
                 // if permissions[domain] is just a string (e.g. "read")
                 return res.status(403).json({ error: `Forbidden: Missing '${action}' permission for domain '${domain}'.` });
            }

            // Permission granted
            next();

        } catch (error) {
            console.error('RBAC Error parsing permissions:', error);
            // Default to zero permissions on parse error
            return res.status(403).json({ error: 'Forbidden: Invalid permissions format.' });
        }
    };
};

module.exports = {
    requirePermission
};
