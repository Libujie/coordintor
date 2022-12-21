(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var R = typeof Reflect === 'object' ? Reflect : null
var ReflectApply = R && typeof R.apply === 'function'
  ? R.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  }

var ReflectOwnKeys
if (R && typeof R.ownKeys === 'function') {
  ReflectOwnKeys = R.ownKeys
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target)
      .concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
}

function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;
module.exports.once = once;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {

  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = (type === 'error');

  var events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      checkListener(listener);
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      checkListener(listener);

      events = this._events;
      if (events === undefined)
        return this;

      list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = Object.create(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (events === undefined)
        return this;

      // not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = Object.create(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined)
    return [];

  var evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function once(emitter, name) {
  return new Promise(function (resolve, reject) {
    function errorListener(err) {
      emitter.removeListener(name, resolver);
      reject(err);
    }

    function resolver() {
      if (typeof emitter.removeListener === 'function') {
        emitter.removeListener('error', errorListener);
      }
      resolve([].slice.call(arguments));
    };

    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
    if (name !== 'error') {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}

function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === 'function') {
    eventTargetAgnosticAddListener(emitter, 'error', handler, flags);
  }
}

function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === 'function') {
    if (flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === 'function') {
    // EventTarget does not have `error` event semantics like Node
    // EventEmitters, we do not listen for `error` events here.
    emitter.addEventListener(name, function wrapListener(arg) {
      // IE does not have builtin `{ once: true }` support so we
      // have to do it manually.
      if (flags.once) {
        emitter.removeEventListener(name, wrapListener);
      }
      listener(arg);
    });
  } else {
    throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
  }
}

},{}],3:[function(require,module,exports){
// Based on https://github.com/shtylman/node-process

const EventEmitter = require('events');

const process = module.exports = {};

process.nextTick = Script.nextTick;

process.title = 'Frida';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

process.EventEmitter = EventEmitter;
process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
  throw new Error('process.binding is not supported');
};

process.cwd = function () {
  return '/'
};
process.chdir = function (dir) {
  throw new Error('process.chdir is not supported');
};
process.umask = function () {
  return 0;
};

function noop () {}

},{"events":2}],4:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(require,module,exports){
(function (setImmediate,clearImmediate){(function (){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this)}).call(this,require("timers").setImmediate,require("timers").clearImmediate)

},{"process/browser.js":4,"timers":5}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.breakPoint = void 0;
const utils_1 = require("./utils");
const breakPoint = (addr) => {
    (0, utils_1.msg)(addr == null, "Invalid address!");
    if (addr == null)
        return;
    let bp = 0x01de;
    let count = 2;
    let src = new ArrayBuffer(count);
    let dataview = new DataView(src);
    dataview.setInt16(0, bp, true);
    let dst = new NativePointer(addr);
    let ret = Memory.protect(dst, count, "rwx");
    (0, utils_1.msg)(ret == false, "Memory protection property modification failed!");
    if (ret == false)
        return false;
    Memory.copy(dst, src.unwrap(), 2);
};
exports.breakPoint = breakPoint;

},{"./utils":12}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hexDump = void 0;
const hexDump = (addr, length) => {
    Java.perform(function () {
        let paddr = new NativePointer(addr);
        console.log(hexdump(paddr, {
            offset: 0,
            length: length,
            header: true,
            ansi: true
        }));
    });
};
exports.hexDump = hexDump;

},{}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HookManager = void 0;
class HookManager {
    constructor() {
        this._hookDict = {};
    }
    pushBack(key, value) {
        this._hookDict[key] = value;
    }
    getValue(key) {
        for (const _key in this._hookDict) {
            if (_key === key) {
                return this._hookDict[key];
            }
        }
        return null;
    }
}
exports.HookManager = HookManager;

},{}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hook = void 0;
var HookState;
(function (HookState) {
    HookState[HookState["HK_ENABLE"] = 0] = "HK_ENABLE";
    HookState[HookState["HK_DISABLE"] = 1] = "HK_DISABLE";
})(HookState || (HookState = {}));
class Hook {
    constructor(moduleName = null, name = null, addr = null) {
        this._hookTargetName = null;
        this._hookTargetAddr = null;
        this._hookTargetModuleName = null;
        this._hookStatus = HookState.HK_DISABLE;
        this._hookTargetFuncRetType = null;
        this._hookTargetFuncParamterTyep = null;
        this._hookTargetModuleName = moduleName;
        this._hookTargetName = name;
        this._hookTargetAddr = addr;
    }
    set hookName(name) { this._hookTargetName = name; }
    set hookAddr(addr) { this._hookTargetAddr = addr; }
    set hookModuleName(moduleName) { this._hookTargetModuleName = moduleName; }
    set targetFuncRetType(retType) { this._hookTargetFuncRetType = retType; }
    set targetFuncParameterType(parameterType) { this._hookTargetFuncParamterTyep = parameterType; }
    hook(callBacks) {
        if (this._hookTargetName !== null) {
            let nativeFuncAddr = Module.findExportByName(this._hookTargetModuleName, this._hookTargetName);
            if (nativeFuncAddr === null) {
                if (this._hookTargetModuleName !== null) {
                    console.warn("Not found target func => " + this._hookTargetName + " in " + this._hookTargetModuleName);
                    return;
                }
                else {
                    console.warn("Not found target func => " + this._hookTargetName);
                    return;
                }
            }
            else {
                Interceptor.attach(nativeFuncAddr, callBacks);
                this._hookStatus = HookState.HK_ENABLE;
                console.log(this._hookTargetName + ' is hooked!');
                return;
            }
        }
        else {
            console.warn("hookTargetName must be set!");
            return;
        }
    }
    invoke(...args) {
        if (this._hookTargetName !== null) {
            let nativeFuncAddr = Module.getExportByName(this._hookTargetModuleName, this._hookTargetName);
            if (nativeFuncAddr === null) {
                if (this._hookTargetModuleName !== null) {
                    console.warn("Not found target func => " + this._hookTargetName + " in " + this._hookTargetModuleName);
                    return;
                }
                else {
                    console.warn("Not found target func => " + this._hookTargetName);
                    return;
                }
            }
            else {
                if (this._hookTargetFuncRetType === null) {
                    console.error('funcation ret type must be set!');
                    return;
                }
                if (this._hookTargetFuncRetType !== null &&
                    this._hookTargetFuncParamterTyep !== null) {
                    let nativeFunc = new NativeFunction(nativeFuncAddr, this._hookTargetFuncRetType, this._hookTargetFuncParamterTyep);
                    if (nativeFunc.isNull()) {
                        console.log('NativeFunc is null!');
                    }
                    console.log("calling " + this._hookTargetName);
                    return nativeFunc(...args);
                }
            }
        }
    }
    replace(callBacks) {
        if (this._hookTargetName !== null) {
            let nativeFuncAddr = Module.findExportByName(this._hookTargetModuleName, this._hookTargetName);
            if (nativeFuncAddr === null) {
                if (this._hookTargetModuleName !== null) {
                    console.warn("Not found target func => " + this._hookTargetName + " in " + this._hookTargetModuleName);
                    return;
                }
                else {
                    console.warn("Not found target func => " + this._hookTargetName);
                    return;
                }
            }
            else {
                Interceptor.replace(nativeFuncAddr, callBacks);
                this._hookStatus = HookState.HK_ENABLE;
                console.log(this._hookTargetName + ' is replaced!');
                return;
            }
        }
        else {
            console.warn("hookTargetName must be set!");
            return;
        }
    }
    unHookAll() {
        Interceptor.detachAll();
        this._hookStatus = HookState.HK_DISABLE;
    }
}
exports.Hook = Hook;

},{}],10:[function(require,module,exports){
(function (setImmediate){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMsg_ = exports.caller_ = exports.classLoader_ = exports.path_ = exports.env_ = void 0;
const breakpoint_1 = require("./breakpoint");
const hexdump_1 = require("./hexdump");
const module_1 = require("./module");
const hook_1 = require("./hooker/hook");
let main = function () {
    Java.perform(function () {
        // registry_exception();
        let hook = new hook_1.Hook('libnativebridge.so', 'NativeBridgeLoadLibraryExt');
        hook.hook({
            onEnter: function (args) {
                console.log("NativeBridgeLoadLibraryExt => arg[0]: " + args[0].readCString());
                console.log("NativeBridgeLoadLibraryExt => arg[1]: " + args[1]);
                console.log("NativeBridgeLoadLibraryExt => arg[2]: " + args[2]);
                // printSoStack(this.context);
            },
        });
        let hook2 = new hook_1.Hook('libnativebridge.so', 'NativeBridgeGetTrampoline');
        hook2.hook({
            onEnter: function (args) {
                console.log("NativeBridgeGetTrampoline => arg[0]: " + args[0].readCString());
                console.log("NativeBridgeGetTrampoline => arg[1]: " + args[1].readCString());
                console.log("NativeBridgeGetTrampoline => arg[2]: " + args[2]);
                console.log("NativeBridgeGetTrampoline => arg[3]: " + args[3]);
                // printSoStack(this.context);
            }
        });
        let hook3 = new hook_1.Hook('libart.so', '_ZN3art9JavaVMExt17LoadNativeLibraryEP7_JNIEnvRKNSt3__112basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEEP8_jobjectP7_jclassPS9_');
        hook3.hook({
            onEnter: function (args) {
                // env_ = args[0];
                // path_ = args[1];
                // classLoader_ = args[2];
                // caller_ = args[3];
                // errorMsg_ = args[4];
                console.log("LoadNativeLibrary Env=> : " + args[0]);
                console.log("LoadNativeLibrary Path=> : " + args[1]);
                console.log("LoadNativeLibrary ClassLoader => : " + args[2]);
                console.log("LoadNativeLibrary Caller => : " + args[3]);
                console.log("LoadNativeLibrary ErrorMsg=> : " + args[4]);
            }
        });
        let hook4 = new hook_1.Hook('libopenjdkjvm.so', 'JVM_NativeLoad');
        hook4.hook({
            onEnter: function (args) {
                exports.env_ = args[0];
                exports.path_ = args[1];
                exports.classLoader_ = args[2];
                exports.caller_ = args[3];
                console.log("JVM_NativeLoad Env=> : " + args[0]);
                console.log("JVM_NativeLoad Path=> : " + args[1]);
                (0, hexdump_1.hexDump)(Java.vm.getEnv().getStringUtfChars(args[1], null).toInt32(), 32);
                console.log("JVM_NativeLoad JavaLoader => : " + args[2]);
                console.log("JVM_NativeLoad Caller => : " + args[3]);
                // printSoStack(this.context);
                // printJavaStack();
            }
        });
    });
};
setImmediate(main);
rpc.exports = {
    hexdump: function (addr, length) {
        return (0, hexdump_1.hexDump)(addr, length);
    },
    listmodules: function () {
        return (0, module_1.listModules)();
    },
    breakpoint: function (addr) {
        return (0, breakpoint_1.breakPoint)(addr);
    },
    loadarmmodule: function (path) {
        return (0, module_1.loadArmModule)(path);
    }
};

}).call(this)}).call(this,require("timers").setImmediate)

},{"./breakpoint":6,"./hexdump":7,"./hooker/hook":9,"./module":11,"timers":5}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadArmModule = exports.findModule = exports.listModules = void 0;
const child_process_1 = require("child_process");
const hook_1 = require("./hooker/hook");
const HookManager_1 = require("./hooker/HookManager");
const index_1 = require("./index");
var hookRoot = new HookManager_1.HookManager();
const listModules = () => {
    Java.perform(function () {
        let pid = Process.id;
        let map_path = "/proc/" + pid + "/maps";
        let cmd = "cat " + map_path + " | grep -iE '.so$' | sort |awk '!a[$6]++'";
        console.log(2);
        let process = (0, child_process_1.spawn)(cmd);
        console.log(pid);
        console.log(process.stdout);
    });
};
exports.listModules = listModules;
const findModule = (name) => {
    Java.perform(function () {
    });
};
exports.findModule = findModule;
const loadArmModule = (path) => {
    loadArmSoFromNativeBridge(path);
};
exports.loadArmModule = loadArmModule;
/**直接通过Bridge加载的so不调用JNI_OnLoad
 *
 * @param hookRoot
 * @returns
 */
