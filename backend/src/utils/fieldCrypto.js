/**
 * Field-level encryption for sensitive values at rest (S1: a seller's bank
 * account number in vendor_kyc.bank_account_number_encrypted).
 *
 * That column was filled with Buffer.from(value).toString('base64') under a
 * comment saying "Encrypt sensitive fields". Base64 is an encoding anyone can
 * reverse, so the label promised a protection the data did not have.
 *
 * AES-256-GCM, key from KYC_ENCRYPTION_KEY (32 bytes as 64 hex characters or
 * base64). Stored as "v1:<base64(iv | tag | ciphertext)>" so a future key or
 * algorithm can be told apart from this one.
 *
 * Production without a key refuses to encrypt (FieldCryptoError, status 503)
 * rather than store the value weakly. Development and test fall back to a key
 * derived from JWT_SECRET, with a warning, so local flows keep working.
 */
const crypto = require('crypto');
const logger = require('../config/logger');

const PREFIX = 'v1:';

class FieldCryptoError extends Error {
  constructor(message) {
    super(message);
    this.status = 503;
    this.code = 'ENCRYPTION_NOT_CONFIGURED';
  }
}

let warned = false;

function key() {
  const raw = process.env.KYC_ENCRYPTION_KEY;
  if (raw) {
    const buf = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
    if (buf.length !== 32) throw new FieldCryptoError('KYC_ENCRYPTION_KEY must be 32 bytes (64 hex characters or base64).');
    return buf;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new FieldCryptoError('Bank details cannot be stored until KYC_ENCRYPTION_KEY is configured.');
  }
  if (!warned) {
    logger.warn('KYC_ENCRYPTION_KEY is not set; using a development key. Never run production like this.');
    warned = true;
  }
  return crypto.createHash('sha256').update(`kyc-dev-key:${process.env.JWT_SECRET || 'localsampark-dev'}`).digest();
}

function encrypt(plain) {
  if (plain === null || plain === undefined || plain === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
}

function decrypt(stored) {
  if (!stored) return null;
  if (!String(stored).startsWith(PREFIX)) {
    // Rows written before this change are base64 only.
    return Buffer.from(String(stored), 'base64').toString('utf8');
  }
  const buf = Buffer.from(String(stored).slice(PREFIX.length), 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
}

/** "XXXXXX1234" — enough for a person to recognise their account. */
function maskAccount(plain) {
  const s = String(plain || '');
  return s.length <= 4 ? s : `${'X'.repeat(s.length - 4)}${s.slice(-4)}`;
}

module.exports = { encrypt, decrypt, maskAccount, FieldCryptoError };
