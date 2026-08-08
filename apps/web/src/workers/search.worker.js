/**
 * Client-Side Background Web Worker for Heavy Product/Shop Filtering
 * Runs off the main JS UI thread to guarantee 60 FPS scrolling.
 */
self.onmessage = function (e) {
  const { type, items, query, category } = e.data;

  if (type === 'FILTER_ITEMS') {
    const startTime = performance.now();
    const q = (query || '').toLowerCase().trim();

    const filtered = items.filter((item) => {
      const matchQuery = !q || 
        (item.name && item.name.toLowerCase().includes(q)) || 
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.tags && item.tags.some(t => t.toLowerCase().includes(q)));

      const itemCatSlug = item.category ? item.category.toLowerCase().replace(/ /g, '-') : '';
      const matchCategory = !category || category === 'all' || item.category === category || itemCatSlug === category || String(item.category_id) === String(category) || String(item.categoryId) === String(category);

      return matchQuery && matchCategory;
    });

    const executionTime = performance.now() - startTime;

    self.postMessage({
      type: 'FILTER_COMPLETE',
      filtered,
      executionTime,
      totalCount: filtered.length
    });
  }
};
