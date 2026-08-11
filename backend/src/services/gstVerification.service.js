/**
 * ═══════════════════════════════════════════════════════════════════════
 * GST Verification Service
 * 10x Plan: Section 20.1.3 — Public GST API Integration
 * ═══════════════════════════════════════════════════════════════════════
 */
const logger = require('../config/logger');

class GSTVerificationService {
  /**
   * Validate GSTIN format (15-character alphanumeric)
   */
  static isValidFormat(gstin) {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gstin);
  }

  /**
   * Verify GSTIN against public API
   */
  static async verify(gstin) {
    if (!gstin) throw new Error('GSTIN is required');
    
    const normalized = gstin.toUpperCase().trim();
    if (!this.isValidFormat(normalized)) {
      throw new Error('Invalid GSTIN format. Expected: 22AAAAA0000A1Z5');
    }

    // Try public GST verification API
    const apiKey = process.env.GST_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch(
          `https://sheet.gstincheck.co.in/check/${apiKey}/${normalized}`
        );
        const data = await response.json();

        if (!data.flag) {
          return {
            isValid: false,
            gstin: normalized,
            error: data.message || 'GSTIN not found or invalid',
          };
        }

        return {
          isValid: true,
          gstin: normalized,
          legalName: data.data?.lgnm || '',
          tradeName: data.data?.tradeNam || '',
          status: data.data?.sts || 'Unknown',
          type: data.data?.dty || 'Unknown',
          registrationDate: data.data?.rgdt || '',
          state: data.data?.pradr?.addr?.stcd || '',
          pincode: data.data?.pradr?.addr?.pncd || '',
          address: [
            data.data?.pradr?.addr?.bno,
            data.data?.pradr?.addr?.st,
            data.data?.pradr?.addr?.loc,
            data.data?.pradr?.addr?.dst,
          ].filter(Boolean).join(', '),
        };
      } catch (error) {
        logger.error('GST API verification failed: ' + error.message);
        // Fallback to format-only validation
        return {
          isValid: true,
          gstin: normalized,
          legalName: '',
          tradeName: '',
          status: 'format_valid_unverified',
          type: 'unknown',
          note: 'API verification unavailable, format validated only',
        };
      }
    }

    // No API key — format-only validation
    return {
      isValid: true,
      gstin: normalized,
      status: 'format_valid_unverified',
      note: 'GST_API_KEY not configured. Format validated only.',
    };
  }

  /**
   * Determine if a shop needs GST based on category and turnover
   */
  static requiresGST(categorySlug, annualTurnover = 0) {
    // GST mandatory for turnover > ₹40L (services) or ₹20L (special states)
    const GST_THRESHOLD = 4000000; // ₹40 Lakhs
    
    // Food/restaurant always needs FSSAI but GST only above threshold
    const exemptCategories = [
      'home-services-plumbers', 'electricians-electronics', 'tutors-education',
      'yoga-wellness', 'astrologer-pandit',
    ];

    if (exemptCategories.includes(categorySlug) && annualTurnover < GST_THRESHOLD) {
      return { required: false, reason: 'Below ₹40L threshold for service category' };
    }

    if (annualTurnover >= GST_THRESHOLD) {
      return { required: true, reason: 'Annual turnover exceeds ₹40L threshold' };
    }

    return { required: false, reason: 'Below GST threshold' };
  }
}

module.exports = GSTVerificationService;
