/**
 * CDN Configuration and Asset Delivery Wrapper
 * Maps local asset paths to a high-performance Edge CDN when in production.
 */

const CDN_BASE_URL = process.env.CDN_BASE_URL || ''; 
const NODE_ENV = process.env.NODE_ENV || 'development';

class CDNManager {
  /**
   * Transforms a local relative asset path into a fully qualified CDN URL.
   * If not in production or CDN_BASE_URL is not set, returns the original path.
   * 
   * @param {string} localPath - e.g., '/uploads/shop_logos/image.jpg'
   * @returns {string} - e.g., 'https://cdn.localsampark.com/uploads/shop_logos/image.jpg'
   */
  static getAssetUrl(localPath) {
    if (!localPath) return null;
    
    // Ignore external URLs (e.g., https://ui-avatars.com, s3 buckets)
    if (localPath.startsWith('http://') || localPath.startsWith('https://')) {
      return localPath;
    }

    if (NODE_ENV === 'production' && CDN_BASE_URL) {
      // Ensure no double slashes
      const cleanBase = CDN_BASE_URL.replace(/\/$/, '');
      const cleanPath = localPath.startsWith('/') ? localPath : `/${localPath}`;
      return `${cleanBase}${cleanPath}`;
    }

    // Fallback to local Express static hosting
    return localPath;
  }
}

module.exports = CDNManager;
