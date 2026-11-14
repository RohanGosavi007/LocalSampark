/**
 * Image handling for uploads (P4): size, and what a photo gives away.
 *
 * A phone photo is 3-8 MB, 4000 pixels wide, and carries the place and time it
 * was taken in its EXIF data. Stored as it arrived, a product page downloads
 * megabytes per picture on a low-end phone, and the shop owner's home address
 * can be read from a photo of a tin of rice. Public images are therefore:
 *
 *   - turned upright (EXIF orientation applied), then stripped of ALL metadata
 *     (location, camera, time, owner);
 *   - scaled down so neither side is longer than MAX_EDGE pixels (never up);
 *   - re-encoded in their own format (JPEG, PNG, WebP).
 *
 * Private documents (KYC, prescriptions) are never touched: they must stay
 * byte-for-byte what was uploaded. An image that cannot be decoded is stored as
 * it came, as before; the upload's type check has already vouched for its first
 * bytes.
 */
const MAX_EDGE = Number.parseInt(process.env.IMAGE_MAX_EDGE, 10) || 1600;
const QUALITY = 82;
const CAN_PROCESS = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * @param {Buffer} buffer
 * @param {string} type  the sniffed content type
 * @returns {Promise<{ buffer: Buffer, processed: boolean, width?: number, height?: number }>}
 */
async function optimiseImage(buffer, type) {
  if (!CAN_PROCESS.has(type)) return { buffer, processed: false };
  try {
    // eslint-disable-next-line global-require
    const sharp = require('sharp');
    const pipeline = sharp(buffer, { limitInputPixels: 100e6 })
      .rotate() // applies the EXIF orientation, and drops the tag with the rest of the metadata
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true });
    const encoded = type === 'image/jpeg'
      ? pipeline.jpeg({ quality: QUALITY, mozjpeg: true })
      : type === 'image/png' ? pipeline.png({ compressionLevel: 9 }) : pipeline.webp({ quality: QUALITY });
    const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
    return { buffer: data, processed: true, width: info.width, height: info.height };
  } catch {
    return { buffer, processed: false };
  }
}

module.exports = { optimiseImage, MAX_EDGE };
