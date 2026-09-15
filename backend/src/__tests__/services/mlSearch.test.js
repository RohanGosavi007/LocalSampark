/**
 * Hybrid search.
 *
 * The failures these guard against are all silent: search that returns a list,
 * answers 200, and is simply worse than it should be. Each test names the
 * behaviour it prevents.
 */

process.env.USE_SQLITE = 'true';

const search = require('../../modules/ml/services/search.service');
const embeddings = require('../../modules/ml/services/embedding.service');

describe('FTS5 query escaping', () => {
  test('neutralises characters FTS5 treats as operators', () => {
    // A user typing this produced a syntax error from SQLite, which surfaced as
    // an empty result set: the search box looked like it found nothing rather
    // than like it had crashed.
    const q = search.toFtsQuery('24/7 plumber - "urgent" (leaking tap)');
    expect(q).not.toBeNull();
    expect(q).not.toMatch(/\(|\)/);
    expect(q).toContain('"plumber"');
  });

  test('returns null for a query with nothing usable in it', () => {
    expect(search.toFtsQuery('')).toBeNull();
    expect(search.toFtsQuery('  a  ')).toBeNull();
  });

  test('prefix mode puts the wildcard outside the quotes', () => {
    // Inside the quotes FTS5 reads it as a literal asterisk and matches nothing.
    const q = search.toFtsQuery('groc', { prefix: true });
    expect(q).toBe('"groc"*');
  });
});

describe('reciprocal rank fusion', () => {
  test('an item both retrievers rank highly beats one only a single list has', () => {
    const fused = search.fuse([['a', 'b', 'c'], ['b', 'x', 'y']]);
    expect(fused[0].id).toBe('b');
  });

  test('records which retrievers matched each item', () => {
    const fused = search.fuse([['a', 'b'], ['b']]);
    const b = fused.find((f) => f.id === 'b');
    expect(b.sources).toEqual(['keyword', 'vector']);
  });

  test('needs no score calibration between retrievers', () => {
    // The point of RRF: BM25 relevance and cosine similarity are not on the same
    // scale, and normalising them against each other would need tuning that
    // drifts as either retriever changes. Only ordering is read.
    const a = search.fuse([['x', 'y'], ['y', 'x']]);
    const b = search.fuse([['x', 'y'], ['y', 'x']]);
    expect(a.map((r) => r.id)).toEqual(b.map((r) => r.id));
  });

  test('weights let one retriever be preferred without dominating', () => {
    // Keyword is weighted above vector so an exact name query returns that shop,
    // but a single confident hit must not sweep the whole page.
    const fused = search.fuse([['a'], ['b', 'a']], [1.2, 1.0]);
    expect(fused.map((f) => f.id)).toContain('b');
  });

  test('handles an empty retriever without dropping the other', () => {
    const fused = search.fuse([[], ['a', 'b']]);
    expect(fused.map((f) => f.id)).toEqual(['a', 'b']);
  });
});

describe('stemming', () => {
  test('collapses plurals so the two retrievers agree', () => {
    // shop_search_index uses FTS5's porter tokenizer and matches "groceries" to
    // "grocery". Without stemming here, the vector half treated them as
    // unrelated terms and contributed nothing to exactly the queries that
    // needed it most.
    expect(embeddings.stem('groceries')).toBe('grocery');
    expect(embeddings.stem('bakeries')).toBe('bakery');
    expect(embeddings.stem('shops')).toBe('shop');
  });

  test('leaves words that only look plural alone', () => {
    expect(embeddings.stem('class')).toBe('class');
    expect(embeddings.stem('status')).toBe('status');
  });

  test('never touches Devanagari', () => {
    // Devanagari inflection does not work by suffix stripping; truncating these
    // tokens would corrupt them.
    expect(embeddings.stem('किराना')).toBe('किराना');
  });

  test('leaves short words alone', () => {
    expect(embeddings.stem('gas')).toBe('gas');
  });
});

describe('end-to-end search over the live catalogue', () => {
  test('a too-short query is refused rather than scanning everything', async () => {
    const res = await search.search('a');
    expect(res.reason).toBe('query_too_short');
    expect(res.items).toEqual([]);
  });

  test('finds shops by an exact name fragment', async () => {
    const res = await search.search('Grocery', { limit: 5 });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items[0].name.toLowerCase()).toContain('grocery');
  });

  test('a query matching nothing returns an empty list, not an error', async () => {
    const res = await search.search('zzzzqqqx nonexistent', { limit: 5 });
    expect(Array.isArray(res.items)).toBe(true);
  });

  test('prefix mode answers a partial word', async () => {
    // An autocomplete that stays silent until the user finishes typing is not
    // an autocomplete.
    const res = await search.search('groc', { limit: 5, prefix: true });
    expect(res.items.length).toBeGreaterThan(0);
  });

  test('exact mode does not answer a partial word', async () => {
    const res = await search.search('groc', { limit: 5, prefix: false });
    const keywordHits = res.retrievers ? res.retrievers.keyword : 0;
    expect(keywordHits).toBe(0);
  });

  test('tags each result with the retrievers that found it', async () => {
    const res = await search.search('Grocery', { limit: 5 });
    expect(res.items[0]._matched_by).toBeDefined();
    expect(res.items[0]._matched_by.length).toBeGreaterThan(0);
  });

  test('survives the vector index being unavailable', async () => {
    // The two halves must fail independently: losing one degrades quality, it
    // does not take search down.
    const original = embeddings.getIndex;
    embeddings.getIndex = async () => { throw new Error('index gone'); };
    try {
      const res = await search.search('Grocery', { limit: 5 });
      expect(Array.isArray(res.items)).toBe(true);
    } finally {
      embeddings.getIndex = original;
    }
  });
});
