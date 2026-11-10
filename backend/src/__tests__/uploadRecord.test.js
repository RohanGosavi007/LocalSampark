/**
 * recordUpload writes the file_uploads row every upload endpoint depends on.
 *
 * It built its INSERT with `${NOW}`, and NOW was never defined in the module,
 * so the template literal threw a ReferenceError before the query was sent:
 * the file landed on disk, the handler answered 500, and no row existed for
 * anything to find it by. Nothing called the function under test, so the suite
 * stayed green throughout.
 */


const fs = require('fs');
const { queryOne } = require('../config/database');
const { recordUpload, deleteUpload, diskPath } = require('../modules/core/services/upload.service');

// A real PNG header: the type is read from the bytes (upload.service.js).
const FILE = {
  buffer: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]),
  originalname: 'Upload Record Test.png',
  mimetype: 'image/png',
  size: 40,
};

let recorded;
afterAll(async () => {
  if (recorded) await deleteUpload(recorded.id);
});

test('records the upload and returns where it can be fetched from', async () => {
  recorded = await recordUpload(null, FILE, 'shop_photo', 'upload-record-ref');

  // The URL names the directory the file is in. It used to say
  // /uploads/shop_photo/… for a file written to …/uploads/shops/.
  expect(recorded).toEqual(expect.objectContaining({
    url: expect.stringMatching(/^\/uploads\/shops\/\d+-[0-9a-f]{16}\.png$/),
    originalName: FILE.originalname,
    size: FILE.size,
    type: 'image/png',
  }));
  expect(fs.existsSync(diskPath({ file_path: recorded.url }))).toBe(true);

  const row = await queryOne('SELECT * FROM file_uploads WHERE id = $1', [recorded.id]);
  expect(row).toBeTruthy();
  expect('/' + row.file_path).toBe(recorded.url);
  expect(row.purpose).toBe('shop_photo');
  expect(row.reference_id).toBe('upload-record-ref');
  expect(row.created_at).toBeTruthy();
});
