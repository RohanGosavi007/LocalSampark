const fs = require('fs');
const path = require('path');
const StorageProvider = require('./StorageProvider');

const PUBLIC_BASE = path.resolve(__dirname, '../../../public/uploads');
const PRIVATE_BASE = path.resolve(__dirname, '../../../private_uploads');

class LocalStorageProvider extends StorageProvider {
  constructor() {
    super();
    this.publicBase = PUBLIC_BASE;
    this.privateBase = PRIVATE_BASE;
  }

  _resolvePath(key, isPublic = true) {
    const base = isPublic ? this.publicBase : this.privateBase;
    const cleanKey = isPublic ? key.replace(/^uploads\//, '') : key.replace(/^private\//, '');
    // A key never leaves its folder. path.join(base, '../../.env') used to
    // resolve outside it, for a read, a write or a delete.
    const full = path.resolve(base, cleanKey);
    if (full !== base && !full.startsWith(base + path.sep)) {
      throw new Error(`Invalid storage key: ${String(key).slice(0, 80)}`);
    }
    return full;
  }

  async putObject({ key, buffer, mimeType, isPublic = true }) {
    const fullPath = this._resolvePath(key, isPublic);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, buffer, { flag: 'w' });

    const cleanKey = String(key).replace(/^\/+/, '');
    const publicPath = cleanKey.startsWith('uploads/') ? cleanKey : `uploads/${cleanKey}`;
    const url = isPublic ? `/${publicPath}` : `/api/v1/upload/files/${cleanKey.replace(/^private\//, '')}`;
    return { key, url };
  }

  async getObject(key, isPublic = false) {
    const fullPath = this._resolvePath(key, isPublic);
    const buffer = await fs.promises.readFile(fullPath);
    return { buffer };
  }

  async getSignedUrl(key, expiresInSeconds = 600) {
    // In local dev, points to authorized download gateway
    return `/api/v1/upload/files/${key}?expires=${Date.now() + (expiresInSeconds * 1000)}`;
  }

  async deleteObject(key, isPublic = true) {
    try {
      const fullPath = this._resolvePath(key, isPublic);
      await fs.promises.unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = LocalStorageProvider;
