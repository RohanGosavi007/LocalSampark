const { query, queryOne } = require('../../../config/database');

// Note: In actual implementation, this might use Prisma and PostgreSQL for the SaaS tenant DB
// For this society module isolation, we mock it using SQLite or assume it's part of the main E-Commerce tenant settings.

const toggleSocietyModule = async (req, res, next) => {
    try {
        const { tenantId, isEnabled } = req.body;
        // Check if user is superadmin or tenant owner
        // Mock authorization
        if (req.user.role !== 'tenant_owner' && req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Unauthorized to change module settings' });
        }

        // Mocking the tenant settings update
        // await prisma.tenant.update({ where: { id: tenantId }, data: { societyModuleEnabled: isEnabled }});
        
        console.log(`[TenantManager] Society Module for tenant ${tenantId} set to ${isEnabled}`);
        
        res.json({ success: true, message: `Society module ${isEnabled ? 'enabled' : 'disabled'}` });
    } catch (error) { next(error); }
};

const getModuleStatus = async (req, res, next) => {
    try {
        const { tenantId } = req.query;
        // Mock DB fetch
        // const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }});
        // const isEnabled = tenant.societyModuleEnabled;
        
        const isEnabled = true; // Mock true for now
        
        res.json({ success: true, data: { isSocietyModuleEnabled: isEnabled } });
    } catch (error) { next(error); }
};

module.exports = {
    toggleSocietyModule,
    getModuleStatus
};
