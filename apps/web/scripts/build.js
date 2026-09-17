#!/usr/bin/env node
const { spawnSync } = require('child_process');

// Ensure NODE_OPTIONS includes 4GB heap allocation to prevent OOM on Render
const existingOptions = process.env.NODE_OPTIONS || '';
if (!existingOptions.includes('--max-old-space-size')) {
  process.env.NODE_OPTIONS = (existingOptions + ' --max-old-space-size=4096').trim();
}

let nextBin;
try {
  nextBin = require.resolve('next/dist/bin/next');
} catch (e) {
  nextBin = 'next';
}

const cmd = nextBin === 'next' ? (process.platform === 'win32' ? 'npx.cmd' : 'npx') : process.execPath;
const args = nextBin === 'next' ? ['next', 'build'] : [nextBin, 'build'];

const result = spawnSync(cmd, args, {
  stdio: 'inherit',
  env: process.env,
  shell: nextBin === 'next'
});

process.exit(result.status ?? 0);
