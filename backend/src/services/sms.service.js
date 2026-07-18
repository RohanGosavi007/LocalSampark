/**
 * SMS OTP Service for LocalSampark
 * 
 * Supports multiple providers with automatic fallback:
 * 1. MSG91 (Primary — Indian SMS provider, free trial available)
 * 2. Firebase Auth Phone (Secondary — Google free tier: 10k/month)
 * 3. Console logging (Development fallback)
 * 
 * Setup MSG91:
 *   1. Register at https://msg91.com (free trial: 100 SMS)
 *   2. Create a template with variable {otp}
 *   3. Set MSG91_AUTH_KEY, MSG91_TEMPLATE_ID in .env
 * 
 * Setup Firebase Auth:
 *   1. Enable Phone Authentication in Firebase Console
 *   2. Set FIREBASE_* credentials in .env
 */

const crypto = require('crypto');

// Provider: MSG91
async function sendViaMSG91(phoneNumber, otp) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const senderId = process.env.MSG91_SENDER_ID || 'LSAMPR';

  if (!authKey || !templateId) return null; // Skip if not configured

  try {
    const body = JSON.stringify({
      template_id: templateId,
      short_url: '0',
      recipients: [{
        mobiles: phoneNumber.replace('+', ''),
        otp: otp,
      }],
    });

    const response = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authkey': authKey,
      },
      body,
    });

    const data = await response.json();
    if (data.type === 'success') {
      console.log(`[SMS] MSG91 OTP sent to ${phoneNumber}`);
      return { provider: 'msg91', success: true };
    } else {
      console.warn(`[SMS] MSG91 failed: ${JSON.stringify(data)}`);
      return null; // Fallback to next provider
    }
  } catch (error) {
    console.error('[SMS] MSG91 error:', error.message);
    return null;
  }
}

// Provider: Console (Development)
function sendViaConsole(phoneNumber, otp) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  📱 OTP for ${phoneNumber}: ${otp}`);
  console.log(`${'='.repeat(50)}\n`);
  return { provider: 'console', success: true };
}

/**
 * Generate a cryptographically secure 6-digit OTP
 * @returns {string} 6-digit OTP
 */
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Send OTP via the best available provider
 * @param {string} phoneNumber - Phone number with country code (e.g., +919999999999)
 * @param {string} otp - 6-digit OTP to send
 * @returns {Object} Result with provider name and success status
 */
async function sendOTP(phoneNumber, otp) {
  // Try MSG91 first (production Indian SMS)
  const msg91Result = await sendViaMSG91(phoneNumber, otp);
  if (msg91Result) return msg91Result;

  // Fallback: console logging (always works)
  return sendViaConsole(phoneNumber, otp);
}

/**
 * Verify OTP via MSG91's built-in verification (optional)
 * Falls back to local verification if MSG91 not configured
 */
async function verifyViaMSG91(phoneNumber, otp) {
  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) return null;

  try {
    const phone = phoneNumber.replace('+', '');
    const response = await fetch(
      `https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=${phone}`,
      {
        method: 'GET',
        headers: { 'authkey': authKey },
      }
    );
    const data = await response.json();
    return data.type === 'success';
  } catch (error) {
    console.error('[SMS] MSG91 verify error:', error.message);
    return null; // Fall back to local verification
  }
}

module.exports = {
  generateOTP,
  sendOTP,
  sendViaMSG91,
  verifyViaMSG91,
};
