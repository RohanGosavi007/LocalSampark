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

/**
 * DOM event globals.
 *
 * React Native polyfills URL, URLSearchParams, AbortController, Blob, File,
 * FormData, Headers, Request, Response, WebSocket and fetch — but it does NOT
 * define Event, EventTarget or CustomEvent. Libraries written against the web
 * platform (react-native-webrtc and its vendored event-target-shim,
 * event-target-shim itself via abort-controller, and @supabase/supabase-js)
 * reference those globals, and an unguarded `x instanceof Event` against an
 * undefined binding fails in Hermes with:
 *
 *     right operand of 'instanceof' is not an object
 *
 * This lived in app/_layout.js before, which could never work: ES `import`
 * declarations are hoisted, so every one of those libraries was imported and
 * evaluated before the assignment in the module body ran. It also installed
 * bare `class Event {}` / `class URL {}` stubs with empty prototypes — worse
 * than absent, because webrtc's shim detects a defined `Global.Event` and
 * splices that empty prototype into its own chain via setPrototypeOf, and any
 * real `new Event('x')` yields an object with no `type`, `preventDefault`, or
 * `stopPropagation`.
 *
 * Running here instead — a Metro polyfill, prepended in metro.config.js — is
 * the only placement that is guaranteed to precede all module evaluation.
 * URL is deliberately not touched: React Native already provides a real one.
 */
(function (global) {
  'use strict';

  if (typeof global.Event === 'undefined') {
    function Event(type, eventInitDict) {
      var init = eventInitDict || {};
      this.type = String(type);
      this.bubbles = !!init.bubbles;
      this.cancelable = !!init.cancelable;
      this.composed = !!init.composed;
      this.defaultPrevented = false;
      this.cancelBubble = false;
      this.target = null;
      this.currentTarget = null;
      this.eventPhase = 0;
      this.isTrusted = false;
      this.timeStamp = Date.now();
      // Consumed by dispatchEvent below to stop calling further listeners.
      this._stopped = false;
    }
    Event.prototype.preventDefault = function () {
      if (this.cancelable) this.defaultPrevented = true;
    };
    Event.prototype.stopPropagation = function () {
      this._stopped = true;
      this.cancelBubble = true;
    };
    Event.prototype.stopImmediatePropagation = function () {
      this._stopped = true;
      this.cancelBubble = true;
    };
    Event.NONE = 0;
    Event.CAPTURING_PHASE = 1;
    Event.AT_TARGET = 2;
    Event.BUBBLING_PHASE = 3;
    global.Event = Event;
  }

  if (typeof global.CustomEvent === 'undefined') {
    function CustomEvent(type, eventInitDict) {
      var init = eventInitDict || {};
      global.Event.call(this, type, init);
      this.detail = init.detail === undefined ? null : init.detail;
    }
    CustomEvent.prototype = Object.create(global.Event.prototype);
    CustomEvent.prototype.constructor = CustomEvent;
    global.CustomEvent = CustomEvent;
  }

  if (typeof global.EventTarget === 'undefined') {
    function EventTarget() {
      Object.defineProperty(this, '_eventListeners', {
        value: {},
        enumerable: false,
        writable: true,
        configurable: true,
      });
    }

    // Subclasses commonly skip super(), so the listener map is created on
    // demand rather than assumed to exist.
    function listenersFor(target, type) {
      if (!target._eventListeners) {
        Object.defineProperty(target, '_eventListeners', {
          value: {},
          enumerable: false,
          writable: true,
          configurable: true,
        });
      }
      if (!target._eventListeners[type]) target._eventListeners[type] = [];
      return target._eventListeners[type];
    }

    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (!listener) return;
      var list = listenersFor(this, String(type));
      var once = !!(options && typeof options === 'object' && options.once);
      for (var i = 0; i < list.length; i++) {
        if (list[i].listener === listener) return;
      }
      list.push({ listener: listener, once: once });
    };

    EventTarget.prototype.removeEventListener = function (type, listener) {
      var list = listenersFor(this, String(type));
      for (var i = 0; i < list.length; i++) {
        if (list[i].listener === listener) {
          list.splice(i, 1);
          return;
        }
      }
    };

    EventTarget.prototype.dispatchEvent = function (event) {
      if (!event || typeof event.type !== 'string') return true;
      var list = listenersFor(this, event.type).slice();
      event.target = event.currentTarget = this;
      for (var i = 0; i < list.length; i++) {
        if (event._stopped) break;
        var entry = list[i];
        if (entry.once) this.removeEventListener(event.type, entry.listener);
        try {
          if (typeof entry.listener === 'function') {
            entry.listener.call(this, event);
          } else if (typeof entry.listener.handleEvent === 'function') {
            entry.listener.handleEvent(event);
          }
        } catch (e) {
          // A throwing listener must not abort the dispatch loop, matching
          // the browser behaviour these libraries are written against.
          if (typeof console !== 'undefined' && console.error) {
            console.error('[LocalSampark] EventTarget listener threw:', e);
          }
        }
      }
      return !event.defaultPrevented;
    };

    global.EventTarget = EventTarget;
  }
})(typeof globalThis !== 'undefined' ? globalThis : global);
