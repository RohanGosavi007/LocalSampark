const { query, queryMany, queryOne } = require('../../../config/database');
const { v4: uuidv4 } = require('uuid');

const createTopic = async (req, res, next) => {
    try {
        const authorId = req.user.id;
        const { societyId, title, content, category } = req.body;

        const id = uuidv4();
        await query(`INSERT INTO society_forum_topics 
            (id, society_id, author_id, title, content, category, is_pinned, is_locked, view_count, created_at) 
            VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 0, CURRENT_TIMESTAMP)`,
            [id, societyId, authorId, title, content, category || 'General']
        );

        res.status(201).json({ success: true, data: { id } });
    } catch (error) { next(error); }
};

const getTopics = async (req, res, next) => {
    try {
        const { societyId, category } = req.query;
        let sql = 'SELECT * FROM society_forum_topics WHERE society_id = $1';
        const params = [societyId];
        
        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }
        
        sql += ' ORDER BY is_pinned DESC, created_at DESC LIMIT 50';

        const topics = await queryMany(sql, params);
        res.json({ success: true, data: topics });
    } catch (error) { next(error); }
};

const replyToTopic = async (req, res, next) => {
    try {
        const authorId = req.user.id;
        const { topicId, content } = req.body;

        const topic = await queryOne('SELECT is_locked FROM society_forum_topics WHERE id = $1', [topicId]);
        if (topic?.is_locked) {
            return res.status(403).json({ error: 'This topic is locked.' });
        }

        const id = uuidv4();
        await query(`INSERT INTO society_forum_replies 
            (id, topic_id, author_id, content, created_at) 
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
            [id, topicId, authorId, content]
        );

        res.status(201).json({ success: true, data: { id } });
    } catch (error) { next(error); }
};

const pinTopic = async (req, res, next) => {
    try {
        const { topicId, isPinned } = req.body;
        await query('UPDATE society_forum_topics SET is_pinned = $1 WHERE id = $2', [isPinned ? 1 : 0, topicId]);
        res.json({ success: true, message: 'Topic pin status updated' });
    } catch (error) { next(error); }
};

const lockTopic = async (req, res, next) => {
    try {
        const { topicId, isLocked } = req.body;
        await query('UPDATE society_forum_topics SET is_locked = $1 WHERE id = $2', [isLocked ? 1 : 0, topicId]);
        res.json({ success: true, message: 'Topic lock status updated' });
    } catch (error) { next(error); }
};

module.exports = {
    createTopic,
    getTopics,
    replyToTopic,
    pinTopic,
    lockTopic
};
