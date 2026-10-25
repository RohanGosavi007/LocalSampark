const nodeCron = require('node-cron');
const path = require('path');
const { locked } = require('./jobLock');

/**
 * node-cron, with each scheduled callback run by one instance only.
 *
 * Drop-in: `const cron = require('../utils/cron')`, then `cron.schedule(expr, fn)`
 * as before. The lock is named after the file that scheduled it and the
 * expression, so two jobs in one file stay distinct; pass `{ name }` to choose.
 * It is held for 50 seconds — instances fire within a second of each other and
 * the shortest schedule is a minute — see utils/jobLock.js.
 *
 * Under Jest nothing is scheduled by the jobs themselves, so this is inert there.
 */
const LOCK_MS = 50 * 1000;

function callerName() {
  const frames = String(new Error().stack || '').split('\n').slice(3);
  const hit = frames.find((l) => !/utils[\/]cron\.js/.test(l) && /\.js/.test(l));
  const file = hit && (hit.match(/([^\/()]+)\.js/) || [])[1];
  return file || 'unknown';
}

function schedule(expression, fn, options = {}) {
  const { name, ...rest } = options;
  const lockName = `cron:${name || callerName()}:${expression}`;
  return nodeCron.schedule(expression, locked(lockName, LOCK_MS, fn), rest);
}

module.exports = { ...nodeCron, schedule };
