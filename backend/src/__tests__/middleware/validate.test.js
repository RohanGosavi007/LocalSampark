/**
 * The shared request validator.
 */

const { validate, validateObject } = require('../../middleware/validate');

const run = (schema, body, opts) => validateObject(body, schema, opts);
const fields = (r) => r.errors.map((e) => e.field);

describe('strings', () => {
  const s = { name: { type: 'string', required: true, minLength: 2, maxLength: 5 } };

  test('are trimmed, and the trimmed value is what the handler gets', () => {
    expect(run(s, { name: '  Asha ' }).value.name).toBe('Asha');
  });
  test('required means present and non-blank', () => {
    expect(fields(run(s, {}))).toEqual(['name']);
    expect(fields(run(s, { name: '   ' }))).toEqual(['name']);
    expect(fields(run(s, { name: null }))).toEqual(['name']);
  });
  test('length limits apply after trimming', () => {
    expect(fields(run(s, { name: 'a' }))).toEqual(['name']);
    expect(fields(run(s, { name: 'abcdef' }))).toEqual(['name']);
    expect(run(s, { name: ' ab ' }).errors).toEqual([]);
  });
  test('an object or array is refused rather than stringified into "[object Object]"', () => {
    expect(fields(run(s, { name: { a: 1 } }))).toEqual(['name']);
    expect(fields(run(s, { name: ['ab'] }))).toEqual(['name']);
  });
  test('a number is accepted as text (phones and codes arrive both ways)', () => {
    expect(run({ code: { type: 'string', format: 'digits' } }, { code: 123456 }).value.code).toBe('123456');
  });
  test('enum and pattern', () => {
    expect(fields(run({ t: { type: 'string', enum: ['a', 'b'] } }, { t: 'c' }))).toEqual(['t']);
    expect(run({ t: { type: 'string', enum: ['a', 'b'] } }, { t: 'a' }).errors).toEqual([]);
    expect(fields(run({ p: { type: 'string', pattern: /^[A-Z]{2}$/ } }, { p: 'abc' }))).toEqual(['p']);
  });
});

describe('formats', () => {
  const ok = (format, v) => run({ x: { type: 'string', format } }, { x: v }).errors.length === 0;

  test.each([
    ['email', 'a@b.co', true], ['email', 'not-an-email', false], ['email', 'a b@c.com', false],
    ['url', 'https://x.test/a?b=1', true], ['url', 'javascript:alert(1)', false], ['url', 'ftp://x.test', false], ['url', 'x.test', false],
    ['phone', '+919876543210', true], ['phone', '9876543210', true], ['phone', '12345', false], ['phone', '98765abcde', false],
    ['uuid', '123e4567-e89b-12d3-a456-426614174000', true], ['uuid', 'not-a-uuid', false],
    ['digits', '0042', true], ['digits', '4x2', false],
    ['date', '2026-06-15', true], ['date', 'next tuesday', false],
  ])('%s %j → %s', (format, value, expected) => {
    expect(ok(format, value)).toBe(expected);
  });
});

describe('numbers', () => {
  test('numeric strings are coerced', () => {
    expect(run({ n: { type: 'number' } }, { n: '12.5' }).value.n).toBe(12.5);
    expect(run({ n: { type: 'integer' } }, { n: '7' }).value.n).toBe(7);
  });
  test('non-numbers, NaN and Infinity are refused', () => {
    for (const bad of ['abc', NaN, Infinity, {}, [], true]) {
      expect(fields(run({ n: { type: 'number' } }, { n: bad }))).toEqual(['n']);
    }
  });
  test('integer rejects fractions; ranges are inclusive', () => {
    expect(fields(run({ n: { type: 'integer' } }, { n: 1.5 }))).toEqual(['n']);
    const r = { n: { type: 'integer', min: 1, max: 5 } };
    expect(run(r, { n: 1 }).errors).toEqual([]);
    expect(run(r, { n: 5 }).errors).toEqual([]);
    expect(fields(run(r, { n: 0 }))).toEqual(['n']);
    expect(fields(run(r, { n: 99 }))).toEqual(['n']);
  });
  test('zero is a value, not a missing one', () => {
    expect(run({ n: { type: 'number', required: true } }, { n: 0 }).errors).toEqual([]);
  });
});

