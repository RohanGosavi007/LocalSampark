const { query, queryMany, queryOne } = require('../../../config/database');
const { v4: uuidv4 } = require('uuid');

const sendMessage = async (req, res, next) => {
    try {
        const senderId = req.user.id;
        const { receiverId, messageText, societyId } = req.body;
        
        if (!receiverId || !messageText) {
            return res.status(400).json({ error: 'Receiver ID and message text are required' });
        }

        const id = uuidv4();
        await query(`INSERT INTO society_messages 
            (id, society_id, sender_id, receiver_id, message_text, is_read, created_at) 
            VALUES ($1, $2, $3, $4, $5, 0, CURRENT_TIMESTAMP)`,
            [id, societyId, senderId, receiverId, messageText]
        );

        // Notify receiver
        const supabaseRealtime = req.app.get('supabaseRealtime');
        if (supabaseRealtime) {
            supabaseRealtime.broadcast(`user:${receiverId}`, 'society:message:new', { 
                id, senderId, messageText, timestamp: new Date().toISOString() 
            });
        }

        res.status(201).json({ success: true, message: 'Message sent', data: { id } });
    } catch (error) { next(error); }
};

const getConversations = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { societyId } = req.query;

        // Group by user we are chatting with
        const conversations = await queryMany(`
            SELECT 
                CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as other_user_id,
                MAX(created_at) as last_message_time,
                COUNT(CASE WHEN receiver_id = $2 AND is_read = 0 THEN 1 END) as unread_count
            FROM society_messages
            WHERE society_id = $3 AND (sender_id = $4 OR receiver_id = $5)
            GROUP BY other_user_id
            ORDER BY last_message_time DESC
        `, [userId, userId, societyId, userId, userId]);

        res.json({ success: true, data: conversations });
    } catch (error) { next(error); }
};

const getMessages = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { societyId, otherUserId } = req.query;

        const messages = await queryMany(`
            SELECT * FROM society_messages 
            WHERE society_id = $1 
            AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $4 AND receiver_id = $5))
            ORDER BY created_at ASC
        `, [societyId, userId, otherUserId, otherUserId, userId]);

        res.json({ success: true, data: messages });
    } catch (error) { next(error); }
};

const markRead = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { otherUserId } = req.body;

        await query(`UPDATE society_messages SET is_read = 1 
            WHERE receiver_id = $1 AND sender_id = $2`,
            [userId, otherUserId]
        );

        res.json({ success: true, message: 'Messages marked as read' });
    } catch (error) { next(error); }
};

module.exports = {
    sendMessage,
    getConversations,
    getMessages,
    markRead
};
