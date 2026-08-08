class WhatsAppService {
    constructor() {
        this.token = process.env.WHATSAPP_TOKEN || 'dummy_token';
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || 'dummy_id';
    }

    async sendTemplateMessage(phone, templateName, params) {
        console.log(`[WhatsApp] Sending template ${templateName} to ${phone}`);
        return { success: true, message_id: 'mock_wa_id_' + Date.now() };
    }

    async sendFreeFormMessage(phone, message) {
        console.log(`[WhatsApp] Sending message to ${phone}: ${message}`);
        return { success: true };
    }
}

module.exports = new WhatsAppService();
