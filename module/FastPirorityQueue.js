// About Time v13.0.5 — FastPriorityQueue & Quentry (unchanged logic with safe UID)

'use strict';

const defaultcomparator = function (a, b) {
  if (a._time !== b._time) return a._time < b._time;
  return a._uid < b._uid;
};

export class Quentry {
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
    if (typeof this._handler === "function") handler = { type: "function", val: this._handler.toString() };
    else handler = { type: "string", val: this._handler };
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
    let handler;
    try {
      if (data.handler.type === "function") handler = eval("handler = " + data.handler.val);
      else handler = data.handler.val;
    } catch (err) {
      console.warn(err);
      handler = null;
    }
    if (!handler) {
      console.warn("about-time | Could not restore handler ", data.handler, "substituting console.log");
      handler = console.log;
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
        if (!this.compare(myval, ap)) break;
        this.array[i] = ap;
        i = p;
      }
      this.array[i] = myval;
    };

    this.heapify = function (arr) {
      this.array = arr;
      this.size = arr.length;
      for (let i = (this.size >> 1); i >= 0; i--) this._percolateDown(i);
    };

    this._percolateUp = function (i, force) {
      var myval = this.array[i];
      var p, ap;
      while (i > 0) {
        p = (i - 1) >> 1;
        ap = this.array[p];
        if (!force && !this.compare(myval, ap)) break;
        this.array[i] = ap;
        i = p;
      }
      this.array[i] = myval;
    };

    this._percolateDown = function (i) {
      var size = this.size;
      var hsize = this.size >>> 1;
      var ai = this.array[i];
      var l, r, bestc;
      while (i < hsize) {
        l = (i << 1) + 1;
        r = l + 1;
        bestc = this.array[l];
        if (r < size) {
          if (this.compare(this.array[r], bestc)) {
            l = r;
            bestc = this.array[r];
          }
        }
        if (!this.compare(bestc, ai)) break;
        this.array[i] = bestc;
        i = l;
      }
      this.array[i] = ai;
    };

    this._removeAt = function (index) {
      if (index > this.size - 1 || index < 0) return undefined;
      this._percolateUp(index, true);
      return this.poll();
    };

    this.remove = function (myval) {
      for (var i = 0; i < this.size; i++) {
        if (!this.compare(this.array[i], myval) && !this.compare(myval, this.array[i])) {
          this._removeAt(i);
          return true;
        }
      }
      return false;
    };

    this.removeId = function (id) {
      for (var i = 0; i < this.size; i++) {
        if (this.array[i]._uid === id) return this._removeAt(i);
      }
      return undefined;
    };

    this._batchRemove = function (callback, limit) {
      var retArr = new Array(limit ? limit : this.size);
      var count = 0;
      if (typeof callback === 'function' && this.size) {
        var i = 0;
        while (i < this.size && count < retArr.length) {
          if (callback(this.array[i])) {
            retArr[count] = this._removeAt(i);
            count++;
            i = i >> 1;
          } else i++;
        }
      }
      retArr.length = count;
      return retArr;
    };

    this.removeOne = function (callback) {
      var arr = this._batchRemove(callback, 1);
      return arr.length > 0 ? arr[0] : undefined;
    };

    this.removeMany = function (callback, limit) { return this._batchRemove(callback, limit); };

    this.peek = () => { if (this.size === 0) return undefined; return this.array[0]; };

    this.poll = function () {
      if (this.size == 0) return undefined;
      var ans = this.array[0];
      if (this.size > 1) {
        this.array[0] = this.array[--this.size];
        this._percolateDown(0);
      } else this.size -= 1;
      return ans;
    };

    this.replaceTop = function (myval) {
      if (this.size == 0) return undefined;
      var ans = this.array[0];
      this.array[0] = myval;
      this._percolateDown(0);
      return ans;
    };

    this.trim = function () { this.array = this.array.slice(0, this.size); };
    this.isEmpty = function () { return this.size === 0; };

    this.forEach = function (callback) {
      if (this.isEmpty() || typeof callback != 'function') return;
      var i = 0;
      var fpq = this.clone();
      while (!fpq.isEmpty()) callback(fpq.poll(), i++);
    };

    this.kSmallest = function (k) {
      if (this.size == 0) return [];
      var comparator = this.compare;
      var arr = this.array;
      var fpq = new FastPriorityQueue(function (a, b) { return comparator(arr[a], arr[b]); });
      k = Math.min(this.size, k);
      var smallest = new Array(k);
      var j = 0;
      fpq.add(0);
      while (j < k) {
        var small = fpq.poll();
        smallest[j++] = this.array[small];
        var l = (small << 1) + 1;
        var r = l + 1;
        if (l < this.size) fpq.add(l);
        if (r < this.size) fpq.add(r);
      }
      return smallest;
    };

    this.toString = () => this.array.toString();

    if (!(this instanceof FastPriorityQueue)) return new FastPriorityQueue(comparator);
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
