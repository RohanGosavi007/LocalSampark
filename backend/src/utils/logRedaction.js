/**
 * Keeps credentials and personal details out of the API's logs (P8).
 *
 * The masking rules live in packages/shared/redact.js, shared with Sentry
 * reporting and the web and admin apps. This adds the winston format that
 * applies them to every log entry.
 */
const { REDACTED, redactText, redactValue } = require('../../../packages/shared/redact');

/**
 * A winston format that masks `message`, `stack` and every other field of a log
 * entry. Winston keeps its own bookkeeping in symbol keys, which are untouched.
 */
function winstonRedactor(winston) {
  return winston.format((info) => {
    for (const key of Object.keys(info)) {
      if (key === 'level') continue;
      info[key] = key === 'message' || key === 'stack' ? redactText(info[key]) : redactValue({ [key]: info[key] })[key];
    }
    return info;
  })();
}

module.exports = { REDACTED, redactText, redactValue, winstonRedactor };
