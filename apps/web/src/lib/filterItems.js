/**
 * Filters shops or products by a free-text query and a category.
 *
 * Same rules as workers/search.worker.js, which /shops used to spawn as a new
 * Web Worker on every change to the list, the search box or the category:
 * one per keystroke, for a list of at most 100 shops. When the list loaded
 * twice in quick succession the first worker was terminated while its script
 * was still downloading, and that request never completed, so the page never
 * went network-idle (seen once E2E ran a production build). Filtering a
 * hundred items takes well under a millisecond on the main thread.
 */
export function filterItems(items, query, category) {
  const q = (query || '').toLowerCase().trim();
  return (items || []).filter((item) => {
    const matchQuery = !q
      || (item.name && item.name.toLowerCase().includes(q))
      || (item.description && item.description.toLowerCase().includes(q))
      || (Array.isArray(item.tags) && item.tags.some((t) => String(t).toLowerCase().includes(q)));
    const slug = item.category ? String(item.category).toLowerCase().replace(/ /g, '-') : '';
    const matchCategory = !category || category === 'all' || item.category === category || slug === category
      || String(item.category_id) === String(category) || String(item.categoryId) === String(category);
    return matchQuery && matchCategory;
  });
}
