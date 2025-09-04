// About Time v13.0.9.0.1 — FastPriorityQueue & Quentry
// Changes: remove eval-based handler revival; add handler registry; legacy-safe serialization

'use strict';

// Lightweight handler registry for persisted queue handlers
const __AT_HANDLER_REGISTRY = new Map();
function __atRegisterHandler(id, fn) {
  if (id && typeof fn === "function") __AT_HANDLER_REGISTRY.set(String(id), fn);
}
function __atGetHandler(id) {
  return __AT_HANDLER_REGISTRY.get(String(id)) || null;
}

const defaultcomparator = function (a, b) {
  if (a._time !== b._time) return a._time < b._time;
  return a._uid < b._uid;
};

// Quentry holds an entry in the priority queue
class Quentry {
  static registerHandler(id, fn) { __atRegisterHandler(id, fn); }
  static getHandler(id) { return __atGetHandler(id); }

  constructor(time, recurring, increment, handler, uid, originator, ...args) {
    const uidGen =
      (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function" && globalThis.crypto.randomUUID()) ||
      (globalThis.foundry && globalThis.foundry.utils && typeof globalThis.foundry.utils.randomID === "function" && globalThis.foundry.utils.randomID()) ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    this._time = time;
    this._recurring = recurring;
    this._increment = increment;
    this._handler = handler;
    this._uid = uid === null ? uidGen : uid;
    this._originator = originator;
    this._args = args;
  }

  exportToJson() {
    let handler;
    if (typeof this._handler === "function") {
      const id = this._handler._atHandlerId || null;
      if (id && __atGetHandler(id)) handler = { type: "registry", id: String(id) };
      else handler = { type: "none" };
    } else {
      handler = { type: "string", val: this._handler };
    }
    return {
      time: this._time,
      recurring: this._recurring,
      increment: this._increment,
      handler: handler,
      uid: this._uid,
      originator: this._originator,
      args: this._args
    };
  }

  static createFromJSON(data) {
    let handler = null;
    try {
      if (data && data.handler) {
        if (data.handler.type === "registry") {
          handler = __atGetHandler(data.handler.id) || null;
        } else if (data.handler.type === "string") {
          handler = data.handler.val; // textual descriptor or macro name
        } else if (data.handler.type === "function") {
          // Legacy persisted function — do not eval
          console.warn("about-time | Legacy function handler ignored during restore; substituting console.log");
          handler = null;
        } else if (data.handler.type === "none") {
          handler = null;
        }
      }
    } catch (err) {
      console.warn(err);
      handler = null;
    }
    if (!handler) {
      handler = (...a) => console.log("about-time | restored event (no handler) args:", ...a);
    }
    return new Quentry(
      data.time,
      data.recurring,
      data.recurring ? data.increment : null,
      handler,
      data.uid,
      data.originator,
      ...data.args
    );
  }
}

export class FastPriorityQueue {
  constructor(comparator = defaultcomparator) {
    this.clone = function () {
      var fpq = new FastPriorityQueue(this.compare);
      fpq.size = this.size;
      for (var i = 0; i < this.size; i++) fpq.array.push(this.array[i]);
      return fpq;
    };

    this.add = function (myval) {
      var i = this.size;
      this.array[this.size] = myval;
      this.size += 1;
      var p, ap;
      while (i > 0) {
        p = (i - 1) >> 1;
        ap = this.array[p];
        if (this.compare(myval, ap) >= 0) break;
        this.array[i] = ap;
        i = p;
      }
      this.array[i] = myval;
      return true;
    };

    this.poll = function () {
      if (this.size === 0) return undefined;
      var ans = this.array[0];
      var x = this.array[this.size - 1];
      this.size -= 1;
      if (this.size > 0) {
        var i = 0, a = this.array;
        var half = this.size >> 1;
        while (i < half) {
          var j = (i << 1) + 1;
          var right = j + 1;
          var best = a[j];
          if (right < this.size && this.compare(a[right], best) < 0) {
            j = right;
            best = a[right];
          }
          if (this.compare(best, x) >= 0) break;
          a[i] = best;
          i = j;
        }
        a[i] = x;
      }
      return ans;
    };

    this.peek = function () { return this.array[0]; };

    this.replaceTop = function (myval) {
      var ans = this.array[0];
      this.array[0] = myval;
      var i = 0, a = this.array;
      var half = this.size >> 1;
      while (i < half) {
        var j = (i << 1) + 1;
        var right = j + 1;
        var best = a[j];
        if (right < this.size && this.compare(a[right], best) < 0) {
          j = right;
          best = a[right];
        }
        if (this.compare(best, myval) >= 0) break;
        a[i] = best;
        i = j;
      }
      return ans;
    };

    this.heapify = function (arr) {
      this.array = arr || [];
      this.size = this.array.length;
      for (var i = (this.size >> 1) - 1; i >= 0; i--) this._percolateDown(i);
      return this;
    };

    this._percolateDown = function (i) {
      var x = this.array[i];
      var a = this.array;
      var size = this.size;
      for (;;) {
        var l = (i << 1) + 1;
        if (l >= size) break;
        var r = l + 1;
        var best = a[l];
        if (r < size && this.compare(a[r], best) < 0) best = a[r], l = r;
        if (this.compare(best, x) >= 0) break;
        a[i] = best;
        i = l;
      }
      a[i] = x;
    };

    this.array = [];
    this.size = 0;
    this.compare = comparator || defaultcomparator;
    return this;
  }

  static createFromJson(data) {
    const fpq = new FastPriorityQueue();
    if (!data) return fpq;
    const arr = Array.isArray(data.array) ? data.array.map(qe => Quentry.createFromJSON(qe)) : [];
    fpq.heapify(arr);
    return fpq;
  }

  exportToJSON() {
    return {
      size: this.size,
      compare: this.compare.toString(),
      array: this.array.map(e => e.exportToJson()).slice(0, this.size)
    };
  }
}

export { Quentry };
