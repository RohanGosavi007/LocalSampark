/**
 * Declarative request validation.
 *
 *   router.post('/apply', authenticate, validate({
 *     jobId:     { type: 'string', required: true, maxLength: 64 },
 *     rating:    { type: 'integer', required: true, min: 1, max: 5 },
 *     video_url: { type: 'string', format: 'url' },
 *     tags:      { type: 'array', maxItems: 10, items: { type: 'string', maxLength: 30 } },
 *   }), handler);
 *
 * 523 write routes checked their input (when they did) by hand, differently each
 * time: `if (!x)` and nothing more, so a rating of 99, a 4 MB name or an array
 * where a string belonged all reached the database. This is the one place the
 * rules are written down, for the routes where it matters most.
 *
 * Behaviour:
 *   - Declared fields are checked and REPLACED by their cleaned value (trimmed
 *     strings, numbers coerced from "5"), so the handler sees what was validated.
 *   - Fields not declared are left alone: this is not a whitelist, and adding it
 *     to a route cannot break a client that sends extra data. Pass
 *     { strict: true } to reject them instead.
 *   - Failure is 400 with `error` (the first problem, readable as it stands) and
 *     `errors: [{ field, message }]` for a form to place beside each input.
 *   - `source` picks req.body (default), req.query or req.params.
 *
 * Types: string, number, integer, boolean, array, object.
 * Options: required, nullable, default, enum, min, max, minLength, maxLength,
 *          pattern, format ('email' | 'url' | 'phone' | 'uuid' | 'date' | 'digits'),
 *          items (for arrays), minItems, maxItems, label (for messages).
 */

const TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object'];

const FORMATS = {
  email: [/^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/, 'must be a valid email address'],
  phone: [/^\+?[0-9]{10,15}$/, 'must be a valid phone number'],
  uuid: [/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'must be a valid id'],
  digits: [/^[0-9]+$/, 'must contain digits only'],
};

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const absent = (v) => v === undefined || v === null || v === '';

function urlOk(value) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch (e) {
    return false;
  }
}

/** Checks one value against one rule. Returns { value } or { error }. */
function check(raw, rule, label) {
  const name = rule.label || label;
  let value = raw;

  switch (rule.type) {
    case 'string': {
      if (typeof value === 'number' || typeof value === 'boolean') value = String(value);
      if (typeof value !== 'string') return { error: `${name} must be text` };
      value = value.trim();
      if (rule.required && value === '') return { error: `${name} is required` };
      if (value === '') break;
      if (rule.minLength !== undefined && value.length < rule.minLength) return { error: `${name} must be at least ${rule.minLength} characters` };
      if (rule.maxLength !== undefined && value.length > rule.maxLength) return { error: `${name} must be at most ${rule.maxLength} characters` };
      if (rule.enum && !rule.enum.includes(value)) return { error: `${name} must be one of: ${rule.enum.join(', ')}` };
      if (rule.pattern && !rule.pattern.test(value)) return { error: `${name} is not in the expected format` };
      if (rule.format === 'url') {
        if (!urlOk(value)) return { error: `${name} must be an http(s) link` };
      } else if (rule.format === 'date') {
        if (Number.isNaN(Date.parse(value))) return { error: `${name} must be a valid date` };
      } else if (rule.format) {
        const [re, msg] = FORMATS[rule.format] || [];
        if (re && !re.test(value)) return { error: `${name} ${msg}` };
      }
      break;
    }
    case 'number':
    case 'integer': {
      if (typeof value === 'string' && value.trim() !== '') value = Number(value);
      if (typeof value !== 'number' || !Number.isFinite(value)) return { error: `${name} must be a number` };
      if (rule.type === 'integer' && !Number.isInteger(value)) return { error: `${name} must be a whole number` };
      if (rule.min !== undefined && value < rule.min) return { error: `${name} must be at least ${rule.min}` };
      if (rule.max !== undefined && value > rule.max) return { error: `${name} must be at most ${rule.max}` };
      if (rule.enum && !rule.enum.includes(value)) return { error: `${name} must be one of: ${rule.enum.join(', ')}` };
      break;
    }
    case 'boolean': {
      if (value === true || value === 'true' || value === 1 || value === '1') value = true;
      else if (value === false || value === 'false' || value === 0 || value === '0') value = false;
      else return { error: `${name} must be true or false` };
      break;
    }
    case 'array': {
      if (!Array.isArray(value)) return { error: `${name} must be a list` };
      if (rule.minItems !== undefined && value.length < rule.minItems) return { error: `${name} needs at least ${rule.minItems} item(s)` };
      if (rule.maxItems !== undefined && value.length > rule.maxItems) return { error: `${name} can have at most ${rule.maxItems} item(s)` };
      if (rule.items) {
        const cleaned = [];
        for (let i = 0; i < value.length; i += 1) {
          const r = check(value[i], { ...rule.items, required: true }, `${name}[${i}]`);
          if (r.error) return { error: r.error };
          cleaned.push(r.value);
        }
        value = cleaned;
      }
      break;
    }
    case 'object': {
      if (!isPlainObject(value)) return { error: `${name} must be an object` };
      break;
    }
    default:
      throw new Error(`validate: unknown type "${rule.type}" for ${name}`);
  }
  return { value };
}

/** Validates `data` against `schema`. Returns { value, errors }. Pure: usable in tests and outside routes. */
function validateObject(data, schema, { strict = false } = {}) {
  const input = isPlainObject(data) ? data : {};
  const output = { ...input };
  const errors = [];

  for (const [field, rule] of Object.entries(schema)) {
    const raw = input[field];
    if (absent(raw)) {
      if (rule.default !== undefined) { output[field] = typeof rule.default === 'function' ? rule.default() : rule.default; continue; }
      if (raw === null && rule.nullable) { output[field] = null; continue; }
      if (rule.required) errors.push({ field, message: `${rule.label || field} is required` });
      else if (raw === '') output[field] = undefined;
      continue;
    }
    const result = check(raw, rule, field);
    if (result.error) errors.push({ field, message: result.error });
    else output[field] = result.value;
  }

  if (strict) {
    for (const key of Object.keys(input)) if (!(key in schema)) errors.push({ field: key, message: `${key} is not allowed` });
  }
  return { value: output, errors };
}

function validate(schema, { source = 'body', strict = false } = {}) {
  // Fail when the route is written, not on the first request that reaches it.
  Object.entries(schema).forEach(([field, rule]) => {
    if (!TYPES.includes(rule.type)) throw new Error(`validate: "${field}" has unknown type "${rule.type}"`);
  });

  return (req, res, next) => {
    const { value, errors } = validateObject(req[source], schema, { strict });
    if (errors.length) {
      return res.status(400).json({ success: false, error: errors[0].message, errors });
    }
    req[source] = value;
    return next();
  };
}

module.exports = { validate, validateObject };
