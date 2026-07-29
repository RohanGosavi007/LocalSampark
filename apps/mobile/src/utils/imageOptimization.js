import { PixelRatio } from 'react-native';
import { Image } from 'expo-image';

/**
 * Appends DPR-aware resolution params to CDN image URLs.
 * Avoids downloading oversized raw assets on mobile screens.
 */
export function getOptimizedImageUrl(url, targetWidth = 300, quality = 80) {
  if (!url || typeof url !== 'string') return url;
  if (!url.startsWith('http')) return url; // Ignore local assets or base64

  const dpr = PixelRatio.get();
  const actualWidth = Math.round(targetWidth * dpr);

  // Append query params if CDN supports it
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}w=${actualWidth}&q=${quality}`;
}

/**
 * Ahead-of-Time (AoT) Image Prefetching.
 * Prefetches the first N images of a feed into the memory/disk LRU cache.
 */
export async function prefetchImages(urls = [], limit = 10) {
  if (!Array.isArray(urls)) return;

  const targetUrls = urls.slice(0, limit).filter(u => typeof u === 'string' && u.startsWith('http'));
  
  try {
    await Promise.all(
      targetUrls.map(url => Image.prefetch(getOptimizedImageUrl(url, 300)))
    );
  } catch (err) {
    console.warn('[AoT Prefetch Error]:', err);
  }
}

/**
 * Time-Slicing (Chunking) for heavy array processing.
 * Prevents JS event loop lockups during large filtering or sorting tasks.
 */
export function timeSliceProcess(items, processFn, chunkSize = 50) {
  return new Promise((resolve) => {
    let index = 0;
    const results = [];

    function processChunk() {
      const end = Math.min(index + chunkSize, items.length);
      for (; index < end; index++) {
        results.push(processFn(items[index], index));
      }

      if (index < items.length) {
        requestAnimationFrame(processChunk);
      } else {
        resolve(results);
      }
    }

    processChunk();
  });
}
