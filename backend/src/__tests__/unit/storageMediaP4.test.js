/**
 * P4 Object storage and the media pipeline — the rules the providers keep.
 *
 * P4.3  the local provider never reads, writes or deletes outside its folders.
 * P4.4  the S3/R2 provider signs the real request: keys with spaces or
 *       non-ASCII characters are encoded, private objects are not public, and a
 *       link is short-lived.
 * P4.5  a private file kept in object storage is served by a signed link, to
 *       whoever may read it (the route used to look for it on local disk and
 *       answer "not found").
 * P4.6  the migration utility copies local uploads to the bucket: dry by
 *       default, verified, repeatable, and it never deletes a local file.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const LocalStorageProvider = require('../../services/storage/LocalStorageProvider');
const S3StorageProvider = require('../../services/storage/S3StorageProvider');
const storage = require('../../services/storage');
const { sniff } = require('../../modules/core/services/upload.service');
const { migrateUploads } = require('../../../../scripts/storage/migrate_uploads');

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 7)]);
const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(40, 9)]);

describe('[P4.3] the local provider keeps every key inside its folder', () => {
  const provider = new LocalStorageProvider();

  test.each(['../../.env', '../secret.txt', 'products/../../../x', '/etc/passwd', 'private/../../x'])('[P4.3] a key like %s is refused for a write, a read and a delete', async (key) => {
    for (const isPublic of [true, false]) {
      await expect(provider.putObject({ key, buffer: Buffer.from('x'), mimeType: 'text/plain', isPublic })).rejects.toThrow(/Invalid storage key/);
      await expect(provider.getObject(key, isPublic)).rejects.toThrow(/Invalid storage key/);
      await expect(provider.deleteObject(key, isPublic)).resolves.toBe(false); // refused, not thrown: delete reports false
    }
  });

  test('[P4.3] a normal key resolves inside the public or private folder', () => {
    expect(provider._resolvePath('uploads/products/a.jpg', true)).toBe(path.join(provider.publicBase, 'products', 'a.jpg'));
    expect(provider._resolvePath('private/kyc/b.pdf', false)).toBe(path.join(provider.privateBase, 'kyc', 'b.pdf'));
  });
});

describe('[P4.4] the S3 / R2 provider signs the request it actually sends', () => {
  const provider = new S3StorageProvider({ endpoint: 'https://acct.r2.cloudflarestorage.com', bucket: 'ls-bucket', accessKey: 'AKIATEST', secretKey: 'secret-key-test', region: 'auto' });
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  test('[P4.4] a key is encoded per path segment, slashes kept', () => {
    expect(provider._encodeKey('/private/kyc/Aadhaar copy (1).jpg')).toBe('private/kyc/Aadhaar%20copy%20%281%29.jpg');
    expect(provider._encodeKey('uploads/क.png')).toBe('uploads/%E0%A4%95.png');
    expect(provider._encodeKey("uploads/it's*.png")).toBe('uploads/it%27s%2A.png');
  });

  test('[P4.4] a link is short-lived, carries the encoded key, and its signature verifies', async () => {
    const url = new URL(await provider.getSignedUrl('private/kyc/Aadhaar copy (1).jpg', 600));
    expect(url.origin).toBe('https://acct.r2.cloudflarestorage.com');
    expect(url.pathname).toBe('/ls-bucket/private/kyc/Aadhaar%20copy%20%281%29.jpg');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('600');

    // Recompute the signature independently, from the URL alone.
    const amzDate = url.searchParams.get('X-Amz-Date');
    const scope = `${amzDate.slice(0, 8)}/auto/s3/aws4_request`;
    const query = [...url.searchParams.entries()].filter(([k]) => k !== 'X-Amz-Signature')
      .sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    const canonical = ['GET', url.pathname, query, `host:${url.host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
    const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, crypto.createHash('sha256').update(canonical).digest('hex')].join('\n');
    const hmac = (k, s) => crypto.createHmac('sha256', k).update(s).digest();
    const signingKey = hmac(hmac(hmac(hmac('AWS4secret-key-test', amzDate.slice(0, 8)), 'auto'), 's3'), 'aws4_request');
    expect(url.searchParams.get('X-Amz-Signature')).toBe(crypto.createHmac('sha256', signingKey).update(toSign).digest('hex'));
  });

  test('[P4.4] an upload: a private object is not public-read, a public one is; the body is hashed and signed', async () => {
    const calls = [];
    global.fetch = jest.fn(async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200, headers: new Map() }; });

    await provider.putObject({ key: 'private/kyc/doc one.pdf', buffer: PDF, mimeType: 'application/pdf', isPublic: false });
    await provider.putObject({ key: 'uploads/banners/b.png', buffer: PNG, mimeType: 'image/png', isPublic: true });

    const [priv, pub] = calls;
    expect(priv.url).toBe('https://acct.r2.cloudflarestorage.com/ls-bucket/private/kyc/doc%20one.pdf');
    expect(priv.init.headers['x-amz-acl']).toBeUndefined();
    expect(pub.init.headers['x-amz-acl']).toBe('public-read');
    expect(priv.init.headers['x-amz-content-sha256']).toBe(crypto.createHash('sha256').update(PDF).digest('hex'));
    expect(priv.init.headers['content-type']).toBe('application/pdf');
    expect(priv.init.headers.Authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=AKIATEST\/\d{8}\/auto\/s3\/aws4_request, SignedHeaders=[^,]*content-type[^,]*host[^,]*x-amz-content-sha256[^,]*, Signature=[0-9a-f]{64}$/);
  });

  test('[P4.4] it says it is remote, and refuses to run without credentials', async () => {
    expect(provider.isRemote).toBe(true);
    expect(new LocalStorageProvider().isRemote).toBe(false);
    await expect(new S3StorageProvider({}).putObject({ key: 'a', buffer: PNG })).rejects.toThrow(/not configured/);
  });
});

describe('[P4.5] a private file in object storage is served by a signed link', () => {
  const OWNER = crypto.randomUUID();
  const STRANGER = crypto.randomUUID();
  const FILE = crypto.randomUUID();
  const as = (id) => ({ Authorization: `Bearer ${jwt.sign({ userId: id, id, role: 'user' }, getJwtSecret(), { expiresIn: '5m' })}` });
  let app;

  beforeAll(async () => {
    for (const [id, phone] of [[OWNER, '9844400001'], [STRANGER, '9844400002']]) {
      await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, 'P4 user', phone, 'user']);
    }
    await query(
      `INSERT INTO file_uploads (id, uploader_id, user_id, file_name, file_path, file_type, mime_type, file_size, purpose, is_public)
       VALUES ($1, $2, $3, 'proof.pdf', 'private/dispute/proof one.pdf', 'application/pdf', 'application/pdf', 100, 'document', '0')`,
      [FILE, OWNER, OWNER]
    );
    app = express();
    app.use('/upload', require('../../modules/core/routes/upload.routes'));
  });
  afterAll(async () => {
    storage._setProviderForTests(null);
    await query('DELETE FROM file_uploads WHERE id = $1', [FILE]);
    await query('DELETE FROM users WHERE id IN ($1, $2)', [OWNER, STRANGER]);
  });

  test('[P4.5] with object storage, the owner is sent to a link that lasts five minutes; a stranger is told it does not exist', async () => {
    const seen = [];
    storage._setProviderForTests({ isRemote: true, getSignedUrl: async (key, seconds) => { seen.push({ key, seconds }); return `https://bucket.example/${encodeURIComponent(key)}?sig=abc`; } });

    const ok = await request(app).get(`/upload/files/${FILE}`).set(as(OWNER)).redirects(0);
    expect(ok.status).toBe(302);
    expect(ok.headers.location).toMatch(/^https:\/\/bucket\.example\//);
    expect(ok.headers['cache-control']).toMatch(/no-store/);
    expect(seen).toEqual([{ key: 'private/dispute/proof one.pdf', seconds: 300 }]);

    const no = await request(app).get(`/upload/files/${FILE}`).set(as(STRANGER)).redirects(0);
    expect(no.status).toBe(404);
    expect(no.headers.location).toBeUndefined();
    expect(seen).toHaveLength(1); // no link was made for the stranger
  });
});

describe('[P4.6] the migration utility moves local uploads to the bucket without losing or deleting anything', () => {
  let publicDir;
  let privateDir;
  let bucket;
  let provider;

  const makeProvider = () => {
    bucket = new Map();
    return {
      putObject: jest.fn(async ({ key, buffer, mimeType, isPublic }) => { bucket.set(key, { buffer, mimeType, isPublic }); }),
      getObject: jest.fn(async (key) => { if (!bucket.has(key)) throw new Error('404'); return { buffer: bucket.get(key).buffer }; }),
    };
  };

  beforeEach(() => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-migrate-'));
    publicDir = path.join(root, 'public');
    privateDir = path.join(root, 'private');
    fs.mkdirSync(path.join(publicDir, 'products'), { recursive: true });
    fs.mkdirSync(path.join(privateDir, 'kyc'), { recursive: true });
    fs.writeFileSync(path.join(publicDir, 'products', 'a.png'), PNG);
    fs.writeFileSync(path.join(privateDir, 'kyc', 'id.pdf'), PDF);
    fs.writeFileSync(path.join(publicDir, 'products', 'notes.txt'), 'plain text, not an accepted type');
    provider = makeProvider();
  });
  afterEach(() => fs.rmSync(path.dirname(publicDir), { recursive: true, force: true }));

  const run = (extra = {}) => migrateUploads({ provider, publicDir, privateDir, sniff, ...extra });

  test('[P4.6] a dry run (the default) says what it would copy and copies nothing', async () => {
    const r = await run();
    expect(r).toMatchObject({ found: 3, uploaded: 0, unsupported: 1 });
    expect(r.plan.map((p) => p.key).sort()).toEqual(['private/kyc/id.pdf', 'uploads/products/a.png']);
    expect(provider.putObject).not.toHaveBeenCalled();
  });

  test('[P4.6] executing copies public files public and private files private, under the keys the API already stores, with their real type', async () => {
    const r = await run({ execute: true });
    expect(r).toMatchObject({ uploaded: 2, skipped: 0, failed: 0, unsupported: 1 });
    expect(bucket.get('uploads/products/a.png')).toMatchObject({ isPublic: true, mimeType: 'image/png' });
    expect(bucket.get('private/kyc/id.pdf')).toMatchObject({ isPublic: false, mimeType: 'application/pdf' });
    expect(bucket.get('private/kyc/id.pdf').buffer.equals(PDF)).toBe(true);
  });

  test('[P4.6] running it again copies nothing: identical files already there are skipped', async () => {
    await run({ execute: true });
    provider.putObject.mockClear();
    const again = await run({ execute: true });
    expect(again).toMatchObject({ uploaded: 0, skipped: 2, failed: 0 });
    expect(provider.putObject).not.toHaveBeenCalled();
  });

  test('[P4.6] a copy that reads back different is a failure, and the exit would be non-zero', async () => {
    provider.getObject = jest.fn(async (key) => { if (!bucket.has(key)) throw new Error('404'); return { buffer: Buffer.from('corrupted') }; });
    const r = await run({ execute: true });
    expect(r.failed).toBe(2);
    expect(r.failures[0]).toMatch(/read back differs/);
  });

  test('[P4.6] it never deletes or changes a local file', async () => {
    const before = fs.readFileSync(path.join(publicDir, 'products', 'a.png'));
    await run({ execute: true });
    expect(fs.existsSync(path.join(publicDir, 'products', 'a.png'))).toBe(true);
    expect(fs.existsSync(path.join(privateDir, 'kyc', 'id.pdf'))).toBe(true);
    expect(fs.readFileSync(path.join(publicDir, 'products', 'a.png')).equals(before)).toBe(true);
  });

  test('[P4.6] the source says so: no unlink, rm or rename anywhere in it', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../../../scripts/storage/migrate_uploads.js'), 'utf8');
    expect(source).not.toMatch(/\b(unlink|unlinkSync|rmSync|rmdir|rename|renameSync|writeFileSync|truncate)\b/);
  });
});

describe('[P4.7] public images are scaled down and stripped of what they give away; documents are not touched', () => {
  const sharp = require('sharp');
  const { optimiseImage, MAX_EDGE } = require('../../services/media.service');
  const uploads = require('../../modules/core/services/upload.service');

  /** A real photo-sized JPEG with EXIF (a camera name and a GPS position). */
  async function photo(width, height, format = 'jpeg') {
    const img = sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } } });
    return format === 'jpeg'
      ? img.jpeg().withExif({ IFD0: { Make: 'TestCam', Copyright: 'Owner Name' }, GPS: { GPSLatitudeRef: 'N', GPSLatitude: '18/1 31/1 0/1', GPSLongitudeRef: 'E', GPSLongitude: '73/1 52/1 0/1' } }).toBuffer()
      : img.png().toBuffer();
  }

  test('[P4.7] a 4000 px photo comes out no wider than the limit, keeps its proportions, and loses its EXIF', async () => {
    const original = await photo(4000, 3000);
    expect((await sharp(original).metadata()).exif).toBeDefined();

    const out = await optimiseImage(original, 'image/jpeg');
    const meta = await sharp(out.buffer).metadata();
    expect(out.processed).toBe(true);
    expect(Math.max(meta.width, meta.height)).toBe(MAX_EDGE);
    expect(meta.width / meta.height).toBeCloseTo(4 / 3, 1);
    expect(meta.format).toBe('jpeg');
    expect(meta.exif).toBeUndefined(); // no location, camera or owner
    expect(out.buffer.includes(Buffer.from('TestCam'))).toBe(false);
    expect(out.buffer.length).toBeLessThan(original.length);
  });

  test('[P4.7] a small image is never scaled up; a PNG stays a PNG', async () => {
    const small = await optimiseImage(await photo(300, 200), 'image/jpeg');
    expect(await sharp(small.buffer).metadata()).toMatchObject({ width: 300, height: 200 });
    const png = await optimiseImage(await photo(2400, 1200, 'png'), 'image/png');
    expect(await sharp(png.buffer).metadata()).toMatchObject({ format: 'png', width: MAX_EDGE });
  });

  test('[P4.7] types it cannot or should not touch (GIF, PDF) come back as they were; so does an image that will not decode', async () => {
    const gif = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(40)]);
    expect((await optimiseImage(gif, 'image/gif')).buffer).toBe(gif);
    expect((await optimiseImage(PDF, 'application/pdf')).buffer).toBe(PDF);
    const broken = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(40, 3)]);
    expect(await optimiseImage(broken, 'image/jpeg')).toEqual({ buffer: broken, processed: false });
  });

  describe('through the upload path', () => {
    const USER = crypto.randomUUID();
    const stored = [];
    beforeAll(async () => {
      await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [USER, 'P4 uploader', '9844400003', 'user']);
      storage._setProviderForTests({ isRemote: true, putObject: async ({ key, buffer }) => { stored.push({ key, buffer }); return { key, url: `https://cdn.example/${key}` }; } });
    });
    afterAll(async () => {
      storage._setProviderForTests(null);
      await query('DELETE FROM file_uploads WHERE uploader_id = $1', [USER]);
      await query('DELETE FROM users WHERE id = $1', [USER]);
    });

    test('[P4.7] a product photo is stored scaled and clean; a KYC-style document is stored byte for byte', async () => {
      const big = await photo(3600, 2400);
      const [image] = await uploads.storeFiles([{ buffer: big, originalname: 'rice.jpg', size: big.length }], { userId: USER, purpose: 'product_image' });
      const [doc] = await uploads.storeFiles([{ buffer: big, originalname: 'id.jpg', size: big.length }], { userId: USER, purpose: 'document' });

      const asImage = stored.find((s) => s.key.startsWith('uploads/products/'));
      const asDoc = stored.find((s) => s.key.startsWith('private/documents/'));
      expect(Math.max((await sharp(asImage.buffer).metadata()).width, (await sharp(asImage.buffer).metadata()).height)).toBe(MAX_EDGE);
      expect((await sharp(asImage.buffer).metadata()).exif).toBeUndefined();
      expect(image.size).toBe(asImage.buffer.length); // the size reported is the size kept
      expect(asDoc.buffer.equals(big)).toBe(true); // untouched, EXIF and all
      expect(doc.size).toBe(big.length);
    });
  });
});
