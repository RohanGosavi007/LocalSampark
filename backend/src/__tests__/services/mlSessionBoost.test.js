/**
 * Session intent hints applied to ranking.
 *
 * The security property is the one worth pinning down: these values arrive from
 * a mobile client, and a modified app is not hypothetical on Android. A client
 * that could set ranking parameters could promote its own results, so every
 * test below is really asking the same question — can a hostile client get more
 * than a bounded nudge?
 */

process.env.USE_SQLITE = 'true';

const sessionBoost = require('../../modules/ml/ranking/sessionBoost');
const mlconfig = require('../../modules/ml/services/mlconfig.service');

const BASE = {
  ml_w_dist: 0.4, ml_w_sim: 0.25, ml_w_pop: 0.2, ml_epsilon: 0.12,
  ml_mmoe_beta: 1.0, ml_mmoe_gamma: 1.0, ml_mmoe_lambda: 0.15,
};

describe('tag parsing', () => {
  test('recognises the vocabulary and drops everything else', () => {
    const out = sessionBoost.parseTags([
      'intent:urgent', 'prefer:proximity', 'category:pharmacy',
      'prefer:nonsense', 'ml_w_dist=99', '../../etc/passwd',
    ]);
    expect(out.intent).toBe('urgent');
    expect(out.category).toBe('pharmacy');
    expect(out.tags).toEqual(['prefer:proximity']);
  });

  test('accepts a comma-separated string as well as an array', () => {
    const out = sessionBoost.parseTags('intent:browsing,prefer:discovery');
    expect(out.intent).toBe('browsing');
    expect(out.tags).toContain('prefer:discovery');
  });

  test('an unknown intent value is ignored rather than trusted', () => {
    expect(sessionBoost.parseTags(['intent:administrator']).intent).toBeNull();
  });

  test('caps how many tags it will look at', () => {
    // A client sending a thousand tags should not make the parser do work.
    const many = Array.from({ length: 500 }, () => 'prefer:proximity');
    expect(sessionBoost.parseTags(many).tags.length).toBeLessThanOrEqual(sessionBoost.MAX_TAGS);
  });

  test('garbage input yields empty hints, not an exception', () => {
    for (const input of [null, undefined, 42, {}, [null, undefined, '']]) {
      expect(() => sessionBoost.parseTags(input)).not.toThrow();
    }
  });

  test('a category is length-capped', () => {
    const out = sessionBoost.parseTags([`category:${'x'.repeat(500)}`]);
    expect(out.category.length).toBeLessThanOrEqual(64);
  });
});

describe('hint application is bounded', () => {
  test('no sequence of tags escapes the admin-configured bounds', () => {
    // The central guarantee. Repeat every amplifying tag many times and check
    // that nothing leaves the range an administrator permitted.
    let cfg = { ...BASE };
    for (let i = 0; i < 50; i += 1) {
      cfg = sessionBoost.applyHints(
        cfg,
        { tags: ['prefer:proximity', 'prefer:conversion', 'prefer:responsive', 'prefer:discovery'], confidence: 1 },
        mlconfig.BOUNDS
      ).cfg;
    }
    for (const [key, value] of Object.entries(cfg)) {
      const bounds = mlconfig.BOUNDS[key];
      if (!bounds) continue;
      expect(value).toBeGreaterThanOrEqual(bounds[0]);
      expect(value).toBeLessThanOrEqual(bounds[1]);
    }
  });

  test('urgency raises proximity and suppresses exploration', () => {
    const { cfg } = sessionBoost.applyHints(BASE, { tags: ['prefer:proximity'], confidence: 1 }, mlconfig.BOUNDS);
    expect(cfg.ml_w_dist).toBeGreaterThan(BASE.ml_w_dist);
    // Somebody who needs a plumber now does not want a serendipity slot.
    expect(cfg.ml_epsilon).toBeLessThan(BASE.ml_epsilon);
  });

  test('browsing does the opposite', () => {
    const { cfg } = sessionBoost.applyHints(BASE, { tags: ['prefer:discovery'], confidence: 1 }, mlconfig.BOUNDS);
    expect(cfg.ml_epsilon).toBeGreaterThan(BASE.ml_epsilon);
    expect(cfg.ml_w_dist).toBeLessThan(BASE.ml_w_dist);
  });

  test('confidence scales the adjustment', () => {
    // A decisive-looking intent from two interactions should move ranking less
    // than the same intent from ten.
    const weak = sessionBoost.applyHints(BASE, { tags: ['prefer:proximity'], confidence: 0.2 }, mlconfig.BOUNDS).cfg;
    const strong = sessionBoost.applyHints(BASE, { tags: ['prefer:proximity'], confidence: 1 }, mlconfig.BOUNDS).cfg;
    expect(weak.ml_w_dist).toBeGreaterThan(BASE.ml_w_dist);
    expect(weak.ml_w_dist).toBeLessThan(strong.ml_w_dist);
  });

  test('zero confidence changes nothing', () => {
    const { cfg, applied } = sessionBoost.applyHints(BASE, { tags: ['prefer:proximity'], confidence: 0 }, mlconfig.BOUNDS);
    expect(cfg).toEqual(BASE);
    expect(applied).toEqual([]);
  });

  test('hints cannot switch ranking on', () => {
    // The kill switch must win over anything a client sends.
    const off = { ...BASE, ml_enabled: false, ml_mmoe_enabled: false };
    const { cfg } = sessionBoost.applyHints(off, { tags: ['prefer:proximity', 'prefer:conversion'], confidence: 1 }, mlconfig.BOUNDS);
    expect(cfg.ml_enabled).toBe(false);
    expect(cfg.ml_mmoe_enabled).toBe(false);
  });

  test('no tags leaves the config untouched by identity', () => {
    const { cfg } = sessionBoost.applyHints(BASE, { tags: [] }, mlconfig.BOUNDS);
    expect(cfg).toBe(BASE);
  });
});

