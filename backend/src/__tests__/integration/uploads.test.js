/**
 * Uploads: the file's type is its content's, private documents stay private.
 *
 * See modules/core/services/upload.service.js for what was wrong before.
 */

process.env.USE_SQLITE = 'true';

const fs = require('fs');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const uploads = require('../../modules/core/services/upload.service');

const OWNER = 'upl-owner';
const STRANGER = 'upl-stranger';
const ADMIN = 'upl-admin';
const SHOPKEEPER = 'upl-shopkeeper';
const EMPLOYER = 'upl-employer';

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 2)]);
const PDF = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\nJohn Doe Javascript React Node 5 years experience\n%%EOF');
const HTML = Buffer.from('<html><body><script>alert(document.cookie)</script></body></html>');

let app;

async function cleanup() {
  const rows = await queryMany("SELECT id FROM file_uploads WHERE uploader_id LIKE 'upl-%'");
  for (const row of rows) await uploads.deleteUpload(row.id);
  await query("DELETE FROM job_skills WHERE user_id LIKE 'upl-%'");
  await query("DELETE FROM job_resumes WHERE user_id LIKE 'upl-%'");
  await query("DELETE FROM job_applications WHERE applicant_id LIKE 'upl-%'");
  await query("DELETE FROM local_job_postings WHERE id LIKE 'upl-%'");
  await query("DELETE FROM orders WHERE id LIKE 'upl-%'");
  await query("DELETE FROM local_shops WHERE id LIKE 'upl-%'");
  await query("DELETE FROM users WHERE id LIKE 'upl-%'");
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone, role] of [
    [OWNER, '9866100001', 'user'], [STRANGER, '9866100002', 'user'], [ADMIN, '9866100003', 'admin'],
    [SHOPKEEPER, '9866100004', 'shop_owner'], [EMPLOYER, '9866100005', 'user'],
  ]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $1, $2, $3)', [id, phone, role]);
  }
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude)
     VALUES ('upl-pharmacy', $1, 'UPL Pharmacy', 'Pharmacy', 'Road', 'POINT(73.87 18.53)', 18.53, 73.87)`,
    [SHOPKEEPER]
  );
  await query(
    "INSERT INTO orders (id, user_id, shop_id, total_amount, delivery_fee, payment_method) VALUES ('upl-order', $1, 'upl-pharmacy', 100, 0, 'cod')",
    [OWNER]
  );

  app = express();
  app.use(express.json());
  app.use('/upload', require('../../modules/core/routes/upload.routes'));
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
  app.use('/', require('../../modules/services/routes/advanced.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
});

afterAll(cleanup);

const send = (userId, buffer, name, fields = {}, field = 'file', type = 'image/png') => {
  let req = request(app).post('/upload').set(as(userId));
  for (const [key, value] of Object.entries(fields)) req = req.field(key, value);
  return req.attach(field, buffer, { filename: name, contentType: type });
};

describe('what is accepted', () => {
  test('an image is stored under its purpose, named by its real type, at a URL that resolves', async () => {
    const res = await send(OWNER, JPEG, 'holiday.png', { purpose: 'product_image' });

    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^\/uploads\/products\/\d+-[0-9a-f]{16}\.jpg$/);
    expect(res.body.fileUrl).toBe(res.body.url);
    expect(res.body.files[0]).toMatchObject({ type: 'image/jpeg', private: false, name: 'holiday.png' });
    // The URL is where the file is: public/uploads/products/….
    expect(fs.existsSync(uploads.diskPath({ file_path: res.body.url }))).toBe(true);
  });

  test('a page labelled as an image is refused, whatever it is called, and nothing is written', async () => {
    const before = (await queryMany("SELECT id FROM file_uploads WHERE uploader_id = 'upl-owner'")).length;
    for (const name of ['photo.png', 'photo.html', 'photo.svg']) {
      const res = await send(OWNER, HTML, name);
      expect(res.status).toBe(415);
      expect(res.body.code).toBe('UNSUPPORTED_TYPE');
    }
    expect((await queryMany("SELECT id FROM file_uploads WHERE uploader_id = 'upl-owner'")).length).toBe(before);
  });

  test('a real image named .html is stored as an image', async () => {
    const res = await send(OWNER, PNG, 'evil.html');
    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/\.png$/);
  });

  test('each purpose takes its own types', async () => {
    // A PDF is not a product photo.
    expect((await send(OWNER, PDF, 'menu.pdf', { purpose: 'product_image' }, 'file', 'application/pdf')).status).toBe(415);
    expect((await send(OWNER, PNG, 'x.png', { purpose: 'secrets' })).status).toBe(400);
  });

  test('size, count and field are enforced', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(uploads.MAX_FILE_BYTES)]);
    expect((await send(OWNER, big, 'big.png')).status).toBe(413);
    expect((await send(OWNER, PNG, 'x.png', {}, 'avatar')).status).toBe(400);
    expect((await request(app).post('/upload').set(as(OWNER))).status).toBe(400);
    expect((await request(app).post('/upload').attach('file', PNG, 'x.png')).status).toBe(401);
  });

  test('several files at once, under "files"', async () => {
    const res = await request(app).post('/upload').set(as(OWNER))
      .attach('files', PNG, 'a.png').attach('files', JPEG, 'b.jpg');
    expect(res.status).toBe(201);
    expect(res.body.files.map((f) => f.type)).toEqual(['image/png', 'image/jpeg']);
  });

  test('the shop upload paths are the same endpoint', async () => {
    const res = await request(app).post('/shops/upload').set(as(SHOPKEEPER)).field('purpose', 'shop_photo').attach('files', PNG, 'front.png');
    expect(res.status).toBe(201);
    expect(res.body.uploads[0].url).toMatch(/^\/uploads\/shops\//);
    expect((await request(app).post('/shops/upload/single').set(as(SHOPKEEPER)).attach('file', HTML, 'x.png')).status).toBe(415);
  });
});

describe('private documents', () => {
  let doc;

  test('a KYC document is not public: it has no /uploads address', async () => {
    const res = await send(OWNER, PDF, 'licence.pdf', { purpose: 'document', module: 'kyc' }, 'file', 'application/pdf');
    expect(res.status).toBe(201);
    doc = res.body.files[0];
    expect(doc.private).toBe(true);
    expect(doc.url).toBe(`/api/v1/upload/files/${doc.id}`);
  });

  test('the uploader and staff can open it; nobody else can tell it exists', async () => {
    const owner = await request(app).get(`/upload/files/${doc.id}`).set(as(OWNER));
    expect(owner.status).toBe(200);
    expect(owner.headers['content-type']).toMatch(/application\/pdf/);
    expect(owner.headers['cache-control']).toMatch(/no-store/);

    expect((await request(app).get(`/upload/files/${doc.id}`).set(as(ADMIN))).status).toBe(200);
    expect((await request(app).get(`/upload/files/${doc.id}`).set(as(STRANGER))).status).toBe(404);
    expect((await request(app).get(`/upload/files/${doc.id}`)).status).toBe(404);
    expect((await request(app).get('/upload/files/no-such-file').set(as(OWNER))).status).toBe(404);
  });

  test('a signed link opens it without a session, until it expires', async () => {
    expect((await request(app).get(`/upload/files/${doc.id}/link`).set(as(STRANGER))).status).toBe(404);
    const link = await request(app).get(`/upload/files/${doc.id}/link`).set(as(OWNER));
    expect(link.status).toBe(200);

    const path = link.body.url.replace('/api/v1', '');
    expect((await request(app).get(path)).status).toBe(200);
    expect((await request(app).get(path.replace(/signature=[0-9a-f]+/, 'signature=' + '0'.repeat(64)))).status).toBe(404);

    const expired = uploads.signedLink(doc.id, Date.now() - 60 * 60 * 1000).url.replace('/api/v1', '');
    expect((await request(app).get(expired)).status).toBe(404);
  });

  test('a prescription is readable by the shop it was sent to', async () => {
    const res = await send(OWNER, JPEG, 'rx.jpg', { purpose: 'prescription', referenceId: 'upl-order' }, 'file', 'image/jpeg');
    expect(res.status).toBe(201);
    const id = res.body.files[0].id;
    expect((await request(app).get(`/upload/files/${id}`).set(as(SHOPKEEPER))).status).toBe(200);
    expect((await request(app).get(`/upload/files/${id}`).set(as(STRANGER))).status).toBe(404);
  });

  test('only the uploader or staff can delete a file', async () => {
    expect((await request(app).delete(`/upload/files/${doc.id}`).set(as(STRANGER))).status).toBe(403);
    const full = uploads.diskPath({ file_path: (await queryMany('SELECT file_path FROM file_uploads WHERE id = $1', [doc.id]))[0].file_path });
    expect(fs.existsSync(full)).toBe(true);

    expect((await request(app).delete(`/upload/files/${doc.id}`).set(as(OWNER))).status).toBe(200);
    expect(fs.existsSync(full)).toBe(false);
    expect((await request(app).get(`/upload/files/${doc.id}`).set(as(OWNER))).status).toBe(404);
  });
});

describe('résumés', () => {
  test('are private, parsed, and open to employers the applicant has applied to', async () => {
    const res = await request(app).post('/jobs/resume-upload').set(as(OWNER)).attach('resume', PDF, { filename: 'cv.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(200);
    expect(res.body.file.url).toMatch(/^\/api\/v1\/upload\/files\//);
    const id = res.body.file.id;

    expect((await request(app).get(`/upload/files/${id}`).set(as(EMPLOYER))).status).toBe(404);

    await query(
      `INSERT INTO local_job_postings (id, employer_id, title, category, status) VALUES ('upl-job', $1, 'Developer', 'IT', 'active')`,
      [EMPLOYER]
    );
    await query("INSERT INTO job_applications (id, job_id, applicant_id, status) VALUES ('upl-app', 'upl-job', $1, 'applied')", [OWNER]);
    expect((await request(app).get(`/upload/files/${id}`).set(as(EMPLOYER))).status).toBe(200);
  });

  test('a résumé must be a document', async () => {
    const res = await request(app).post('/jobs/resume-upload').set(as(OWNER)).attach('resume', HTML, { filename: 'cv.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(415);
  });
});

describe('sniffing', () => {
  test('recognises the accepted formats by their first bytes', () => {
    expect(uploads.sniff(PNG)).toBe('image/png');
    expect(uploads.sniff(JPEG)).toBe('image/jpeg');
    expect(uploads.sniff(PDF)).toBe('application/pdf');
    expect(uploads.sniff(Buffer.concat([Buffer.from('RIFF\0\0\0\0WEBP'), Buffer.alloc(8)]))).toBe('image/webp');
    expect(uploads.sniff(Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(8)]))).toBe('image/gif');
    expect(uploads.sniff(HTML)).toBeNull();
    expect(uploads.sniff(Buffer.from('short'))).toBeNull();
  });
});
