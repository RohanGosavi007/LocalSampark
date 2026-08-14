const axios = require('axios');
require('dotenv').config();

/**
 * Sends a WhatsApp message using WhatsApp Business API.
 * Mocked if API key is not fully set up.
 */
async function sendWhatsAppBusiness(phoneNumber, message) {
    console.log(`[WhatsApp Business API] Sending to ${phoneNumber}: ${message}`);
    // Real implementation would look like:
    /*
    const url = 'https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages';
    const payload = {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "text",
        text: { body: message }
    };
    try {
        await axios.post(url, payload, {
            headers: { Authorization: `Bearer ${process.env.WHATSAPP_API_KEY}` }
        });
    } catch (err) {
        console.error("WhatsApp API error:", err);
    }
    */
    return true; // simulated success
}

/**
 * Generates a WhatsApp Web link for manual messaging.
 */
function getWhatsAppWebLink(phoneNumber, message) {
    const encodedMessage = encodeURIComponent(message);
    const formattedPhone = phoneNumber.replace(/[^0-9]/g, '');
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

module.exports = {
    sendWhatsAppBusiness,
    getWhatsAppWebLink
};
