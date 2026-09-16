/**
 * Image-to-catalogue search.
 *
 * Someone photographs a broken tap, a medicine strip, or a grocery packet, and
 * gets the local shops that deal in it. It is the one query form where a
 * hyperlocal directory beats a search engine outright: the user cannot name the
 * part, and the answer has to be a shop two streets away rather than a listing
 * that ships in a week.
 *
 * ── The extractor is pluggable, and the default is honest about itself ──────
 *
 * The obvious implementation loads CLIP through `@xenova/transformers`. That is
 * ~90 MB of weights resident in the API process, and embedding.service.js
 * already declines a 23 MB model on this deployment's instance size with a
 * reasoning that applies here with more force. So the extractor is an
 * interface, and two implementations exist:
 *
 *   - `perceptual`, the default: a compact descriptor computed here from the
 *     decoded pixels — colour histograms in HSV, edge-orientation histograms,
 *     and a coarse spatial layout grid. It genuinely works for the dominant
 *     case, which is matching a photographed product against catalogue
 *     photography of the same product: same object, similar framing. It does
 *     not do semantics. It cannot tell you a photo of a tap means "plumbing",
 *     and no amount of tuning will make it.
 *
 *   - `transformers`: used when `@xenova/transformers` is installed and
 *     `ml_visual_extractor` names it. Same interface, real semantics, a real
 *     memory cost.
 *
 * Which one produced an embedding is stored on the row, because vectors from
 * two extractors are not comparable and searching a mixed index silently
 * returns nonsense.
 *
 * ── The confidence floor is the important part ─────────────────────────────
 *
 * A nearest-neighbour search always returns a nearest neighbour. On a photo of
 * something the catalogue does not contain, it returns the least-unlike item,
 * confidently. So a similarity floor is applied and, below it, the query falls
 * back to keyword search on whatever text the client supplied. An honest "we
 * could not match that, here is what we found for 'tap'" is a better product
 * than a confident wrong shop.
 */

const crypto = require('crypto');
const { query } = require('../../../config/database');
const logger = require('../../../config/logger');

/** Descriptor layout. Changing any of these invalidates every stored vector. */
const HUE_BINS = 24;
const SATURATION_BINS = 8;
const VALUE_BINS = 8;
const EDGE_BINS = 16;
const GRID = 4;                       // 4x4 spatial cells
const GRID_CHANNELS = 3;              // mean H, S, V per cell
const PERCEPTUAL_DIM =
  HUE_BINS + SATURATION_BINS + VALUE_BINS + EDGE_BINS + GRID * GRID * GRID_CHANNELS;

const SUPPORTED_MIME = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** RGB to HSV, with H in [0,1). */
function rgbToHsv(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta > 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h /= 6;
    if (h < 0) h += 1;
  }

  return { h, s: max > 0 ? delta / max : 0, v: max };
}

/**
 * Builds the descriptor from decoded pixel data.
 *
 * Takes `{ width, height, data }` with RGBA bytes — the shape every decoder in
 * the ecosystem produces — so this function is testable on synthetic images
 * without any decoder installed at all.
 *
 * Saturation-weighted hue binning: on a photograph of a grey tap, the hue of
 * each near-grey pixel is numerical noise, and counting those hues equally
 * would fill the histogram with a random pattern that dominates the distance.
 * Weighting by saturation means only pixels with an actual colour contribute a
 * hue.
 */
