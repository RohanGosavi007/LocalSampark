/**
 * Postinstall safety patches for expo-modules-core.
 *
 * Applies critical patches to prevent app crashes when the Expo JSI native
 * initialization fails on Android release builds (Hermes engine).
 *
 * Patches applied:
 *  1. EventEmitter.ts — try-catch + stub fallback for globalThis.expo.EventEmitter
 *  2. SharedObject.ts — try-catch + stub fallback for globalThis.expo.SharedObject
 *  3. SharedRef.ts — try-catch + stub fallback for globalThis.expo.SharedRef
 *  4. NativeModule.ts — optional chaining on globalThis.expo
 *  5. ensureNativeModulesAreInstalled.ts — _isExpoObjectHealthy() + JS shim
 *  6. requireNativeModule.ts — safe stub instead of throwing
 */
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const expoModulesCoreSrc = path.join(projectRoot, 'node_modules', 'expo-modules-core', 'src');

console.log('[postinstall] Applying expo-modules-core safety patches...');
console.log('[postinstall] Target:', expoModulesCoreSrc);

if (!fs.existsSync(expoModulesCoreSrc)) {
  console.log('[postinstall] expo-modules-core not found, skipping.');
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════════════════
// Patch 1: EventEmitter.ts
// ═══════════════════════════════════════════════════════════════════════════
const eventEmitterContent = `'use client';

import { ensureNativeModulesAreInstalled } from './ensureNativeModulesAreInstalled';
import type { EventEmitter, EventSubscription } from './ts-declarations/EventEmitter';

ensureNativeModulesAreInstalled();

// Safe access: JSI HostObject on globalThis.expo may exist but throw on property access
let _EventEmitter: any;
try {
  _EventEmitter = (globalThis as any).expo?.EventEmitter;
} catch (_e) {
  // JSI HostObject threw — fall through to stub
}

if (!_EventEmitter) {
  _EventEmitter = function EventEmitterStub(this: any) {
    this._listeners = {};
  };
  _EventEmitter.prototype.addListener = function (event: string, listener: Function) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(listener);
    const self = this;
    let removed = false;
    return {
      remove() {
        if (removed) return;
        removed = true;
        const idx = self._listeners[event]?.indexOf(listener);
        if (idx >= 0) self._listeners[event].splice(idx, 1);
      },
    };
  };
  _EventEmitter.prototype.removeAllListeners = function (event?: string) {
    if (event) { delete this._listeners[event]; } else { this._listeners = {}; }
  };
  _EventEmitter.prototype.removeSubscription = function (sub: any) {
    sub?.remove?.();
  };
  _EventEmitter.prototype.emit = function (event: string, ...args: any[]) {
    const list = this._listeners[event];
    if (list) list.forEach((fn: Function) => { try { fn(...args); } catch (_) {} });
  };
}

export { type EventSubscription };
// expo-modules-core/src/index.ts re-exports these as NAMED bindings
// (\`export { EventEmitter } from './EventEmitter'\`). Emitting only a default
// export made every one of them resolve to \`undefined\` downstream — which is
// what produced "right operand of 'instanceof' is not an object" at startup.
export { _EventEmitter as EventEmitter };
export default _EventEmitter as typeof EventEmitter;
`;

// ═══════════════════════════════════════════════════════════════════════════
// Patch 2: SharedObject.ts
// ═══════════════════════════════════════════════════════════════════════════
const sharedObjectContent = `'use client';

import { ensureNativeModulesAreInstalled } from './ensureNativeModulesAreInstalled';
import type { SharedObject as SharedObjectType } from './ts-declarations/SharedObject';

ensureNativeModulesAreInstalled();

let _SharedObject: any;
try {
  _SharedObject = (globalThis as any).expo?.SharedObject;
} catch (_e) {}

if (!_SharedObject) {
  _SharedObject = function SharedObjectStub() {};
}

// Named export required by expo-modules-core/src/index.ts — see EventEmitter.
export { _SharedObject as SharedObject };
export default _SharedObject as typeof SharedObjectType;
`;

// ═══════════════════════════════════════════════════════════════════════════
// Patch 3: SharedRef.ts
// ═══════════════════════════════════════════════════════════════════════════
const sharedRefContent = `'use client';

import { ensureNativeModulesAreInstalled } from './ensureNativeModulesAreInstalled';
import type { SharedRef as SharedRefType } from './ts-declarations/SharedRef';

ensureNativeModulesAreInstalled();

let _SharedRef: any;
try {
  _SharedRef = (globalThis as any).expo?.SharedRef;
} catch (_e) {}

if (!_SharedRef) {
  _SharedRef = function SharedRefStub() {};
}

// Named export required by expo-modules-core/src/index.ts. This specific one
// is what expo-image's isImageRef() checks with \`value instanceof SharedRef\`,
// so its absence crashed every <Image> render.
export { _SharedRef as SharedRef };
export default _SharedRef as typeof SharedRefType;
`;

// ═══════════════════════════════════════════════════════════════════════════
// Patch 4: NativeModule.ts
// ═══════════════════════════════════════════════════════════════════════════
const nativeModuleContent = `'use client';

import { ensureNativeModulesAreInstalled } from './ensureNativeModulesAreInstalled';
import type { NativeModule } from './ts-declarations/NativeModule';

ensureNativeModulesAreInstalled();

let _NativeModule: any;
try {
  _NativeModule = (globalThis as any).expo?.NativeModule;
} catch (_e) {}

// Named export required by expo-modules-core/src/index.ts — see EventEmitter.
// Kept as a function so "class X extends NativeModule" and "instanceof" both
// stay legal when the JSI object is unavailable; a plain {} satisfies neither.
const _NativeModuleSafe = typeof _NativeModule === 'function' ? _NativeModule : function NativeModuleStub() {};
export { _NativeModuleSafe as NativeModule };
export default _NativeModuleSafe as typeof NativeModule;
`;

// ═══════════════════════════════════════════════════════════════════════════
// Patch 5: ensureNativeModulesAreInstalled.ts
// ═══════════════════════════════════════════════════════════════════════════
const ensureContent = `import { NativeModules, Platform } from 'react-native';

import { registerWebGlobals } from './web/index';

function _createExpoShim(): void {
  var _cache: { [key: string]: any } = {};

  function _makeEmptyModule() {
    return {
      addListener: function () { return { remove: function () {} }; },
      removeAllListeners: function () {},
      removeListeners: function () {},
      emit: function () {},
      getConstants: function () { return {}; },
    };
  }

  function _requireNativeModule(name: string) {
    if (!_cache[name]) { _cache[name] = _makeEmptyModule(); }
    return _cache[name];
  }

  function _EventEmitter(this: any) { this._listeners = {}; }
  _EventEmitter.prototype.addListener = function (event: string, listener: Function) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(listener);
    var removed = false;
    var list = this._listeners[event];
    return {
      remove: function () {
        if (removed) return;
        removed = true;
        var idx = list.indexOf(listener);
        if (idx >= 0) list.splice(idx, 1);
      },
    };
  };
  _EventEmitter.prototype.removeAllListeners = function (event?: string) {
    if (event) { delete this._listeners[event]; } else { this._listeners = {}; }
  };
  _EventEmitter.prototype.removeSubscription = function (sub: any) { sub?.remove?.(); };
  _EventEmitter.prototype.emit = function (event: string) {
    var args = Array.prototype.slice.call(arguments, 1);
    var list = this._listeners[event] ? this._listeners[event].slice() : [];
    for (var i = 0; i < list.length; i++) {
      try { list[i].apply(null, args); } catch (_e) {}
    }
  };

  (globalThis as any).expo = {
    modules: {
      _cache: _cache,
      get: function (n: string) { return _cache[n] || null; },
      has: function (n: string) { return !!_cache[n]; },
    },
    NativeModule: {},
    EventEmitter: _EventEmitter,
    SharedObject: function SharedObjectStub() {},
    SharedRef: function SharedRefStub() {},
    requireNativeModule: _requireNativeModule,
    requireOptionalNativeModule: function (name: string) {
      try { return _requireNativeModule(name); } catch (_e) { return null; }
    },
    uuidv4: function () {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
    },
    uuidv5: function () { return ''; },
  };
}

function _isExpoObjectHealthy(): boolean {
  try {
    const e = (globalThis as any).expo;
    if (!e) return false;
    void e.modules;
    return true;
  } catch (_) {
    return false;
  }
}

export function ensureNativeModulesAreInstalled(): void {
  if (_isExpoObjectHealthy()) {
    return;
  }

  try {
    if (Platform.OS === 'web') {
      registerWebGlobals();
    } else {
      try {
        NativeModules.ExpoModulesCore?.installModules();
      } catch (e) {}
    }
  } catch (_error) {}

  if (!_isExpoObjectHealthy()) {
    _createExpoShim();
  }
}
`;

// ═══════════════════════════════════════════════════════════════════════════
// Patch 6: requireNativeModule.ts
// ═══════════════════════════════════════════════════════════════════════════
const requireNativeModuleContent = `import NativeModulesProxy from './NativeModulesProxy';
import { ensureNativeModulesAreInstalled } from './ensureNativeModulesAreInstalled';

export function requireNativeModule<ModuleType = any>(moduleName: string): ModuleType {
  ensureNativeModulesAreInstalled();
  let nativeModule: any;
  try {
    nativeModule = (globalThis as any).expo?.modules?.[moduleName]
      ?? (globalThis as any).expo?.modules?.get?.(moduleName)
      ?? NativeModulesProxy[moduleName];
  } catch (_e) {}
  if (!nativeModule) {
    const _stub: any = {
      addListener: function() { return { remove: function() {} }; },
      removeAllListeners: function() {},
      removeListeners: function() {},
      emit: function() {},
      getConstants: function() { return {}; },
    };
    return _stub as ModuleType;
  }
  return nativeModule as ModuleType;
}

export function requireOptionalNativeModule<ModuleType = any>(
  moduleName: string
): ModuleType | null {
  ensureNativeModulesAreInstalled();
  try {
    return (globalThis as any).expo?.modules?.[moduleName]
      ?? (globalThis as any).expo?.modules?.get?.(moduleName)
      ?? NativeModulesProxy[moduleName]
      ?? null;
  } catch (_e) {
    return null;
  }
}
`;

// ═══════════════════════════════════════════════════════════════════════════
// Apply all patches
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Bump whenever the patch bodies below change.
 *
 * Detection used to key off a content marker such as 'EventEmitterStub', which
 * meant an already-patched tree was skipped forever — so a corrected patch
 * never reached an existing node_modules, only a fresh install. A version stamp
 * makes the patches re-apply when, and only when, their content actually
 * changes.
 *
 * v2: restore the NAMED exports that expo-modules-core/src/index.ts re-exports
 *     (export { SharedRef } from './SharedRef', etc). v1 emitted default-only
 *     exports, so SharedRef/SharedObject/NativeModule/EventEmitter all resolved
 *     to undefined downstream and expo-image's `value instanceof SharedRef`
 *     threw "right operand of 'instanceof' is not an object" on every render.
 */
const PATCH_VERSION = 'v2-named-exports';
const PATCH_STAMP = `\n// @localsampark-expo-patch ${PATCH_VERSION}\n`;

const patches = [
  { file: 'EventEmitter.ts', content: eventEmitterContent },
  { file: 'SharedObject.ts', content: sharedObjectContent },
  { file: 'SharedRef.ts', content: sharedRefContent },
  { file: 'NativeModule.ts', content: nativeModuleContent },
  { file: 'ensureNativeModulesAreInstalled.ts', content: ensureContent },
  { file: 'requireNativeModule.ts', content: requireNativeModuleContent },
];

let applied = 0;
let skipped = 0;

for (const patch of patches) {
  const filePath = path.join(expoModulesCoreSrc, patch.file);
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP: ${patch.file} not found`);
      skipped++;
      continue;
    }
    const existing = fs.readFileSync(filePath, 'utf8');
    if (existing.includes(PATCH_STAMP.trim())) {
      console.log(`  OK:   ${patch.file} (already at ${PATCH_VERSION})`);
      skipped++;
    } else {
      fs.writeFileSync(filePath, patch.content + PATCH_STAMP, 'utf8');
      console.log(`  DONE: ${patch.file} patched -> ${PATCH_VERSION}`);
      applied++;
    }
  } catch (err) {
    console.error(`  ERR:  ${patch.file}: ${err.message}`);
  }
}

console.log(`[postinstall] Complete: ${applied} patched, ${skipped} skipped.`);

// ═══════════════════════════════════════════════════════════════════════════
// Self-check: every named binding that expo-modules-core/src/index.ts
// re-exports must still exist in the file it comes from.
//
// These patches rewrite vendor files wholesale, so a mistake here is invisible
// until runtime — v1 emitted default-only exports, which made SharedRef,
// SharedObject, NativeModule and EventEmitter all resolve to `undefined` for
// every consumer. expo-image's `value instanceof SharedRef` then threw
// "right operand of 'instanceof' is not an object" and took down every screen
// rendering an <Image>. Failing loudly here is far cheaper than a 55-minute
// release build and a device install.
// ═══════════════════════════════════════════════════════════════════════════
try {
  const indexPath = path.join(expoModulesCoreSrc, 'index.ts');
  if (fs.existsSync(indexPath)) {
    const indexSrc = fs.readFileSync(indexPath, 'utf8');
    const reExport = /export\s*\{([^}]*)\}\s*from\s*['"]\.\/([^'"]+)['"]/g;
    const broken = [];
    let match;

    while ((match = reExport.exec(indexSrc))) {
      const targetFile = path.join(expoModulesCoreSrc, match[2] + '.ts');
      if (!fs.existsSync(targetFile)) continue;
      const targetSrc = fs.readFileSync(targetFile, 'utf8');

      for (const raw of match[1].split(',').map((s) => s.trim()).filter(Boolean)) {
        if (raw.startsWith('type ')) continue; // erased at runtime
        if (raw.startsWith('default as ')) {
          if (!/export\s+default/.test(targetSrc)) broken.push(`${raw} (${match[2]}.ts)`);
          continue;
        }
        const name = raw.includes(' as ') ? raw.split(' as ')[1].trim() : raw;
        const ok =
          new RegExp('export\\s*\\{[^}]*\\b' + name + '\\b[^}]*\\}').test(targetSrc) ||
          new RegExp(
            'export\\s+(?:declare\\s+)?(?:abstract\\s+)?(?:const|let|var|function|class)\\s+' + name + '\\b'
          ).test(targetSrc);
        if (!ok) broken.push(`${name} (${match[2]}.ts)`);
      }
    }

    if (broken.length) {
      console.error('\n[postinstall] FATAL: patched files dropped named exports that');
      console.error('[postinstall] expo-modules-core/src/index.ts re-exports:');
      for (const b of broken) console.error('  - ' + b);
      console.error('[postinstall] These would be `undefined` at runtime. Fix the');
      console.error('[postinstall] patch bodies above and bump PATCH_VERSION.\n');
      process.exit(1);
    }
    console.log('[postinstall] Export contract verified: all named re-exports resolve.');
  }
} catch (err) {
  console.warn('[postinstall] Export self-check skipped:', err.message);
}
