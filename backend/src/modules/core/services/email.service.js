const nodemailer = require('nodemailer');

// ─── EMAIL TRANSPORTER ──────────────────────────────────────────
// Uses Gmail SMTP (free: 500 emails/day) or any SMTP provider
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '', // Use App Password for Gmail
  },
});

const FROM_ADDRESS = process.env.SMTP_FROM || 'LocalSampark <noreply@localsampark.in>';

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────

function getBaseTemplate(content, title) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f0f2f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 800; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .body h2 { color: #1e293b; font-size: 20px; margin: 0 0 16px; }
    .body p { color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
    .btn { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 16px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .info-label { color: #64748b; font-size: 13px; font-weight: 600; }
    .info-value { color: #1e293b; font-size: 14px; font-weight: 700; }
    .footer { background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { color: #94a3b8; font-size: 12px; margin: 4px 0; }
    .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 700; }
    .status-confirmed { background: #dcfce7; color: #16a34a; }
    .status-cancelled { background: #fee2e2; color: #dc2626; }
    .status-preparing { background: #fef3c7; color: #d97706; }
  </style>
</head>
<body>
  <div style="padding: 20px;">
    <div class="container">
      <div class="header">
        <h1>🏪 LocalSampark</h1>
        <p>Your HyperLocal Neighborhood Super-App</p>
      </div>
      <div class="body">
        ${content}
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} LocalSampark. All rights reserved.</p>
        <p>Connecting neighborhoods, one shop at a time 🤝</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── EMAIL SENDING FUNCTIONS ──────────────────────────────────────

/**
 * Send a generic email
 */
async function sendEmail(to, subject, htmlContent) {
  try {
    if (!process.env.SMTP_USER) {
      console.log(`[EMAIL] Would send to ${to}: ${subject}`);
      console.log(`[EMAIL] Content preview: ${htmlContent.substring(0, 200)}...`);
      return { success: true, mock: true };
    }

    const info = await transporter.sendMail({
      from: FROM_ADDRESS,
      to,
      subject: `${subject} | LocalSampark`,
      html: htmlContent,
    });

    console.log(`[EMAIL] Sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL] Failed to send to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Order confirmation email to customer
 */
async function sendOrderConfirmation(customer, order, shop) {
  const content = `
    <h2>Order Confirmed! 🎉</h2>
    <p>Hi ${customer.full_name || 'there'}, your order has been placed successfully.</p>
    
    <div class="info-card">
      <div class="info-row"><span class="info-label">Order ID</span><span class="info-value">#${order.id.slice(0, 8).toUpperCase()}</span></div>
      <div class="info-row"><span class="info-label">Shop</span><span class="info-value">${shop.name}</span></div>
      <div class="info-row"><span class="info-label">Total</span><span class="info-value">₹${order.total_amount}</span></div>
      <div class="info-row"><span class="info-label">Delivery</span><span class="info-value">${order.delivery_type === 'delivery' ? '🚴 Home Delivery' : '🏃 Self Pickup'}</span></div>
      <div class="info-row" style="border:none"><span class="info-label">Status</span><span class="status-badge status-confirmed">Confirmed</span></div>
    </div>
    
    <p>You'll receive updates as your order progresses.</p>
    <p style="text-align:center;margin-top:24px"><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/order-tracking/${order.id}" class="btn">Track Order</a></p>
  `;

  return sendEmail(customer.email, `Order #${order.id.slice(0, 8).toUpperCase()} Confirmed`, getBaseTemplate(content, 'Order Confirmed'));
}

/**
 * New order notification to shop owner
 */
async function sendNewOrderNotification(ownerEmail, order, customer) {
  const content = `
    <h2>New Order Received! 🔔</h2>
    <p>You have a new order from <strong>${customer.full_name || 'a customer'}</strong>.</p>
    
    <div class="info-card">
      <div class="info-row"><span class="info-label">Order ID</span><span class="info-value">#${order.id.slice(0, 8).toUpperCase()}</span></div>
      <div class="info-row"><span class="info-label">Amount</span><span class="info-value">₹${order.total_amount}</span></div>
      <div class="info-row"><span class="info-label">Items</span><span class="info-value">${order.item_count || 'Multiple'} items</span></div>
      <div class="info-row" style="border:none"><span class="info-label">Type</span><span class="info-value">${order.delivery_type === 'delivery' ? '🚴 Delivery' : '🏃 Pickup'}</span></div>
    </div>
    
    <p style="text-align:center;margin-top:24px"><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/shop-dashboard" class="btn">View in Dashboard</a></p>
  `;

  return sendEmail(ownerEmail, `New Order #${order.id.slice(0, 8).toUpperCase()}`, getBaseTemplate(content, 'New Order'));
}

/**
 * Appointment confirmation email to customer
 */
async function sendAppointmentConfirmation(customer, appointment, shop, service, staff) {
  const content = `
    <h2>Appointment Booked! 📅</h2>
    <p>Hi ${customer.full_name || 'there'}, your appointment has been confirmed.</p>
    
    <div class="info-card">
      <div class="info-row"><span class="info-label">Shop</span><span class="info-value">${shop.name}</span></div>
      <div class="info-row"><span class="info-label">Service</span><span class="info-value">${service?.name || 'N/A'}</span></div>
      <div class="info-row"><span class="info-label">With</span><span class="info-value">${staff?.name || 'Any Available'}</span></div>
      <div class="info-row"><span class="info-label">Date</span><span class="info-value">${appointment.appointment_date}</span></div>
      <div class="info-row"><span class="info-label">Time</span><span class="info-value">${appointment.time_slot}</span></div>
      <div class="info-row" style="border:none"><span class="info-label">Amount</span><span class="info-value">₹${appointment.final_price || appointment.price}</span></div>
    </div>
    
    <p>📍 <strong>Address:</strong> ${shop.address || 'Check shop page for directions'}</p>
    <p>💡 Please arrive 5 minutes before your scheduled time.</p>
  `;

  return sendEmail(customer.email, `Appointment Confirmed at ${shop.name}`, getBaseTemplate(content, 'Appointment Confirmed'));
}

/**
 * Dispute update notification
 */
async function sendDisputeUpdate(userEmail, dispute, status) {
  const statusMap = {
    open: { label: 'Received', class: 'status-confirmed' },
    under_review: { label: 'Under Review', class: 'status-preparing' },
    resolved: { label: 'Resolved', class: 'status-confirmed' },
    closed: { label: 'Closed', class: 'status-cancelled' },
  };
  const s = statusMap[status] || { label: status, class: 'status-preparing' };

  const content = `
    <h2>Dispute Update</h2>
    <p>Your dispute #${dispute.id.slice(0, 8).toUpperCase()} has been updated.</p>
    
    <div class="info-card">
      <div class="info-row"><span class="info-label">Category</span><span class="info-value">${dispute.category}</span></div>
      <div class="info-row"><span class="info-label">Status</span><span class="status-badge ${s.class}">${s.label}</span></div>
      ${dispute.resolution ? `<div class="info-row" style="border:none"><span class="info-label">Resolution</span><span class="info-value">${dispute.resolution}</span></div>` : ''}
    </div>
  `;

  return sendEmail(userEmail, `Dispute Update #${dispute.id.slice(0, 8).toUpperCase()}`, getBaseTemplate(content, 'Dispute Update'));
}

/**
 * Payout settled notification to shop owner
 */
async function sendPayoutNotification(ownerEmail, payout) {
  const content = `
    <h2>Payout Settled! 💰</h2>
    <p>Your payout for the period has been processed.</p>
    
    <div class="info-card">
      <div class="info-row"><span class="info-label">Period</span><span class="info-value">${payout.period_start} to ${payout.period_end}</span></div>
      <div class="info-row"><span class="info-label">Total Orders</span><span class="info-value">${payout.total_orders}</span></div>
      <div class="info-row"><span class="info-label">Gross Amount</span><span class="info-value">₹${payout.total_gross}</span></div>
      <div class="info-row"><span class="info-label">Commission</span><span class="info-value">-₹${payout.total_commission}</span></div>
      <div class="info-row" style="border:none"><span class="info-label">Net Payout</span><span class="info-value" style="color:#16a34a;font-size:18px">₹${payout.net_payout}</span></div>
    </div>
    
    ${payout.bank_reference ? `<p>Bank Reference: <strong>${payout.bank_reference}</strong></p>` : ''}
  `;

  return sendEmail(ownerEmail, 'Payout Settled', getBaseTemplate(content, 'Payout Settled'));
}

module.exports = {
  sendEmail,
  sendOrderConfirmation,
  sendNewOrderNotification,
  sendAppointmentConfirmation,
  sendDisputeUpdate,
  sendPayoutNotification,
};
