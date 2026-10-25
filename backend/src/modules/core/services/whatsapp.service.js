/**
 * WhatsApp, through the WhatsApp Business Cloud API.
 *
 * sendWhatsAppBusiness() used to log the message and `return true; //
 * simulated success`, with the real request in a comment. Callers — the
 * WhatsApp login code among them — reported the message as sent.
 *
 * Configuration (all in the environment):
 *   WHATSAPP_API_TOKEN         a permanent or system-user access token
 *   WHATSAPP_PHONE_NUMBER_ID   the sending number's id (not the number)
 *   WHATSAPP_OTP_TEMPLATE      name of an approved AUTHENTICATION template
 *   WHATSAPP_TEMPLATE_LANG     its language code (default en)
 *
 * Without the first two, isConfigured() is false and nothing is sent.
 *
 * NOT EXERCISED against the live API: no WhatsApp Business account was
 * available in this environment. The request shapes follow Meta's Cloud API
 * documentation for text and authentication-template messages.
 */

const GRAPH = 'https://graph.facebook.com/v19.0';

const token = () => process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_API_KEY || '';
const phoneNumberId = () => process.env.WHATSAPP_PHONE_NUMBER_ID || '';

function isConfigured() {
  return Boolean(token() && phoneNumberId());
}

const digits = (phoneNumber) => String(phoneNumber || '').replace(/[^0-9]/g, '');

async function post(payload) {
  if (!isConfigured()) return false;
  try {
    const response = await fetch(`${GRAPH}/${phoneNumberId()}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error(`[WhatsApp] API answered ${response.status}: ${detail.slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[WhatsApp] request failed:', err.message);
    return false;
  }
}

/**
 * Sends a plain text message. Resolves true only if the API accepted it.
 * (Text messages are delivered only inside a 24-hour conversation the user
 * opened; anything the platform starts needs an approved template.)
 */
async function sendWhatsAppBusiness(phoneNumber, message) {
  return post({ to: digits(phoneNumber), type: 'text', text: { body: String(message) } });
}

/** Sends a login code with the approved authentication template. */
async function sendOtpTemplate(phoneNumber, code) {
  const template = process.env.WHATSAPP_OTP_TEMPLATE;
  if (!template) return false;
  return post({
    to: digits(phoneNumber),
    type: 'template',
    template: {
      name: template,
      language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en' },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: String(code) }] },
        // Authentication templates carry the code in a copy-code / one-tap button too.
        { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: String(code) }] },
      ],
    },
  });
}

/**
 * Generates a WhatsApp Web link for manual messaging.
 */
function getWhatsAppWebLink(phoneNumber, message) {
  return `https://wa.me/${digits(phoneNumber)}?text=${encodeURIComponent(message)}`;
}

module.exports = {
  isConfigured,
  sendWhatsAppBusiness,
  sendOtpTemplate,
  getWhatsAppWebLink,
};