function describePixels({ width, height, data }) {
  if (!width || !height || !data || data.length < width * height * 4) {
    throw new Error('Visual search: pixel buffer is smaller than its declared dimensions');
  }

  const hue = new Float64Array(HUE_BINS);
  const saturation = new Float64Array(SATURATION_BINS);
  const value = new Float64Array(VALUE_BINS);
  const edges = new Float64Array(EDGE_BINS);
  const grid = new Float64Array(GRID * GRID * GRID_CHANNELS);
  const gridCounts = new Float64Array(GRID * GRID);

  // Luminance, kept for the edge pass.
  const luma = new Float64Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const p = (y * width + x) * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const alpha = data[p + 3];

      luma[y * width + x] = 0.299 * r + 0.587 * g + 0.114 * b;

      // Transparent pixels are background, not content. A PNG cut-out would
      // otherwise contribute a large block of one colour that exists in no
      // photograph of the same object.
      if (alpha < 16) continue;

      const { h, s, v } = rgbToHsv(r, g, b);

      hue[Math.min(Math.floor(h * HUE_BINS), HUE_BINS - 1)] += s;
      saturation[Math.min(Math.floor(s * SATURATION_BINS), SATURATION_BINS - 1)] += 1;
      value[Math.min(Math.floor(v * VALUE_BINS), VALUE_BINS - 1)] += 1;

      const cellX = Math.min(Math.floor((x / width) * GRID), GRID - 1);
      const cellY = Math.min(Math.floor((y / height) * GRID), GRID - 1);
      const cell = (cellY * GRID + cellX) * GRID_CHANNELS;
      grid[cell] += h;
      grid[cell + 1] += s;
      grid[cell + 2] += v;
      gridCounts[cellY * GRID + cellX] += 1;
    }
  }

  // Sobel, for edge orientation. Shape survives lighting changes that destroy
  // colour histograms, so this is what carries the match when a photo is taken
  // under a different bulb than the catalogue shot.
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const at = (dx, dy) => luma[(y + dy) * width + (x + dx)];
      const gx =
        -at(-1, -1) + at(1, -1) +
        -2 * at(-1, 0) + 2 * at(1, 0) +
        -at(-1, 1) + at(1, 1);
      const gy =
        -at(-1, -1) - 2 * at(0, -1) - at(1, -1) +
        at(-1, 1) + 2 * at(0, 1) + at(1, 1);

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      if (magnitude < 20) continue; // Below this is sensor noise, not an edge.

      let angle = Math.atan2(gy, gx);
      if (angle < 0) angle += Math.PI; // Orientation, not direction: 0..π.
      const bin = Math.min(Math.floor((angle / Math.PI) * EDGE_BINS), EDGE_BINS - 1);
      edges[bin] += magnitude;
    }
  }

  for (let cell = 0; cell < GRID * GRID; cell += 1) {
    const count = gridCounts[cell] || 1;
    for (let c = 0; c < GRID_CHANNELS; c += 1) grid[cell * GRID_CHANNELS + c] /= count;
  }

  // Each block normalised independently, then concatenated. Normalising the
  // concatenation instead would let the edge block — whose raw magnitudes are
  // orders larger than a histogram count — dominate the whole descriptor.
  const out = new Float32Array(PERCEPTUAL_DIM);
  let offset = 0;
  for (const block of [hue, saturation, value, edges]) {
    let sum = 0;
    for (const v of block) sum += v;
    const inv = sum > 0 ? 1 / sum : 0;
    for (const v of block) {
      out[offset] = v * inv;
      offset += 1;
    }
  }
  for (const v of grid) {
    out[offset] = v;
    offset += 1;
  }

  // Final L2 normalisation so cosine is a dot product.
  let sumSq = 0;
  for (let i = 0; i < out.length; i += 1) sumSq += out[i] * out[i];
  const norm = Math.sqrt(sumSq);
  if (norm > 0) for (let i = 0; i < out.length; i += 1) out[i] /= norm;

  return out;
}

/**
 * Decodes an image buffer to RGBA pixels.
 *
 * Tries the optional decoders in turn and reports clearly when none is present,
 * rather than failing with whatever error the first missing module happened to
 * throw. `sharp` is the usual one in a Node image pipeline; `jpeg-js` and
 * `pngjs` are the pure-JS fallbacks.
 */
