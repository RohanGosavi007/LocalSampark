const cron = require('node-cron');
const { query, queryMany } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Mock FCM
const sendPushNotification = async (userId, payload) => {
    console.log(`[FCM Alert] Sending push to ${userId}:`, payload.title);
};

const logComplaintActivity = async (complaintId, action, performedBy, notes) => {
    await query(
      'INSERT INTO society_complaint_activity (id, complaint_id, action, performed_by, notes, created_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
      [uuidv4(), complaintId, action, performedBy, notes || '']
    );
};

// Run every 30 minutes
cron.schedule('*/30 * * * *', async () => {
    console.log('[Job] Running Complaint Escalation Job...');
    try {
        // Fetch all open/assigned/in-progress complaints
        const activeComplaints = await queryMany(`
            SELECT * FROM society_complaints 
            WHERE status IN ('open', 'assigned', 'in_progress', 'reopened')
        `);

        for (const complaint of activeComplaints) {
            // Calculate SLA based on priority
            let slaHours = 48; // default medium
            if (complaint.priority === 'critical') slaHours = 2;
            else if (complaint.priority === 'high') slaHours = 12;
            else if (complaint.priority === 'low') slaHours = 96;
            
            const createdTime = new Date(complaint.created_at).getTime();
            const now = Date.now();
            const elapsedHours = (now - createdTime) / (1000 * 60 * 60);

            const percentage = (elapsedHours / slaHours) * 100;
            let currentLevel = complaint.escalation_level || 0;
            
            let newLevel = currentLevel;
            let notifyRoles = [];

            if (percentage >= 100 && currentLevel < 3) {
                newLevel = 3;
                notifyRoles = ['admin']; // Chairman/Secretary
            } else if (percentage >= 75 && currentLevel < 2) {
                newLevel = 2;
                notifyRoles = ['admin']; // Facility Manager
            } else if (percentage >= 50 && currentLevel < 1) {
                newLevel = 1;
                notifyRoles = ['assigned']; // The assigned person
            }

            if (newLevel > currentLevel) {
                // Escalate
                await query('UPDATE society_complaints SET escalation_level = $1 WHERE id = $2', [newLevel, complaint.id]);
                await logComplaintActivity(complaint.id, 'escalated', 'SYSTEM', `Escalated to Level ${newLevel}`);

                console.log(`[Escalation] Complaint ${complaint.id} escalated to Level ${newLevel}`);
                
                // Notify logic (Mock)
                if (notifyRoles.includes('assigned') && complaint.assigned_to) {
                    await sendPushNotification(complaint.assigned_to, { title: 'SLA Warning', body: `Complaint "${complaint.title}" is approaching its SLA.` });
                }
                
                if (notifyRoles.includes('admin')) {
                    const admins = await queryMany('SELECT user_id FROM society_admin_roles WHERE society_id = $1 AND is_active = true', [complaint.society_id]);
                    for (const admin of admins) {
                        await sendPushNotification(admin.user_id, { title: `SLA Breach L${newLevel}`, body: `Complaint "${complaint.title}" has breached SLA.` });
                    }
                }
            }
        }
    } catch (error) {
        console.error('[Job Error] Complaint escalation failed:', error);
    }
});
