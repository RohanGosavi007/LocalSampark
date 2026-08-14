const { query, queryMany } = require('../../../config/database');
const { v4: uuidv4 } = require('uuid');

const registerAsset = async (req, res, next) => {
    try {
        const { societyId, assetName, assetType, location, purchaseCost, amcVendorId, amcEndDate } = req.body;
        const id = uuidv4();

        await query(`INSERT INTO society_assets 
            (id, society_id, asset_name, asset_type, location, purchase_cost, amc_vendor_id, amc_end_date) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [id, societyId, assetName, assetType, location, purchaseCost, amcVendorId, amcEndDate]
        );

        res.json({ success: true, message: 'Asset registered', data: { id } });
    } catch (error) { next(error); }
};

const logMaintenance = async (req, res, next) => {
    try {
        const { assetId, societyId, maintenanceType, description, cost, nextDue } = req.body;
        const adminId = req.user.id;
        const id = uuidv4();

        await query(`INSERT INTO society_asset_maintenance_log 
            (id, asset_id, society_id, maintenance_type, description, performed_by, cost, performed_at, next_due) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8)`,
            [id, assetId, societyId, maintenanceType, description, adminId, cost, nextDue]
        );

        // Update asset last serviced
        await query('UPDATE society_assets SET last_serviced_at = CURRENT_TIMESTAMP, next_service_due = $1 WHERE id = $2', [nextDue, assetId]);

        res.json({ success: true, message: 'Maintenance logged' });
    } catch (error) { next(error); }
};

const getAssets = async (req, res, next) => {
    try {
        const { societyId } = req.query;
        const assets = await queryMany('SELECT * FROM society_assets WHERE society_id = $1', [societyId]);
        res.json({ success: true, data: assets });
    } catch (error) { next(error); }
};

module.exports = {
    registerAsset,
    logMaintenance,
    getAssets
};