async function decodeImage(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Visual search: empty image buffer');
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`Visual search: image exceeds ${MAX_IMAGE_BYTES} bytes`);
  }

  try {
    const sharp = require('sharp');
    // Downscaled before analysis. The descriptor is scale-invariant by
    // construction, and at full resolution the Sobel pass over a 12-megapixel
    // phone photo is the whole latency budget.
    const { data, info } = await sharp(buffer)
      .resize(224, 224, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { width: info.width, height: info.height, data };
  } catch (err) {
    if (!/Cannot find module/.test(err.message)) throw err;
  }

  if (mimeType === 'image/jpeg') {
    try {
      const jpeg = require('jpeg-js');
      const decoded = jpeg.decode(buffer, { useTArray: true });
      return { width: decoded.width, height: decoded.height, data: decoded.data };
    } catch (err) {
      if (!/Cannot find module/.test(err.message)) throw err;
    }
  }

  if (mimeType === 'image/png') {
    try {
      const { PNG } = require('pngjs');
      const decoded = PNG.sync.read(buffer);
      return { width: decoded.width, height: decoded.height, data: decoded.data };
    } catch (err) {
      if (!/Cannot find module/.test(err.message)) throw err;
    }
  }

  const error = new Error(
    'Visual search needs an image decoder. Install "sharp" (recommended), or ' +
    '"jpeg-js" and "pngjs" for a pure-JavaScript fallback.'
  );
  error.code = 'NO_DECODER';
  throw error;
}

/** Extractor registry. Each returns a unit-norm Float32Array. */
const EXTRACTORS = {
  perceptual: {
    name: 'perceptual/1',
    dimension: PERCEPTUAL_DIM,
    async embed(buffer, mimeType) {
      return describePixels(await decodeImage(buffer, mimeType));
    },
  },

  transformers: {
    name: 'clip-vit-base/1',
    dimension: 512,
    async embed(buffer) {
      let pipeline;
      try {
        ({ pipeline } = require('@xenova/transformers'));
      } catch {
        const error = new Error(
          '@xenova/transformers is not installed; set ml_visual_extractor to "perceptual".'
        );
        error.code = 'NO_EXTRACTOR';
        throw error;
      }
      if (!EXTRACTORS.transformers._pipeline) {
        EXTRACTORS.transformers._pipeline = await pipeline(
          'image-feature-extraction',
          'Xenova/clip-vit-base-patch32'
        );
      }
      const output = await EXTRACTORS.transformers._pipeline(buffer);
      const vector = Float32Array.from(output.data);
      let sumSq = 0;
      for (let i = 0; i < vector.length; i += 1) sumSq += vector[i] * vector[i];
      const norm = Math.sqrt(sumSq);
      if (norm > 0) for (let i = 0; i < vector.length; i += 1) vector[i] /= norm;
      return vector;
    },
  },
};

function getExtractor(name = 'perceptual') {
  return EXTRACTORS[name] || EXTRACTORS.perceptual;
}

function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i += 1) dot += a[i] * b[i];
  return dot;
}

/** In-memory copy of ml_visual_embeddings, refreshed on a TTL. */
const CACHE_TTL_MS = 15 * 60 * 1000;
let cache = null;

async function loadIndex({ force = false, extractor = 'perceptual' } = {}) {
  if (!force && cache && cache.extractor === extractor && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache;
  }

  const entries = [];
  try {
    const res = await query(
      `SELECT item_type, item_id, vector, dimension
         FROM ml_visual_embeddings
        WHERE extractor = $1`,
      [getExtractor(extractor).name]
    );
    for (const row of res.rows || res || []) {
      let parsed;
      try {
        parsed = JSON.parse(row.vector);
      } catch {
        continue;
      }
      if (!Array.isArray(parsed)) continue;
      entries.push({
        itemType: row.item_type,
        itemId: String(row.item_id),
        vector: Float32Array.from(parsed),
      });
    }
  } catch (err) {
    logger.warn('Visual search: embedding index unavailable: ' + err.message);
  }

  cache = { entries, extractor, loadedAt: Date.now() };
  return cache;
}

/**
 * Embeds and stores one catalogue image.
 *
 * Skips the work when the content hash matches what is already stored.
 * Re-embedding unchanged images is the largest avoidable cost in the indexing
 * job, and the URL is not a usable key because the catalogue re-uploads under
 * the same path.
 */
