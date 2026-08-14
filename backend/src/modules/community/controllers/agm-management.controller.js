const { query, queryMany, queryOne } = require('../../../config/database');
const { v4: uuidv4 } = require('uuid');

const createAGM = async (req, res, next) => {
    try {
        const societyId = await getSocietyIdForUser(req.user.id);
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
        const societyId = await getSocietyIdForUser(req.user.id);
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

async function getSocietyIdForUser(userId) {
    const member = await queryOne('SELECT society_id FROM society_members WHERE user_id = $1 AND is_active = true', [userId]);
    return member ? member.society_id : null;
}

module.exports = {
    createAGM,
    getAGMs,
    addAGMResolution,
    getAGMResolutions
};
