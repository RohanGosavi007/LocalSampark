const { query, queryOne } = require('../../../config/database.sqlite');
const { v4: uuidv4 } = require('uuid');
const msg91 = require('./msg91.service');
const whatsapp = require('./whatsapp.service');
// Mock FCM
const sendPushNotification = async (userId, payload) => {
    console.log(`[FCM] Sending push to user ${userId}:`, payload.title);
    return true;
};

class NotificationFallbackService {
    async sendApprovalRequest(visitorId, societyId, residentId, visitorName, flatNumber) {
        // Step 1: FCM Push Notification
        console.log(`[Fallback] Step 1: FCM Push to Resident ${residentId}`);
        await sendPushNotification(residentId, {
            title: 'Visitor at Gate',
            body: `${visitorName} is at the gate for flat ${flatNumber}. Approve or Deny?`,
            data: { visitorId, type: 'approval_request' }
        });

        // Set timeout for step 2 (In a real system, this would be a delayed task queue like BullMQ)
        setTimeout(() => this.triggerTier2(visitorId, societyId, residentId, visitorName), 60000);
    }

    async triggerTier2(visitorId, societyId, residentId, visitorName) {
        // Check if already approved/denied
        const visitor = await queryOne('SELECT status FROM society_visitors WHERE id = ?', [visitorId]);
        if (visitor && visitor.status !== 'waiting') return;

        console.log(`[Fallback] Step 2: WhatsApp to Resident ${residentId}`);
        const member = await queryOne('SELECT phone FROM users WHERE id = ?', [residentId]);
        
        if (member && member.phone) {
            await whatsapp.sendTemplateMessage(member.phone, 'visitor_approval_req', { visitorName });
            
            // Set timeout for step 3
            setTimeout(() => this.triggerTier3(visitorId, societyId, member.phone, visitorName), 60000);
        }
    }

    async triggerTier3(visitorId, societyId, residentPhone, visitorName) {
        // Check if already approved/denied
        const visitor = await queryOne('SELECT status, ivr_fallback_triggered FROM society_visitors WHERE id = ?', [visitorId]);
        if (!visitor || visitor.status !== 'waiting' || visitor.ivr_fallback_triggered) return;

        console.log(`[Fallback] Step 3: IVR Call to Resident ${residentPhone}`);
        
        // Mark IVR triggered to prevent loops
        await query('UPDATE society_visitors SET ivr_fallback_triggered = 1 WHERE id = ?', [visitorId]);

        // Log IVR Call
        const ivrLogId = uuidv4();
        const callResult = await msg91.makeCall(residentPhone, 'visitor_approval_flow', { visitor: visitorName });
        
        await query(
            'INSERT INTO society_ivr_logs (id, society_id, visitor_id, resident_phone, call_sid, call_status) VALUES (?, ?, ?, ?, ?, ?)',
            [ivrLogId, societyId, visitorId, residentPhone, callResult.call_id || null, callResult.success ? 'initiated' : 'failed']
        );
    }

    async handleIVRWebhook(req, res) {
        try {
            const { call_id, dtmf } = req.body;
            
            const log = await queryOne('SELECT * FROM society_ivr_logs WHERE call_sid = ?', [call_id]);
            if (!log) return res.status(404).send('Log not found');

            await query('UPDATE society_ivr_logs SET dtmf_response = ?, call_status = "completed" WHERE id = ?', [dtmf, log.id]);

            // 1 = Approve, 2 = Deny
            const newStatus = dtmf === '1' ? 'approved' : 'denied';
            await query('UPDATE society_visitors SET status = ? WHERE id = ?', [newStatus, log.visitor_id]);

            // Notify Guard
            console.log(`[FCM] Notify Guard: Visitor ${log.visitor_id} ${newStatus} via IVR`);

            res.send('OK');
        } catch (error) {
            res.status(500).send('Error handling webhook');
        }
    }
}

module.exports = new NotificationFallbackService();
