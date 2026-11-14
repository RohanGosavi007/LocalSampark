/**
 * StorageProvider Interface Contract
 * Defines uniform methods for saving, retrieving, and signing object storage URLs.
 */
class StorageProvider {
  /** True when files live off this machine (object storage), so they cannot be read from disk. */
  get isRemote() {
    return false;
  }

  /**
   * Save an object into storage.
   * @param {Object} params
   * @param {string} params.key - storage relative path / key
   * @param {Buffer} params.buffer - file byte contents
   * @param {string} params.mimeType - sniffed mime type
   * @param {boolean} params.isPublic - whether file is publicly accessible
   * @returns {Promise<{ key: string, url: string }>}
   */
  async putObject({ key, buffer, mimeType, isPublic }) {
    throw new Error('putObject must be implemented by storage provider');
  }

  /**
   * Retrieve an object's buffer from storage.
   * @param {string} key
   * @returns {Promise<{ buffer: Buffer, mimeType?: string }>}
   */
  async getObject(key) {
    throw new Error('getObject must be implemented by storage provider');
  }

  /**
   * Generate a time-limited signed URL for private access.
   * @param {string} key
   * @param {number} expiresInSeconds
   * @returns {Promise<string>}
   */
  async getSignedUrl(key, expiresInSeconds = 600) {
    throw new Error('getSignedUrl must be implemented by storage provider');
  }

  /**
   * Delete an object from storage.
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async deleteObject(key) {
    throw new Error('deleteObject must be implemented by storage provider');
  }
}

module.exports = StorageProvider;
