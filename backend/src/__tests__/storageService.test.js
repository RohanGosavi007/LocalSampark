const { getStorageProvider, LocalStorageProvider, S3StorageProvider } = require('../services/storage');
const fs = require('fs');
const path = require('path');

describe('Storage Abstraction Suite — N3: Ephemeral Disk Protection', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('[N3.1] LocalStorageProvider writes to disk and generates expected URLs', async () => {
    const provider = new LocalStorageProvider();
    const testBuffer = Buffer.from('test-image-data-png');
    const key = `test/test-${Date.now()}.png`;

    const res = await provider.putObject({
      key,
      buffer: testBuffer,
      mimeType: 'image/png',
      isPublic: true,
    });

    expect(res.key).toBe(key);
    expect(res.url).toBe(`/uploads/${key}`);

    const retrieved = await provider.getObject(key, true);
    expect(retrieved.buffer.toString()).toBe('test-image-data-png');

    // Clean up
    await provider.deleteObject(key, true);
  });

  test('[N3.2] LocalStorageProvider generates signed links for private uploads', async () => {
    const provider = new LocalStorageProvider();
    const signedUrl = await provider.getSignedUrl('private/doc.pdf', 300);

    expect(signedUrl).toContain('/api/v1/upload/files/private/doc.pdf');
    expect(signedUrl).toContain('expires=');
  });

  test('[N3.3] S3StorageProvider initializes and builds presigned GET URLs with SigV4', async () => {
    const s3 = new S3StorageProvider({
      endpoint: 'https://r2.example.com',
      bucket: 'my-bucket',
      accessKey: 'test-key',
      secretKey: 'test-secret',
      region: 'auto',
    });

    expect(s3.isConfigured()).toBe(true);

    const signedUrl = await s3.getSignedUrl('products/shoe.jpg', 600);
    expect(signedUrl).toContain('https://r2.example.com/my-bucket/products/shoe.jpg');
    expect(signedUrl).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
    expect(signedUrl).toContain('X-Amz-Signature=');
  });
});
