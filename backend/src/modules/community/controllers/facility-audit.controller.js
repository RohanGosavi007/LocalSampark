const { query, queryMany, queryOne } = require('../../../config/database');
const { v4: uuidv4 } = require('uuid');

const scheduleAudit = async (req, res, next) => {
    try {
        const societyId = await getSocietyIdForUser(req.user.id);
        const { auditType, scheduledDate, assignedTo } = req.body; // e.g. 'fire_safety', 'structural'
        
        const id = uuidv4();
        await query('INSERT INTO society_audits (id, society_id, audit_type, scheduled_date, assigned_to, status) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, societyId, auditType, scheduledDate, assignedTo, 'pending']
        );
        res.status(201).json({ success: true, data: { id } });
    } catch (error) { next(error); }
};

const getAudits = async (req, res, next) => {
    try {
        const societyId = await getSocietyIdForUser(req.user.id);
        const audits = await queryMany('SELECT * FROM society_audits WHERE society_id = $1 ORDER BY scheduled_date ASC', [societyId]);
        res.json({ success: true, data: audits });
    } catch (error) { next(error); }
};

const completeAudit = async (req, res, next) => {
    try {
        const { auditId, remarks, isCompliant, certificateUrl } = req.body;
        await query('UPDATE society_audits SET status = $1, remarks = $2, is_compliant = $3, certificate_url = $4, completed_at = CURRENT_TIMESTAMP WHERE id = $5',
            ['completed', remarks, isCompliant ? 1 : 0, certificateUrl || '', auditId]
        );
        res.json({ success: true, message: 'Audit completed' });
    } catch (error) { next(error); }
};

async function getSocietyIdForUser(userId) {
    const member = await queryOne('SELECT society_id FROM society_members WHERE user_id = $1 AND is_active = 1', [userId]);
    return member ? member.society_id : null;
}

module.exports = {
    scheduleAudit,
    getAudits,
    completeAudit
};
