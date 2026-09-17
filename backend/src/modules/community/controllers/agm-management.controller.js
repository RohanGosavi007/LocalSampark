const { query, queryMany, queryOne } = require('../../../config/database');
const { v4: uuidv4 } = require('uuid');

const createAGM = async (req, res, next) => {
    try {
        const societyId = await getSocietyIdForUser(req.user.id, req);
        const { title, date, agenda, location, meetingLink } = req.body;
        
        const id = uuidv4();
        await query('INSERT INTO society_agm (id, society_id, title, meeting_date, agenda, location, meeting_link, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)',
            [id, societyId, title, date, agenda, location, meetingLink, 'scheduled']
        );
        res.status(201).json({ success: true, data: { id } });
    } catch (error) { next(error); }
};

const getAGMs = async (req, res, next) => {
    try {
        const societyId = await getSocietyIdForUser(req.user.id, req);
        const agms = await queryMany('SELECT * FROM society_agm WHERE society_id = $1 ORDER BY meeting_date DESC', [societyId]);
        res.json({ success: true, data: agms });
    } catch (error) { next(error); }
};

const addAGMResolution = async (req, res, next) => {
    try {
        const { agmId, title, description } = req.body;
        const id = uuidv4();
        await query('INSERT INTO society_agm_resolutions (id, agm_id, title, description, status) VALUES ($1, $2, $3, $4, $5)',
            [id, agmId, title, description, 'proposed']
        );
        res.status(201).json({ success: true, data: { id } });
    } catch (error) { next(error); }
};

const getAGMResolutions = async (req, res, next) => {
    try {
        const resolutions = await queryMany('SELECT * FROM society_agm_resolutions WHERE agm_id = $1', [req.params.agmId]);
        res.json({ success: true, data: resolutions });
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
    createAGM,
    getAGMs,
    addAGMResolution,
    getAGMResolutions
};
