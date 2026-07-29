const logger = require('../config/logger');
const https = require('https');

/**
 * Unified SMS & OTP Service (MSG91 + Firebase + Dev Sandbox)
 */
const OtpService = {
  /**
   * Send OTP via MSG91 API (India standard) or Fallback to Sandbox
   */
  async sendOtp(mobileNumber, otpCode) {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;

    // Remove any spaces or special chars, ensure standard country format
    const formattedMobile = mobileNumber.replace(/\D/g, '');

    if (authKey && templateId) {
      try {
        const postData = JSON.stringify({
          template_id: templateId,
          mobile: formattedMobile,
          otp: otpCode
        });

        const options = {
          hostname: 'control.msg91.com',
          port: 443,
          path: '/api/v5/otp',
          method: 'POST',
          headers: {
            'authkey': authKey,
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(postData)
          }
        };

        return new Promise((resolve, reject) => {
          const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
              try {
                const responseData = JSON.parse(body);
                if (responseData.type === 'success') {
                  logger.info(`📲 MSG91 OTP successfully dispatched to ${formattedMobile}`);
                  resolve({ success: true, provider: 'msg91' });
                } else {
                  logger.warn(`⚠️ MSG91 OTP response warning: ${body}`);
                  resolve({ success: true, provider: 'msg91-sandbox', mockOtp: otpCode });
                }
              } catch {
                resolve({ success: true, provider: 'msg91-sandbox', mockOtp: otpCode });
              }
            });
          });

          req.on('error', (e) => {
            logger.error(`❌ MSG91 HTTPS Request error: ${e.message}`);
            resolve({ success: true, provider: 'sandbox-fallback', mockOtp: otpCode });
          });

          req.write(postData);
          req.end();
        });
      } catch (err) {
        logger.error('❌ Failed to trigger MSG91 API call:', err.message);
      }
    }

    // Dev Sandbox Fallback
    logger.info(`📱 [OTPSandbox] OTP for ${formattedMobile} is: ${otpCode} (Logged for local testing)`);
    return {
      success: true,
      provider: 'sandbox',
      mockOtp: otpCode
    };
  },

  /**
   * Verify input OTP against generated OTP or default dev code (123456)
   */
  verifyOtp(storedOtp, inputOtp) {
    if (!inputOtp) return false;
    
    // Always allow universal dev test OTP '123456' in development mode
    if (process.env.NODE_ENV === 'development' && inputOtp === '123456') {
      logger.info('🔓 Dev bypass OTP 123456 accepted.');
      return true;
    }

    return String(storedOtp).trim() === String(inputOtp).trim();
  }
};

module.exports = OtpService;
