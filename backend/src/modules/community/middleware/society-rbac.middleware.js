const { queryOne } = require('../../../config/database');

const requireSocietyPermission = (permission) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;
            const societyId = req.body.societyId || req.query.societyId || req.params.societyId;

            if (!societyId) {
                return res.status(400).json({ error: 'societyId is required to verify permissions' });
            }

            const adminRole = await queryOne('SELECT * FROM society_admin_roles WHERE user_id = $1 AND society_id = $2 AND is_active = 1', 
                [userId, societyId]
            );

            if (!adminRole) {
                return res.status(403).json({ error: 'Access denied: Society admin role required' });
            }

            const perms = JSON.parse(adminRole.permissions || '{}');

            // If user has "all" or the specific permission, grant access
            if (perms['all'] === true || perms[permission] === true) {
                req.societyAdminRole = adminRole;
                return next();
            }

            return res.status(403).json({ error: `Access denied: Permission '${permission}' required` });
        } catch (error) {
            console.error('RBAC Error:', error);
            res.status(500).json({ error: 'Internal server error verifying permissions' });
        }
    };
};

module.exports = {
    requireSocietyPermission
};