function loadArmSoFromNativeBridge(path) {
    Java.perform(function () {
        let loadLibraryExt = "NativeBridgeLoadLibraryExt";
        let hooker = hookRoot.getValue(loadLibraryExt);
        if (hooker === null) {
            hooker = new hook_1.Hook('libnativebridge.so', loadLibraryExt);
            hooker.targetFuncRetType = "pointer";
            hooker.targetFuncParameterType = ["pointer", "int", "int"];
            hookRoot.pushBack(loadLibraryExt, hooker);
        }
        let arg0 = Memory.allocUtf8String(path);
        let arg1 = 0;
        let arg2 = 4;
        let handle_;
        if (arg0.isNull()) {
            console.log("AllocAnsiString faile!");
            return;
        }
        else {
            handle_ = hooker === null || hooker === void 0 ? void 0 : hooker.invoke(arg0, arg1, arg2);
        }
        let findSymbolAndInvoke = (name) => {
            Java.perform(function () {
                try {
                    let getTrampoline = 'NativeBridgeGetTrampoline';
                    let hooker = hookRoot.getValue(getTrampoline);
                    if (hooker === null) {
                        hooker = new hook_1.Hook('libnativebridge.so', getTrampoline);
                        hooker.targetFuncRetType = "pointer";
                        hooker.targetFuncParameterType = ["pointer", "pointer", "int", "int"];
                        hookRoot.pushBack(loadLibraryExt, hooker);
                    }
                    let arg0 = handle_;
                    let arg1 = Memory.allocUtf8String('JNI_OnLoad');
                    let arg2 = 0;
                    let arg3 = 0;
                    let func = hooker.invoke(arg0, arg1, arg2, arg3);
                    if (func !== undefined) {
                        console.log('JNI_OnLoad addr:' + ptr(func.toLocaleString()));
                        let jni_OnLoad = new NativeFunction(ptr(func.toLocaleString()), "int", ["pointer", "int"]);
                        jni_OnLoad(index_1.env_, 0);
                    }
                    else {
                        console.log('JNI_OnLoad not found!');
                    }
                }
                catch (error) {
                    console.log(error);
                }
            });
        };
        let list = path.split("/");
        console.log(list[list.length - 1]);
        findSymbolAndInvoke(list[list.length - 1]);
    });
}
function loadArmModuleFromAndroid(path) {
    Java.perform(function () {
        let LoadNativeLibraryStr = '_ZN3art9JavaVMExt17LoadNativeLibraryEP7_JNIEnvRKNSt3__112basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEEP8_jobjectP7_jclassPS9_';
        let hooker = hookRoot.getValue(LoadNativeLibraryStr);
        if (hooker === null) {
            hooker = new hook_1.Hook('libart.so', LoadNativeLibraryStr);
            hooker.targetFuncRetType = "bool";
            hooker.targetFuncParameterType = ["pointer", "pointer", "pointer", "pointer", "pointer"];
            hookRoot.pushBack(LoadNativeLibraryStr, hooker);
        }
        let arg0 = index_1.env_;
        let arg1 = Memory.allocUtf8String(path);
        console.log(arg1.readUtf8String());
        // let arg1 = path_;
        let arg2 = index_1.classLoader_;
        let arg3 = index_1.caller_;
        let arg4 = index_1.errorMsg_;
        if (arg1.isNull()) {
            console.log("AllocAnsiString faile!");
            return;
        }
        else {
            hooker === null || hooker === void 0 ? void 0 : hooker.invoke(arg0, arg1, arg2, arg3, arg4);
        }
    });
}
function loadArmModuleFromJVM(path) {
    Java.perform(function () {
        let jvm_NativeLoad = 'JVM_NativeLoad';
        let hooker = hookRoot.getValue(jvm_NativeLoad);
        if (hooker === null) {
            hooker = new hook_1.Hook('libopenjdkjvm.so', jvm_NativeLoad);
            hooker.targetFuncRetType = "pointer";
            hooker.targetFuncParameterType = ["pointer", "pointer", "pointer", "pointer"];
            hookRoot.pushBack(jvm_NativeLoad, hooker);
        }
        // let arg0 = env_;
        // let arg1 = Java.vm.getEnv().newStringUtf(path);
        // let arg2 = classLoader_;
        // let arg3 = caller_;
        let arg1 = Java.vm.getEnv().newStringUtf(path);
        let vm = Java.vm;
    });
}
function loadArmModuleFromFridaModule(path) {
    Module.load(path);
}

},{"./hooker/HookManager":8,"./hooker/hook":9,"./index":10,"child_process":1}],12:[function(require,module,exports){
(function (process){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enumClassLoader = exports.printSoStack = exports.printJavaStack = exports.msg = exports.str_to_bytes = void 0;
const str_to_bytes = (hex) => {
    let ab = new ArrayBuffer(hex.length / 2);
    let u8 = new Uint8Array(ab);
    let i = 0;
    while (hex.length >= 2) {
        let x = parseInt(hex.substring(0, 2), 16);
        hex = hex.substring(2, hex.length);
        u8[i++] = x;
    }
    return ab;
};
exports.str_to_bytes = str_to_bytes;
const msg = (condition, msg, over = false) => {
    if (condition) {
        console.log(msg);
        if (over)
            process.exit(-1);
    }
    ;
};
exports.msg = msg;
const printJavaStack = () => {
    Java.perform(function () {
        var Exception = Java.use("java.lang.Exception");
        var ins = Exception.$new("Exception");
        var straces = ins.getStackTrace();
        if (straces != undefined && straces != null) {
            var strace = straces.toString();
            var replaceStr = strace.replace(/,/g, "\r\n");
            console.log("=============================Stack strat=======================");
            console.log(replaceStr);
            console.log("=============================Stack end=======================\r\n");
            Exception.$dispose();
        }
    });
};
exports.printJavaStack = printJavaStack;
const printSoStack = (context) => {
    if (true) {
        Java.perform(function () {
            console.log("=============================Stack strat=======================");
            console.log(' called from:\n' + Thread.backtrace(context, Backtracer.ACCURATE).map(DebugSymbol.fromAddress).join('\n') + '\n'); //SO打印堆栈
            console.log("=============================Stack end=======================\r\n");
        });
    }
};
exports.printSoStack = printSoStack;
const enumClassLoader = () => {
    Java.enumerateClassLoaders({
        onMatch(loader) {
            console.log(loader);
        },
        onComplete() {
            console.log('onComplete');
        },
    });
};
exports.enumClassLoader = enumClassLoader;

}).call(this)}).call(this,require('_process'))

},{"_process":3}]},{},[10])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCJub2RlX21vZHVsZXMvZnJpZGEtcHJvY2Vzcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvdGltZXJzLWJyb3dzZXJpZnkvbWFpbi5qcyIsInNyYy9icmVha3BvaW50LnRzIiwic3JjL2hleGR1bXAudHMiLCJzcmMvaG9va2VyL0hvb2tNYW5hZ2VyLnRzIiwic3JjL2hvb2tlci9ob29rLnRzIiwic3JjL2luZGV4LnRzIiwic3JjL21vZHVsZS50cyIsInNyYy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7OztBQzFFQSxtQ0FBOEI7QUFLdkIsTUFBTSxVQUFVLEdBQUcsQ0FBQyxJQUFXLEVBQUUsRUFBRTtJQUN0QyxJQUFBLFdBQUcsRUFBQyxJ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QixDQUFDLENBQUM7UUFDaEQsSUFBSSxHQUFHLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN0QyxJQUFJLE9BQU8sR0FBRyxHQUFHLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDbEMsSUFBSSxPQUFPLElBQUksU0FBUyxJQUFJLE9BQU8sSUFBSSxJQUFJLEVBQUU7WUFDekMsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2hDLElBQUksVUFBVSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQzlDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUVBQWlFLENBQUMsQ0FBQztZQUMvRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUVBQW1FLENBQUMsQ0FBQztZQUNqRixTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7U0FDeEI7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQTtBQWRZLFFBQUEsY0FBYyxrQkFjMUI7QUFFTSxNQUFNLFlBQVksR0FBRyxDQUFDLE9BQWtCLEVBQUUsRUFBRTtJQUMvQyxJQUFHLElBQUksRUFBQztRQUNKLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDVCxPQUFPLENBQUMsR0FBRyxDQUFDLGlFQUFpRSxDQUFDLENBQUM7WUFDL0UsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsR0FBRSxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQSxRQUFRO1lBQ3RJLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUVBQW1FLENBQUMsQ0FBQztRQUNyRixDQUFDLENBQUMsQ0FBQztLQUNOO0FBQ0wsQ0FBQyxDQUFBO0FBUlksUUFBQSxZQUFZLGdCQVF4QjtBQUdNLE1BQU0sZUFBZSxHQUFHLEdBQUcsRUFBRTtJQUNoQyxJQUFJLENBQUMscUJBQXFCLENBQUM7UUFDdkIsT0FBTyxDQUFDLE1BQU07WUFDVixPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hCLENBQUM7UUFDRCxVQUFVO1lBQ04sT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM3QixDQUFDO0tBQ0osQ0FBQyxDQUFBO0FBQ04sQ0FBQyxDQUFBO0FBVFksUUFBQSxlQUFlLG1CQVMzQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIn0=
