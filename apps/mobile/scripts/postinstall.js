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

export default (_NativeModule ?? {}) as typeof NativeModule;
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
const patches = [
  { file: 'EventEmitter.ts', content: eventEmitterContent, detect: 'EventEmitterStub' },
  { file: 'SharedObject.ts', content: sharedObjectContent, detect: 'SharedObjectStub' },
  { file: 'SharedRef.ts', content: sharedRefContent, detect: 'SharedRefStub' },
  { file: 'NativeModule.ts', content: nativeModuleContent, detect: 'try {' },
  { file: 'ensureNativeModulesAreInstalled.ts', content: ensureContent, detect: '_isExpoObjectHealthy' },
  { file: 'requireNativeModule.ts', content: requireNativeModuleContent, detect: '_stub' },
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
    if (existing.includes(patch.detect)) {
      console.log(`  OK:   ${patch.file} (already patched)`);
      skipped++;
    } else {
      fs.writeFileSync(filePath, patch.content, 'utf8');
      console.log(`  DONE: ${patch.file} patched ✓`);
      applied++;
    }
  } catch (err) {
    console.error(`  ERR:  ${patch.file}: ${err.message}`);
  }
}

console.log(`[postinstall] Complete: ${applied} patched, ${skipped} skipped.`);