describe('booleans, arrays, objects', () => {
  test('booleans accept the spellings forms and query strings use', () => {
    for (const [raw, expected] of [[true, true], ['true', true], ['1', true], [1, true], [false, false], ['false', false], ['0', false], [0, false]]) {
      expect(run({ b: { type: 'boolean' } }, { b: raw }).value.b).toBe(expected);
    }
    expect(fields(run({ b: { type: 'boolean' } }, { b: 'yes' }))).toEqual(['b']);
  });
  test('arrays are bounded and each item is checked and cleaned', () => {
    const r = { tags: { type: 'array', minItems: 1, maxItems: 2, items: { type: 'string', maxLength: 3 } } };
    expect(run(r, { tags: [' a ', 'b'] }).value.tags).toEqual(['a', 'b']);
    expect(fields(run(r, { tags: [] }))).toEqual(['tags']);
    expect(fields(run(r, { tags: ['a', 'b', 'c'] }))).toEqual(['tags']);
    expect(run(r, { tags: ['toolong'] }).errors[0].message).toContain('tags[0]');
    expect(fields(run(r, { tags: 'a' }))).toEqual(['tags']);
  });
  test('an array of URLs rejects the one bad link', () => {
    const r = { urls: { type: 'array', items: { type: 'string', format: 'url' } } };
    expect(fields(run(r, { urls: ['https://a.test', 'javascript:x'] }))).toEqual(['urls']);
  });
  test('object means a plain object, not an array or null', () => {
    expect(run({ o: { type: 'object' } }, { o: { a: 1 } }).errors).toEqual([]);
    expect(fields(run({ o: { type: 'object' } }, { o: [] }))).toEqual(['o']);
  });
});

describe('absent values', () => {
  test('optional fields may be missing; defaults fill in', () => {
    expect(run({ n: { type: 'integer', default: 3 } }, {}).value.n).toBe(3);
    expect(run({ n: { type: 'integer', default: () => 7 } }, {}).value.n).toBe(7);
    expect(run({ s: { type: 'string' } }, {}).errors).toEqual([]);
  });
  test('an empty string for an optional field is treated as not supplied', () => {
    const r = run({ email: { type: 'string', format: 'email' } }, { email: '' });
    expect(r.errors).toEqual([]);
    expect(r.value.email).toBeUndefined();
  });
  test('null is allowed only where the rule says so', () => {
    expect(run({ x: { type: 'string', nullable: true } }, { x: null }).value.x).toBeNull();
    expect(run({ x: { type: 'string', nullable: true, required: true } }, { x: null }).value.x).toBeNull();
  });
});

describe('what it leaves alone', () => {
  test('undeclared fields pass through untouched', () => {
    expect(run({ a: { type: 'string' } }, { a: 'x', extra: { deep: 1 } }).value.extra).toEqual({ deep: 1 });
  });
  test('strict mode rejects them instead', () => {
    expect(fields(run({ a: { type: 'string' } }, { a: 'x', extra: 1 }, { strict: true }))).toEqual(['extra']);
  });
  test('a missing or non-object body validates as empty', () => {
    expect(fields(run({ a: { type: 'string', required: true } }, undefined))).toEqual(['a']);
    expect(fields(run({ a: { type: 'string', required: true } }, 'a string'))).toEqual(['a']);
  });
  test('reports every problem, with the first as the readable message', () => {
    const r = run({ a: { type: 'string', required: true }, n: { type: 'integer', min: 1 } }, { n: 0 });
    expect(fields(r)).toEqual(['a', 'n']);
  });
});

describe('as middleware', () => {
  const call = (mw, req) => {
    const res = { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
    let nexted = false;
    mw(req, res, () => { nexted = true; });
    return { res, nexted };
  };

  test('a valid request continues, with cleaned values on req.body', () => {
    const mw = validate({ n: { type: 'integer', required: true } });
    const req = { body: { n: '4', other: 1 } };
    const { nexted } = call(mw, req);
    expect(nexted).toBe(true);
    expect(req.body).toEqual({ n: 4, other: 1 });
  });

  test('an invalid one is a 400 whose `error` is readable and `errors` is per field', () => {
    const { res, nexted } = call(validate({ n: { type: 'integer', required: true, min: 1, max: 5, label: 'Rating' } }), { body: { n: 99 } });
    expect(nexted).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'Rating must be at most 5', errors: [{ field: 'n', message: 'Rating must be at most 5' }] });
  });

  test('can validate the query string or the path instead', () => {
    const req = { query: { page: '2' }, body: {} };
    const { nexted } = call(validate({ page: { type: 'integer', min: 1 } }, { source: 'query' }), req);
    expect(nexted).toBe(true);
    expect(req.query.page).toBe(2);
  });

  test('a schema with an unknown type fails when the route is defined', () => {
    expect(() => validate({ a: { type: 'strnig' } })).toThrow(/unknown type/);
  });
});
