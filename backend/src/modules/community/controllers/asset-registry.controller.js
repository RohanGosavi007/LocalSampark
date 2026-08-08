const { query, queryMany } = require('../../../config/database.sqlite');
const { v4: uuidv4 } = require('uuid');

const registerAsset = async (req, res) => {
    try {
        const { societyId, assetName, assetType, location, purchaseCost, amcVendorId, amcEndDate } = req.body;
        const id = uuidv4();

        await query(
            `INSERT INTO society_assets 
            (id, society_id, asset_name, asset_type, location, purchase_cost, amc_vendor_id, amc_end_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, societyId, assetName, assetType, location, purchaseCost, amcVendorId, amcEndDate]
        );

        res.json({ success: true, message: 'Asset registered', data: { id } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const logMaintenance = async (req, res) => {
    try {
        const { assetId, societyId, maintenanceType, description, cost, nextDue } = req.body;
        const adminId = req.user.id;
        const id = uuidv4();

        await query(
            `INSERT INTO society_asset_maintenance_log 
            (id, asset_id, society_id, maintenance_type, description, performed_by, cost, performed_at, next_due) 
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
            [id, assetId, societyId, maintenanceType, description, adminId, cost, nextDue]
        );

        // Update asset last serviced
        await query('UPDATE society_assets SET last_serviced_at = CURRENT_TIMESTAMP, next_service_due = ? WHERE id = ?', [nextDue, assetId]);

        res.json({ success: true, message: 'Maintenance logged' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getAssets = async (req, res) => {
    try {
        const { societyId } = req.query;
        const assets = await queryMany('SELECT * FROM society_assets WHERE society_id = ?', [societyId]);
        res.json({ success: true, data: assets });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    registerAsset,
    logMaintenance,
    getAssets
};
