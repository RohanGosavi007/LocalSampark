/**
 * The sequence trail on sessionIntentTracker.
 *
 * The trail is what the server's next-category model attends over, so its
 * failure modes are quiet: a trail that fills with scroll events teaches the
 * model that scrolling predicts scrolling, and one whose slugs the server
 * rejects produces no prediction at all while everything appears to work.
 *
 * These tests pin the admission rules, the wire format the server parses, and
 * the fact that the trail does not survive a reset.
 */

const {
  SessionIntentTracker,
  TRAIL_SIZE,
  TRAIL_DEDUPE_MS,
} = require('../src/services/sessionIntentTracker');

/** The exact expression the server validates each slug against. */
const SERVER_SLUG_PATTERN = /^[a-z0-9_-]{1,48}$/;

describe('trail admission', () => {
  test('records category-bearing engagements', () => {
    const tracker = new SessionIntentTracker();
    tracker.record('CARD_CLICK', { category: 'plumber' });
    tracker.record('DETAIL_VIEW', { category: 'grocery' });

    expect(tracker.sequenceEvents().map((e) => e.category)).toEqual(['plumber', 'grocery']);
  });

  test('ignores scrolls and impressions', () => {
    // At one entry per scroll event the fifty-entry window would cover about
    // four seconds of flicking rather than the session.
    const tracker = new SessionIntentTracker();
    for (let i = 0; i < 30; i += 1) {
      tracker.record('SCROLL', { category: 'grocery' });
      tracker.record('IMPRESSION', { category: 'grocery' });
    }
    expect(tracker.sequenceEvents()).toHaveLength(0);
  });

  test('ignores interactions with no category', () => {
    const tracker = new SessionIntentTracker();
    tracker.record('CARD_CLICK', {});
    tracker.record('SEARCH_SUBMIT', { category: null });
    expect(tracker.sequenceEvents()).toHaveLength(0);
  });

  test('rejects slugs the server would reject, rather than sending them', () => {
    const tracker = new SessionIntentTracker();
    tracker.record('CARD_CLICK', { category: 'home services' });   // space
    tracker.record('CARD_CLICK', { category: 'café' });            // non-ascii
    tracker.record('CARD_CLICK', { category: 'a'.repeat(60) });    // too long
    tracker.record('CARD_CLICK', { category: 'valid-slug_1' });

    const events = tracker.sequenceEvents();
    expect(events).toHaveLength(1);
    expect(events[0].category).toBe('valid-slug_1');
  });

  test('every emitted slug satisfies the server pattern', () => {
    const tracker = new SessionIntentTracker();
    for (const category of ['Plumber', 'GROCERY', 'salon_2', 'a-b-c']) {
      tracker.record('DETAIL_VIEW', { category });
    }
    for (const event of tracker.sequenceEvents()) {
      expect(SERVER_SLUG_PATTERN.test(event.category)).toBe(true);
    }
  });
});

describe('deduplication', () => {
  test('consecutive taps in one category collapse to a single entry', () => {
    // Tapping four plumbers in a row is one intent, not four.
    const tracker = new SessionIntentTracker();
    const t = Date.now();
    for (let i = 0; i < 4; i += 1) {
      tracker.record('CARD_CLICK', { category: 'plumber', at: t + i * 1000 });
    }
    expect(tracker.sequenceEvents()).toHaveLength(1);
  });

  test('the collapsed entry carries the most recent timestamp', () => {
    // The model's time embedding reads the gap from the latest contact with
    // the category, not the first.
    const tracker = new SessionIntentTracker();
    const t = Date.now();
    tracker.record('CARD_CLICK', { category: 'plumber', at: t });
    tracker.record('CARD_CLICK', { category: 'plumber', at: t + 5000 });

    expect(tracker.sequenceEvents()[0].at).toBe(t + 5000);
  });

  test('a return to the same category after the dedupe window is a new entry', () => {
    const tracker = new SessionIntentTracker();
    const t = Date.now();
    tracker.record('CARD_CLICK', { category: 'plumber', at: t });
    tracker.record('CARD_CLICK', { category: 'plumber', at: t + TRAIL_DEDUPE_MS + 1000 });

    expect(tracker.sequenceEvents()).toHaveLength(2);
  });

  test('alternating categories are not collapsed', () => {
    const tracker = new SessionIntentTracker();
    const t = Date.now();
    tracker.record('CARD_CLICK', { category: 'plumber', at: t });
    tracker.record('CARD_CLICK', { category: 'grocery', at: t + 100 });
    tracker.record('CARD_CLICK', { category: 'plumber', at: t + 200 });

    expect(tracker.sequenceEvents().map((e) => e.category))
      .toEqual(['plumber', 'grocery', 'plumber']);
  });
});

