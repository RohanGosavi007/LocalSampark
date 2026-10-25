import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(WEB, 'src');

test('P13.1 [perf]: heavy 3D card component is dynamically loaded with ssr: false', () => {
  const lazyPath = path.join(SRC, 'components', 'motion', 'Floating3DCardLazy.js');
  assert.ok(fs.existsSync(lazyPath), 'Floating3DCardLazy.js must exist');

  const content = fs.readFileSync(lazyPath, 'utf8');
  assert.ok(content.includes('dynamic('), 'must use next/dynamic');
  assert.ok(content.includes('ssr: false'), 'must specify ssr: false for 3D canvas');
});

test('P13.2 [perf]: interactive map component is dynamically loaded with ssr: false', () => {
  const lazyMapPath = path.join(SRC, 'components', 'LazyMap.js');
  assert.ok(fs.existsSync(lazyMapPath), 'LazyMap.js must exist');

  const content = fs.readFileSync(lazyMapPath, 'utf8');
  assert.ok(content.includes('dynamic('), 'must use next/dynamic');
  assert.ok(content.includes('ssr: false'), 'must specify ssr: false for Leaflet map');
});

test('P13.3 [perf]: customer shopping landing page does not directly bundle heavy 3D canvas', () => {
  const landingPath = path.join(SRC, 'app', 'page.js');
  const content = fs.readFileSync(landingPath, 'utf8');

  assert.ok(!content.includes('@react-three/fiber'), 'landing page must not import @react-three/fiber directly');
  assert.ok(!content.includes('@react-three/drei'), 'landing page must not import @react-three/drei directly');
  assert.ok(!content.includes("from 'three'"), "landing page must not import three directly");
});
