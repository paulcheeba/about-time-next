// About Time v13.1.2.0 — FastPriorityQueue & Quentry (unchanged logic with safe UID)
// v13.2.1.0 — Added standardized event card formatter

'use strict';

import { CalendarAdapter } from "./calendar/CalendarAdapter.js";

const defaultcomparator = function (a, b) {
  if (a._time !== b._time) return a._time < b._time;
  return a._uid < b._uid;
};

/**
 * Format standardized event notification card
 * Used by both fresh handlers and reconstructed handlers after reload
 * @param {object} meta - Metadata object with __atName, __atMsg, __macroName, __macroUuid, __duration
 * @param {string} uid - Event UID
 * @param {boolean} recurring - Whether event repeats
 * @param {number} increment - Seconds between repeats (for duration display)
 * @returns {string} Formatted HTML for chat card
 */
function formatEventChatCard(meta, uid, recurring, increment) {
  const escape = (str) => globalThis.foundry?.utils?.escapeHTML?.(str) ?? String(str);

  // Escape arbitrary HTML but allow our known ordinal superscripts.
  const allowOrdinalSup = (escaped) => {
    const s = String(escaped ?? "");
    return s.replace(/&lt;sup&gt;(st|nd|rd|th)&lt;\/sup&gt;/gi, "<sup>$1</sup>");
  };

  const formatTimestamp = (ts) => {
    const t = Number(ts);
    if (!Number.isFinite(t)) return "NA";
    try {
      const adapter = CalendarAdapter.getActive();
      if (adapter && adapter.systemId !== "none") {
        const f = adapter.formatDateTime(t);
        const date = f?.date || "";
        const time = f?.time || "";
        const sep = (date && time) ? ", " : "";
        return `${date}${sep}${time}`.trim() || `t+${Math.round(t)}s`;
      }
    } catch {
      // ignore
    }
    return `t+${Math.round(t)}s`;
  };
  
  const name = escape(meta?.__atName || "NA");
  const message = escape(meta?.__atMsg || "NA");
  const macroName = escape(meta?.__macroName || "NA");
  const recurringText = recurring ? "Yes" : "No";

  // Started On: use preserved original time if available
  const startedOnTs = (meta && typeof meta === "object") ? meta.__atOriginalTime : null;
  const startedOnText = startedOnTs != null ? allowOrdinalSup(escape(formatTimestamp(startedOnTs))) : "";
  
  // Format duration from increment or stored __duration
  let durationText = "NA";
  const durationSeconds = meta?.__duration || (recurring ? increment : 0);
  if (durationSeconds > 0) {
    const d = Math.floor(durationSeconds / 86400);
    const h = Math.floor((durationSeconds % 86400) / 3600);
    const m = Math.floor((durationSeconds % 3600) / 60);
    const s = Math.floor(durationSeconds % 60);
    const pad = (n) => String(n).padStart(2, '0');
    durationText = `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  // Next Occurrence: computed when the event fires (if recurring)
  const nextTs = (meta && typeof meta === "object") ? meta.__atNextTime : null;
  const nextText = (nextTs != null && recurring) ? allowOrdinalSup(escape(formatTimestamp(nextTs))) : "—";
  
  return `<div style="border-left: 3px solid #50fa7b; padding-left: 8px; font-family: monospace;">
<p style="margin: 4px 0;"><strong>[about-time-next]</strong></p>
<p style="margin: 2px 0;"><strong>Event Name:</strong> ${name}</p>
<p style="margin: 2px 0;"><strong>Message:</strong> ${message}</p>
${startedOnText ? `<p style="margin: 2px 0;"><strong>Started On:</strong> ${startedOnText}</p>` : ""}
<p style="margin: 2px 0;"><strong>Duration:</strong> ${durationText}</p>
<p style="margin: 2px 0;"><strong>Next Occurrence:</strong> ${nextText}</p>
<p style="margin: 2px 0;"><strong>Repeating:</strong> ${recurringText}</p>
<p style="margin: 2px 0;"><strong>Macro:</strong> ${macroName}</p>
<p style="margin: 2px 0;"><strong>Event UID:</strong> <code>${escape(uid)}</code></p>
</div>`;
}

export { formatEventChatCard };

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
    if (typeof this._handler === "function" && this._handler._atHandlerType === "gmWhisper") {
 handler = { type: "gmWhisper" };
} else if (typeof this._handler === "function") {
 handler = { type: "none" };
} else {
 handler = { type: "string", val: this._handler };
}

    // Deep clone args to ensure proper serialization through Foundry's settings system
    // Without this, nested objects in _args may be lost on reload
    let serializedArgs;
    try {
      if (globalThis.foundry?.utils?.deepClone) {
        serializedArgs = globalThis.foundry.utils.deepClone(this._args);
      } else {
        // Fallback: JSON round-trip to ensure serializability
        serializedArgs = JSON.parse(JSON.stringify(this._args));
      }
    } catch (e) {
      console.warn("about-time | Failed to serialize args, using empty array", e);
      serializedArgs = [];
    }

    return {
      time: this._time,
      recurring: this._recurring,
      increment: this._increment,
      handler: handler,
      uid: this._uid,
      originator: this._originator,
      args: serializedArgs
    };
  }

  static createFromJSON(data) {
    let handler = null;
    try {
      if (data && data.handler) {
        if (data.handler.type === "string") {
          handler = data.handler.val;
        } else if (data.handler.type === "gmWhisper" || data.handler.type === "none") {
          // Treat 'none' as GM whisper per module behavior: AT output should whisper to GMs even after reload.
          handler = async (...args) => {
            try {
              const ids = ChatMessage.getWhisperRecipients("GM").map((u) => u.id);
              const meta = args?.[args.length - 1];
              // Execute linked macro if present (GM only), prefer UUID then name
              try {
                if (game.user?.isGM && meta && typeof meta === "object") {
                  let md = null;
                  const u = meta.__macroUuid;
                  if (u && typeof fromUuid === "function") { try { md = await fromUuid(u); } catch(_) {} }
                  if (!md && meta.__macroName) md = game.macros?.getName?.(meta.__macroName) ?? game.macros?.find?.(m => m.name === meta.__macroName);
                  if (md?.execute) await md.execute({ args });
                }
              } catch (mx) { console.warn("about-time | macro exec via UUID failed", mx); }
              
              // Always show standardized event card (even when macro runs)
              const cardHtml = formatEventChatCard(meta, data.uid, data.recurring, data.increment);
              await ChatMessage.create({ content: cardHtml, whisper: ids });
            } catch (e) {
              console.warn("about-time | gmWhisper fallback failed", e);
            }
          };
        }
        // legacy "function" -> leave null, we’ll set fallback below
      }
    } catch (err) {
      console.warn(err);
      handler = null;
    }
    if (!handler) {
      console.warn("about-time | Could not restore handler ", data?.handler, " substituting GM whisper fallback");
      handler = async (...args) => {
        try { const ids = ChatMessage.getWhisperRecipients("GM").map((u)=>u.id); await ChatMessage.create({content:"<p>(event)</p>", whisper: ids}); } catch(e) { console.warn("about-time | fallback whisper failed", e); }
      };
    }

    // Ensure args is properly deserialized as an array
    const args = Array.isArray(data.args) ? data.args : [];

    return new Quentry(
      data.time,
      data.recurring,
      data.recurring ? data.increment : null,
      handler,
      data.uid,
      data.originator,
      ...args
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
