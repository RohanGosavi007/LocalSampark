/**
 * expo-crash-fix.js
 *
 * Metro polyfill injected at bundle start — before ANY module loads.
 * Prevents: "TypeError: Cannot read property 'requireNativeModule' of undefined"
 *
 * Root cause: Expo's JSI native initialization (ExpoModulesCore.installModules)
 * sometimes lags behind JS execution on Hermes. When globalThis.expo is undefined,
 * every getter in expo/src/Expo.ts that re-exports from expo-modules-core crashes.
 *
 * Fix: If native hasn't set globalThis.expo yet, we set up a minimal JS shim.
 * When native finishes installing modules later, it will OVERWRITE this shim.
 */
(function (global) {
  'use strict';

  // If native already initialized expo, nothing to do
  if (global.expo && global.expo.modules) {
    return;
  }

  // ─── Simple module registry ────────────────────────────────────────────────
  var _moduleCache = {};

  function _makeEmptyModule(name) {
    // Returns a plain object that won't crash when properties are accessed
    return {
      // EventEmitter stubs
      addListener: function () { return { remove: function () {} }; },
      removeAllListeners: function () {},
      removeListeners: function () {},
      emit: function () {},
      // Common async stubs
      getConstantsForPlatform: function () { return {}; },
      getConstants: function () { return {}; },
    };
  }

  function _requireNativeModule(name) {
    if (!_moduleCache[name]) {
      _moduleCache[name] = _makeEmptyModule(name);
    }
    return _moduleCache[name];
  }

  function _requireOptionalNativeModule(name) {
    try {
      return _requireNativeModule(name);
    } catch (e) {
      return null;
    }
  }

  // ─── EventEmitter class shim ───────────────────────────────────────────────
  function EventEmitter() {
    this._listeners = {};
  }
  EventEmitter.prototype.addListener = function (event, listener) {
    if (!this._listeners[event]) this._listeners[event] = [];
    var list = this._listeners[event];
    list.push(listener);
    var removed = false;
    return {
      remove: function () {
        if (removed) return;
        removed = true;
        var idx = list.indexOf(listener);
        if (idx >= 0) list.splice(idx, 1);
      },
    };
  };
  EventEmitter.prototype.removeAllListeners = function (event) {
    if (event) {
      delete this._listeners[event];
    } else {
      this._listeners = {};
    }
  };
  EventEmitter.prototype.emit = function (event) {
    var args = Array.prototype.slice.call(arguments, 1);
    var list = this._listeners[event] ? this._listeners[event].slice() : [];
    for (var i = 0; i < list.length; i++) {
      try { list[i].apply(null, args); } catch (e) {}
    }
  };

  // ─── SharedObject / SharedRef stubs ───────────────────────────────────────
  function SharedObject() {}
  function SharedRef() {}

  // ─── Simple modules registry object ───────────────────────────────────────
  // Looks like a map: modules[moduleName] returns the module object or null
  var modulesRegistry = {
    _cache: _moduleCache,
    get: function (name) { return _moduleCache[name] || null; },
    has: function (name) { return !!_moduleCache[name]; },
  };

  // ─── Install the shim ─────────────────────────────────────────────────────
  global.expo = {
    modules: modulesRegistry,
    NativeModule: {},
    EventEmitter: EventEmitter,
    SharedObject: SharedObject,
    SharedRef: SharedRef,
    requireNativeModule: _requireNativeModule,
    requireOptionalNativeModule: _requireOptionalNativeModule,
    uuidv4: function () {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
    },
    uuidv5: function () { return ''; },
  };

  // Also expose on globalThis for TypeScript compat
  if (typeof globalThis !== 'undefined' && globalThis !== global) {
    globalThis.expo = global.expo;
  }

  if (typeof console !== 'undefined' && console.warn) {
    console.warn(
      '[LocalSampark] expo-crash-fix applied: native JSI not ready, JS shim installed.'
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : global);