async function indexImage({ itemType, itemId, buffer, mimeType, sourceUrl = null, extractor = 'perceptual' }) {
  const impl = getExtractor(extractor);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 64);

  try {
    const existing = await query(
      'SELECT id, source_hash FROM ml_visual_embeddings WHERE item_type = $1 AND item_id = $2',
      [itemType, String(itemId)]
    );
    const row = (existing.rows || existing || [])[0];
    if (row && row.source_hash === hash) {
      return { indexed: false, reason: 'unchanged', item_id: String(itemId) };
    }

    const vector = await impl.embed(buffer, mimeType);
    const payload = Array.from(vector, (v) => Math.round(v * 1e6) / 1e6);

    if (row) {
      await query(
        `UPDATE ml_visual_embeddings
            SET dimension = $1, vector = $2, source_url = $3, source_hash = $4,
                extractor = $5, created_at = CURRENT_TIMESTAMP
          WHERE id = $6`,
        [vector.length, JSON.stringify(payload), sourceUrl, hash, impl.name, row.id]
      );
    } else {
      await query(
        `INSERT INTO ml_visual_embeddings
           (id, item_type, item_id, dimension, vector, source_url, source_hash, extractor)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [crypto.randomUUID(), itemType, String(itemId), vector.length,
          JSON.stringify(payload), sourceUrl, hash, impl.name]
      );
    }

    cache = null;
    return { indexed: true, item_id: String(itemId), dimension: vector.length };
  } catch (err) {
    logger.warn(`Visual search: could not index ${itemType}/${itemId}: ${err.message}`);
    return { indexed: false, reason: 'error', error: err.message, item_id: String(itemId) };
  }
}

/**
 * Matches a query image against the catalogue.
 *
 * Returns `{ matches, confident, extractor }`. `confident` is the caller's
 * signal to use the matches at all — below the floor, the route falls back to
 * keyword search rather than presenting a bad match as a good one.
 */
async function search(buffer, { mimeType = 'image/jpeg', k = 10, minScore = 0.45, extractor = 'perceptual' } = {}) {
  const started = Date.now();

  if (!SUPPORTED_MIME.includes(mimeType)) {
    const error = new Error(`Unsupported image type "${mimeType}". Expected one of: ${SUPPORTED_MIME.join(', ')}`);
    error.status = 415;
    throw error;
  }

  const impl = getExtractor(extractor);
  const queryVector = await impl.embed(buffer, mimeType);

  const index = await loadIndex({ extractor });
  if (index.entries.length === 0) {
    return {
      matches: [],
      confident: false,
      reason: 'index_empty',
      extractor: impl.name,
      duration_ms: Date.now() - started,
    };
  }

  const scored = [];
  for (const entry of index.entries) {
    // Vectors of a different length come from a different extractor version.
    // Comparing them produces a number, and the number is meaningless.
    if (entry.vector.length !== queryVector.length) continue;
    scored.push({
      item_type: entry.itemType,
      item_id: entry.itemId,
      score: cosine(queryVector, entry.vector),
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const matches = scored.slice(0, k);
  const best = matches.length > 0 ? matches[0].score : 0;

  return {
    matches,
    best_score: best,
    confident: best >= minScore,
    threshold: minScore,
    extractor: impl.name,
    indexed_items: index.entries.length,
    duration_ms: Date.now() - started,
  };
}

async function stats() {
  try {
    const res = await query(
      `SELECT extractor, COUNT(*) AS items, MAX(dimension) AS dimension, MAX(created_at) AS newest
         FROM ml_visual_embeddings GROUP BY extractor`
    );
    const rows = res.rows || res || [];
    return {
      indexed: rows.reduce((sum, row) => sum + (Number(row.items) || 0), 0),
      by_extractor: rows.map((row) => ({
        extractor: row.extractor,
        items: Number(row.items) || 0,
        dimension: Number(row.dimension) || 0,
        newest: row.newest,
      })),
      available_extractors: Object.keys(EXTRACTORS),
      perceptual_dimension: PERCEPTUAL_DIM,
    };
  } catch (err) {
    return { indexed: 0, error: err.message };
  }
}

function invalidate() {
  cache = null;
}

module.exports = {
  search,
  indexImage,
  describePixels,
  decodeImage,
  getExtractor,
  loadIndex,
  invalidate,
  stats,
  cosine,
  rgbToHsv,
  PERCEPTUAL_DIM,
  SUPPORTED_MIME,
  MAX_IMAGE_BYTES,
  EXTRACTORS,
};
