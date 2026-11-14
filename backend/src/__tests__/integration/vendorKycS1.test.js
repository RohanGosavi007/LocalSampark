/**
 * S1 seller KYC — what the submission route accepts, and how bank details are
 * stored.
 *
 *   - nothing was validated: an empty body marked KYC "submitted";
 *   - the bank account number was "encrypted" with base64, which anyone can
 *     reverse; it is now AES-256-GCM, and production refuses to store it at
 *     all without KYC_ENCRYPTION_KEY.
 */
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { fx, fxLike } = require('../helpers/fixtureIds');
const { query, queryOne } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const { pointSql } = require('../../utils/sqlPoint');
const fieldCrypto = require('../../utils/fieldCrypto');

const OWNER = fx('s1k-owner');
const OTHER = fx('s1k-other');
const SHOP = fx('s1k-shop');
const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

const VALID = {
  pan_number: 'ABCDE1234F',
  gst_number: '27ABCDE1234F1Z5',
  bank_account_number: '987654321012',
  bank_ifsc: 'HDFC0001234',
  bank_name: 'HDFC Bank',
};

async function cleanup() {
  await query(`DELETE FROM vendor_kyc WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('s1k')}'`);
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('s1k')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('s1k')}'`);
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone] of [[OWNER, '9833121001'], [OTHER, '9833121002']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, 'S1 KYC', phone, 'shop_owner']);
  }
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, latitude, longitude, coordinate, is_active, is_verified, approval_status)
     VALUES ($1, $2, 'S1 KYC Shop', 'grocery', 'S1 Road', 18.53, 73.87, ${pointSql(18.53, 73.87)}, false, false, 'pending')`,
    [SHOP, OWNER]
  );
  app = express();
  app.use(express.json());
  app.use('/shops', require('../../modules/ecommerce/routes/vendor-kyc.routes'));
});

afterAll(cleanup);

const submit = (body, who = OWNER) => request(app).post(`/shops/${SHOP}/kyc`).set(as(who)).send(body);

describe('[S1.5] seller: KYC submission is checked before it is accepted', () => {
  test('[S1.5] an empty submission is refused and nothing is queued for review', async () => {
    const res = await submit({});
    expect(res.status).toBe(400);
    expect(res.body.problems.map((p) => p.field)).toContain('pan_number');
    expect(await queryOne('SELECT id FROM vendor_kyc WHERE shop_id = $1', [SHOP])).toBeFalsy();
  });

  test.each([
    ['a malformed PAN', { ...VALID, pan_number: 'ABC123' }, 'pan_number'],
    ['a malformed GSTIN', { ...VALID, gst_number: '27ABC' }, 'gst_number'],
    ['a malformed IFSC', { ...VALID, bank_ifsc: 'HDFC1234' }, 'bank_ifsc'],
    ['an account number with letters', { ...VALID, bank_account_number: '9876ABC21012' }, 'bank_account_number'],
    ['an account number without an IFSC', { ...VALID, bank_ifsc: undefined }, 'bank_ifsc'],
  ])('[S1.5] %s is refused and named', async (_label, body, field) => {
    const res = await submit(body);
    expect(res.status).toBe(400);
    expect(res.body.problems.map((p) => p.field)).toContain(field);
  });

  test('[S1.5] someone who does not own the shop cannot submit for it', async () => {
    expect((await submit(VALID, OTHER)).status).toBe(403);
  });

  test('[S1.5] a valid submission is queued, and the bank account is encrypted, not encoded', async () => {
    const res = await submit(VALID);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('submitted');

    const row = await queryOne('SELECT kyc_status, bank_account_number_encrypted AS stored FROM vendor_kyc WHERE shop_id = $1', [SHOP]);
    expect(row.kyc_status).toBe('submitted');
    expect(row.stored.startsWith('v1:')).toBe(true);
    // Not readable by decoding: base64 of the stored value does not contain the number.
    expect(Buffer.from(row.stored.slice(3), 'base64').toString('latin1')).not.toContain('987654321012');
    expect(Buffer.from('987654321012').toString('base64')).not.toBe(row.stored);
    // And it decrypts back with the key.
    expect(fieldCrypto.decrypt(row.stored)).toBe('987654321012');
  });

  test('[S1.5] production without an encryption key refuses bank details rather than storing them weakly', async () => {
    const saved = { env: process.env.NODE_ENV, key: process.env.KYC_ENCRYPTION_KEY };
    process.env.NODE_ENV = 'production';
    delete process.env.KYC_ENCRYPTION_KEY;
    try {
      expect(() => fieldCrypto.encrypt('987654321012')).toThrow(fieldCrypto.FieldCryptoError);
    } finally {
      process.env.NODE_ENV = saved.env;
      if (saved.key !== undefined) process.env.KYC_ENCRYPTION_KEY = saved.key;
    }
  });

  test('[S1.5] a configured key is used, and a wrong-length key is refused', () => {
    const saved = process.env.KYC_ENCRYPTION_KEY;
    try {
      process.env.KYC_ENCRYPTION_KEY = 'ab'.repeat(32);
      const sealed = fieldCrypto.encrypt('123456789');
      expect(fieldCrypto.decrypt(sealed)).toBe('123456789');
      process.env.KYC_ENCRYPTION_KEY = 'tooshort';
      expect(() => fieldCrypto.encrypt('123456789')).toThrow('32 bytes');
    } finally {
      if (saved === undefined) delete process.env.KYC_ENCRYPTION_KEY; else process.env.KYC_ENCRYPTION_KEY = saved;
    }
  });

  test('[S1.5] the account number is shown masked', () => {
    expect(fieldCrypto.maskAccount('987654321012')).toBe('XXXXXXXX1012');
  });
});