describe('bounds', () => {
  test('the trail never exceeds its cap', () => {
    const tracker = new SessionIntentTracker();
    const t = Date.now();
    for (let i = 0; i < TRAIL_SIZE * 3; i += 1) {
      // Distinct categories so nothing is deduplicated.
      tracker.record('CARD_CLICK', { category: `cat-${i}`, at: t + i * 1000 });
    }
    expect(tracker.sequenceEvents()).toHaveLength(TRAIL_SIZE);
  });

  test('the cap drops the oldest, keeping the most recent', () => {
    const tracker = new SessionIntentTracker();
    const t = Date.now();
    for (let i = 0; i < TRAIL_SIZE + 5; i += 1) {
      tracker.record('CARD_CLICK', { category: `cat-${i}`, at: t + i * 1000 });
    }
    const events = tracker.sequenceEvents();
    expect(events[events.length - 1].category).toBe(`cat-${TRAIL_SIZE + 4}`);
    expect(events[0].category).toBe('cat-5');
  });

  test('the trail is longer than the classification window', () => {
    // The two answer different questions over different horizons. If they were
    // the same length, the sequence model would be given the classifier's
    // two-minute view of a session that may be half an hour old.
    const tracker = new SessionIntentTracker();
    expect(TRAIL_SIZE).toBeGreaterThan(tracker.windowSize);
  });
});

describe('wire format', () => {
  test('serialises as slug:timestamp pairs, oldest first', () => {
    const tracker = new SessionIntentTracker();
    const t = 1760000000000;
    tracker.record('CARD_CLICK', { category: 'plumber', at: t });
    tracker.record('DETAIL_VIEW', { category: 'grocery', at: t + 1000 });

    expect(tracker.sequenceTrail()).toBe(`plumber:${t},grocery:${t + 1000}`);
  });

  test('an empty trail serialises to an empty string, not to a stray comma', () => {
    expect(new SessionIntentTracker().sequenceTrail()).toBe('');
  });

  test('round-trips through the server\'s parser shape', () => {
    // Mirrors parseSessionEvents in recommendations.routes.js. If the two ever
    // diverge, the trail is silently dropped server-side and the sequence model
    // receives nothing while the client reports sending it.
    const tracker = new SessionIntentTracker();
    const t = Date.now() - 5000;
    tracker.record('CARD_CLICK', { category: 'plumber', at: t });
    tracker.record('DETAIL_VIEW', { category: 'grocery', at: t + 1000 });

    const parsed = tracker.sequenceTrail().split(',').map((part) => {
      const [category, timestamp] = part.split(':');
      return { category, at: Number(timestamp) };
    });

    expect(parsed).toHaveLength(2);
    for (const entry of parsed) {
      expect(SERVER_SLUG_PATTERN.test(entry.category)).toBe(true);
      expect(Number.isFinite(entry.at)).toBe(true);
    }
  });

  test('getQueryContext exposes the trail for the request builder', () => {
    const tracker = new SessionIntentTracker();
    tracker.record('CARD_CLICK', { category: 'plumber' });
    expect(tracker.getQueryContext().session_events).toContain('plumber:');
  });
});

describe('lifecycle', () => {
  test('reset clears the trail', () => {
    // A trail surviving a reset would hand the model a history whose first half
    // belongs to whoever used the device before.
    const tracker = new SessionIntentTracker();
    tracker.record('CARD_CLICK', { category: 'plumber' });
    expect(tracker.sequenceEvents()).toHaveLength(1);

    tracker.reset();
    expect(tracker.sequenceEvents()).toHaveLength(0);
    expect(tracker.sequenceTrail()).toBe('');
  });

  test('sequenceEvents returns a copy, so a caller cannot corrupt the trail', () => {
    const tracker = new SessionIntentTracker();
    tracker.record('CARD_CLICK', { category: 'plumber' });

    tracker.sequenceEvents().push({ category: 'injected', at: Date.now() });

    expect(tracker.sequenceEvents()).toHaveLength(1);
  });

  test('snapshot includes the trail alongside the classification window', () => {
    const tracker = new SessionIntentTracker();
    tracker.record('CARD_CLICK', { category: 'plumber' });
    const snapshot = tracker.snapshot();
    expect(Array.isArray(snapshot.trail)).toBe(true);
    expect(snapshot.trail).toHaveLength(1);
  });
});

describe('the classification window is untouched', () => {
  test('intent classification still works alongside the trail', () => {
    // The trail is additive. If adding it had changed classify(), every feed
    // ranked by the existing boost-tag path would shift.
    const tracker = new SessionIntentTracker();
    tracker.record('CALL_TAP', { category: 'pharmacy' });
    const context = tracker.getQueryContext();

    expect(context.intent).toBe('urgent');
    expect(context.boost_tags.length).toBeGreaterThan(0);
  });

  test('the window still caps independently of the trail', () => {
    const tracker = new SessionIntentTracker();
    for (let i = 0; i < 30; i += 1) {
      tracker.record('CARD_CLICK', { category: `cat-${i}` });
    }
    expect(tracker.window.length).toBe(tracker.windowSize);
    expect(tracker.sequenceEvents().length).toBeGreaterThan(tracker.windowSize);
  });
});