describe('open-now filtering', () => {
  const shop = (hours) => ({ id: 's', opening_hours: hours });

  test('keeps a shop that is open', () => {
    expect(sessionBoost.isOpenAt(shop({ open: '09:00', close: '21:00' }), 14)).toBe(true);
  });

  test('excludes a shop that is closed', () => {
    expect(sessionBoost.isOpenAt(shop({ open: '09:00', close: '21:00' }), 23)).toBe(false);
  });

  test('handles a shop open past midnight', () => {
    // close <= open means the range wraps. A 22:00–06:00 pharmacy is exactly
    // the listing an urgent late-night query is looking for.
    const overnight = shop({ open: '22:00', close: '06:00' });
    expect(sessionBoost.isOpenAt(overnight, 23)).toBe(true);
    expect(sessionBoost.isOpenAt(overnight, 3)).toBe(true);
    expect(sessionBoost.isOpenAt(overnight, 12)).toBe(false);
  });

  test('unknown hours count as open', () => {
    // Excluding every shop that has not filled in its hours would empty the
    // urgent feed precisely when it matters most.
    expect(sessionBoost.isOpenAt(shop(null), 23)).toBe(true);
    expect(sessionBoost.isOpenAt(shop('not json'), 23)).toBe(true);
    expect(sessionBoost.isOpenAt(shop({}), 23)).toBe(true);
  });

  test('parses hours stored as a JSON string', () => {
    expect(sessionBoost.isOpenAt(shop('{"open":"09:00","close":"17:00"}'), 20)).toBe(false);
  });

  test('filters the candidate list', () => {
    const candidates = [
      { id: 'open', opening_hours: { open: '00:00', close: '23:59' } },
      { id: 'closed', opening_hours: { open: '09:00', close: '17:00' } },
    ];
    const out = sessionBoost.applyHardFilters(candidates, { tags: ['require:open_now'], localHour: 22 });
    expect(out.candidates.map((c) => c.id)).toEqual(['open']);
    expect(out.removed).toBe(1);
  });

  test('returns everything rather than an empty feed', () => {
    // A user can see for themselves that a shop is closed. They cannot see a
    // result that was never returned.
    const allClosed = [{ id: 'a', opening_hours: { open: '09:00', close: '17:00' } }];
    const out = sessionBoost.applyHardFilters(allClosed, { tags: ['require:open_now'], localHour: 23 });
    expect(out.candidates).toHaveLength(1);
    expect(out.reason).toBe('would_be_empty');
  });

  test('does nothing without the tag', () => {
    const candidates = [{ id: 'a', opening_hours: { open: '09:00', close: '17:00' } }];
    expect(sessionBoost.applyHardFilters(candidates, { tags: [], localHour: 23 }).candidates).toHaveLength(1);
  });
});

describe('category affinity boost', () => {
  test('boosts a matching category across the fields it may be stored in', () => {
    expect(sessionBoost.categoryBoost({ category_name: 'Pharmacy & Medical' }, 'pharmacy')).toBeGreaterThan(1);
    expect(sessionBoost.categoryBoost({ category_slug: 'pharmacy-healthcare' }, 'pharmacy')).toBeGreaterThan(1);
  });

  test('leaves a non-match at exactly 1, so it is a no-op', () => {
    expect(sessionBoost.categoryBoost({ category_name: 'Hardware' }, 'pharmacy')).toBe(1);
    expect(sessionBoost.categoryBoost({ category_name: 'Hardware' }, null)).toBe(1);
  });

  test('is bounded, so it cannot dominate the score', () => {
    expect(sessionBoost.categoryBoost({ category_name: 'Pharmacy' }, 'pharmacy')).toBeLessThanOrEqual(1.5);
  });
});
