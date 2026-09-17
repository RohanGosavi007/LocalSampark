const { query, queryMany, queryOne } = require('../../../config/database');
const { v4: uuidv4 } = require('uuid');

const scheduleAudit = async (req, res, next) => {
    try {
        const societyId = await getSocietyIdForUser(req.user.id, req);
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
        const societyId = await getSocietyIdForUser(req.user.id, req);
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

/**
 * The society for this request comes from req.societyId, set by
 * requireCapability after it has verified the caller holds the capability *in
 * that society*.
 *
 * Each of these controllers used to carry its own copy of this helper, which
 * returned the caller's first active membership with no ordering. The guard in
 * front validated a different id — the one the request named — so the society
 * that was authorised and the society that was written to were resolved
 * independently. For a committee member who also lives elsewhere that is a
 * privilege escalation.
 */
async function getSocietyIdForUser(userId, req) {
  if (req && req.societyId) return req.societyId;
  // No resolved society means the guard did not run. Refusing is the only safe
  // answer; guessing a membership is the behaviour being removed.
  return null;
}

module.exports = {
    scheduleAudit,
    getAudits,
    completeAudit
};
