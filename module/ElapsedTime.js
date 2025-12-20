// module/ElapsedTime.js
// Event scheduling (v13.3.4.0) — Refactored to use CalendarAdapter system
// Replaces direct Simple Calendar calls with adapter abstraction

import { FastPriorityQueue, Quentry } from "./FastPriorityQueue.js";
import { PseudoClock, PseudoClockMessage, _addEvent } from "./PseudoClock.js";
import { currentWorldTime, dateToTimestamp, intervalATtoSC, intervalSCtoAT, secondsFromATInterval, normalizeATInterval } from "./calendar/DateTime.js";
import { CalendarAdapter } from "./calendar/CalendarAdapter.js";
import { MODULE_ID } from "./settings.js";

// Tiny tolerance to avoid float jitter / early triggers
const EPS = 0.25; // seconds

const _moduleSocket = `module.${MODULE_ID}`;
let _userId = "";
let _isGM = false;

const log  = (...args) => console.log(`${MODULE_ID} |`, ...args);
const warn = (...args) => ElapsedTime.debug && console.warn(`${MODULE_ID} |`, ...args);

/**
 * Get the active calendar adapter (v13.3.4.0 - Phase 3)
 * @returns {CalendarAdapter} The active calendar adapter
 */
function getCalendarAdapter() {
  return CalendarAdapter.getActive();
}

/**
 * Check if a calendar system (not just core time) is available
 * @returns {boolean} True if SC or S&S is active
 */
function hasCalendarSystem() {
  const adapter = getCalendarAdapter();
  return adapter && adapter.getSystemName() !== "None";
}

export class ElapsedTime {
  get eventQueue() { return ElapsedTime._eventQueue; }
  set eventQueue(queue) { ElapsedTime._eventQueue = queue; }

  static currentTimeString() {
    const adapter = getCalendarAdapter();
    const result = adapter.formatDateTime(game.time.worldTime);
    return result.time || String(game.time.worldTime);
  }

  static timeString(duration) {
    const adapter = getCalendarAdapter();
    const result = adapter.formatDateTime(duration);
    return result.time || String(duration);
  }

  static currentTime() {
    if (!hasCalendarSystem()) return game.time.worldTime;
    const adapter = getCalendarAdapter();
    const date = adapter.timestampToDate(game.time.worldTime);
    return intervalSCtoAT(date);
  }

  static currentTimeSeconds() { return game.time.worldTime; }

  static status() {
    console.log(ElapsedTime._eventQueue.array, ElapsedTime._eventQueue.size, ElapsedTime._saveInterval);
  }

  static _displayCurrentTime() {
    if (!hasCalendarSystem()) return;
    const adapter = getCalendarAdapter();
    console.log(`Elapsed time ${adapter.formatTimestamp(game.time.worldTime)}`);
  }

  static setClock()      { console.error(`${MODULE_ID} | setClock() deprecated.`); }
  static advanceClock()  { console.error(`${MODULE_ID} | advanceClock() deprecated.`); }
  static advanceTime()   { console.error(`${MODULE_ID} | advanceTime() deprecated.`); }
  static setTime()       { console.error(`${MODULE_ID} | setTime() deprecated.`); }
  static setDateTime()   { console.error(`${MODULE_ID} | setDateTime() deprecated.`); }
  static setAbsolute()   { console.error(`${MODULE_ID} | setAbsolute() deprecated.`); }

  // --- Absolute "at" (date/time object or timestamp) ---
  static doAt(when, handler, ...args) {
    if (typeof when !== "number") {
      when = intervalATtoSC(when);
      when = dateToTimestamp(when);
    }
    return ElapsedTime._addEVent(when, false, null, handler, ...args);
  }

  // --- Relative "in" (interval) -> schedule once ---
  static doIn(when, handler, ...args) {
    // Produce a numeric delta in seconds; prefer calendar adapter when available, else fallback
    let incSeconds;
    if (typeof when === "number") {
      incSeconds = Math.floor(when);
    } else {
      const norm = normalizeATInterval(when);
      const adapter = getCalendarAdapter();
      if (hasCalendarSystem()) {
        const nextTs = adapter.timestampPlusInterval(0, norm);
        incSeconds = Math.max(0, Math.floor(nextTs)); // base 0 => pure interval in seconds
      } else {
        incSeconds = secondsFromATInterval(norm);
      }
    }
    const at = Math.floor(currentWorldTime()) + incSeconds;
    return ElapsedTime._addEVent(at, false, 0, handler, ...args);
  }

  // --- Relative "every" (interval) -> schedule repeat ---
  static doEvery(when, handler, ...args) {
    // Compute numeric increment (seconds) and the first fire time
    let incSeconds;
    if (typeof when === "number") {
      incSeconds = Math.floor(when);
    } else {
      const norm = normalizeATInterval(when);
      const adapter = getCalendarAdapter();
      if (hasCalendarSystem()) {
        const base = 0;
        const nextTs = adapter.timestampPlusInterval(base, norm);
        incSeconds = Math.max(0, Math.floor(nextTs - base));
      } else {
        incSeconds = secondsFromATInterval(norm);
      }
    }
    if (!incSeconds) return;
    const baseNow = Math.floor(currentWorldTime());
    const first = baseNow + incSeconds;
    // IMPORTANT: increment must be numeric seconds so repeats reschedule correctly
    return ElapsedTime._addEVent(first, true, incSeconds, handler, ...args);
  }

  static reminderAt(when, ...args) {
    when = intervalATtoSC(when);
    return this.doAt(when, (...a) => game.abouttime.ElapsedTime.message(...a), ...args);
  }
  static reminderIn(when, ...args)  { return this.doIn(when, (...a)  => game.abouttime.ElapsedTime.message(...a), ...args); }
  static reminderEvery(interval, ...args) { return this.doEvery(interval, (...a) => game.abouttime.ElapsedTime.message(...a), ...args); }

  static notifyAt(when, eventName, ...args)  { return this.doAt(when,   (e, ...a) => game.abouttime._notifyEvent(e, ...a), eventName, ...args); }
  static notifyIn(when, eventName, ...args)  { return this.doIn(when,   (e, ...a) => game.abouttime._notifyEvent(e, ...a), eventName, ...args); }
  static notifyEvery(when, eventName, ...args) { return this.doEvery(when, (e, ...a) => game.abouttime._notifyEvent(e, ...a), eventName, ...args); }

  static _addEVent(time, recurring, increment = null, handler, ...args) {
    if (typeof time !== "number") time = dateToTimestamp(time);
    if (time < 0) {
      ui.notifications.warn("Cannot set event in the past");
      time = 1;
    }
    const entry = new Quentry(time, recurring, increment, handler, null, game.user.id, ...args);

    if (PseudoClock.isMaster) {
      ElapsedTime._eventQueue.add(entry);
      ElapsedTime._save(true);
      ElapsedTime._increment = increment;
      return entry._uid;
    } else {
      const eventMessage = new PseudoClockMessage({ action: _addEvent, userId: game.user.id, newTime: 0 }, entry.exportToJson());
      PseudoClock._notifyUsers(eventMessage);
      return entry._uid;
    }
  }

  static gclearTimeout(uid) { return ElapsedTime._eventQueue.removeId(uid); }

  // Legacy helpers that pass increment explicitly (keep behavior)
  static doAtEvery(when, every, handler, ...args) {
    // Convert 'every' to numeric seconds if object
    let incSeconds;
    if (typeof every === "number") {
      incSeconds = Math.floor(every);
    } else {
      const adapter = getCalendarAdapter();
      if (hasCalendarSystem()) {
        incSeconds = Math.max(0, Math.floor(adapter.timestampPlusInterval(0, normalizeATInterval(every))));
      } else {
        incSeconds = secondsFromATInterval(every);
      }
    }
    const at = (typeof when === "number") ? when : dateToTimestamp(intervalATtoSC(when));
    return ElapsedTime._addEVent(at, true, incSeconds, handler, ...args);
  }
  
  static reminderAtEvery(when, every, ...args) {
    let incSeconds;
    if (typeof every === "number") {
      incSeconds = Math.floor(every);
    } else {
      const adapter = getCalendarAdapter();
      if (hasCalendarSystem()) {
        incSeconds = Math.max(0, Math.floor(adapter.timestampPlusInterval(0, normalizeATInterval(every))));
      } else {
        incSeconds = secondsFromATInterval(every);
      }
    }
    const at = (typeof when === "number") ? when : dateToTimestamp(intervalATtoSC(when));
    return ElapsedTime._addEVent(at, true, incSeconds, (...a) => game.abouttime.ElapsedTime.message(...a), ...args);
  }
  static notifyAtEvery(when, every, eventName, ...args) {
    let incSeconds = (typeof every === "number")
      ? Math.floor(every)
      : (isSCActive() && globalThis.SimpleCalendar?.api?.timestampPlusInterval)
          ? Math.max(0, Math.floor(globalThis.SimpleCalendar.api.timestampPlusInterval(0, normalizeATInterval(every))))
          : secondsFromATInterval(every);
    const at = (typeof when === "number") ? when : dateToTimestamp(intervalATtoSC(when));
    return ElapsedTime._addEVent(at, true, incSeconds, (e, ...a) => game.abouttime._notifyEvent(e, ...a), eventName, ...args);
  }

  // --- Queue processor (already improved) ---
  static async pseudoClockUpdate() {
    // Only the master processes the queue (unchanged behavior)
    if (!PseudoClock.isMaster) return;

    const q = ElapsedTime._eventQueue;
    let needSave = false;
    // Normalize to integer seconds to avoid tiny jitter; compare with EPS
    const nowSec = Math.floor(currentWorldTime());

    while (q.peek() && (q.peek()._time - nowSec) <= EPS) {
      const qe = q.poll(); // remove head
      try {
        // ---- Execute the entry's handler (string macro id/name OR function) ----
        if (typeof qe._handler === "string") {
          const macro =
            game.macros.get(qe._handler) ||
            game.macros.getName(qe._handler);
          if (macro) {
            // Prefer v11+ execute, fall back to legacy eval if needed
            if (typeof macro.execute === "function") {
              await macro.execute({ args: qe._args ?? [] });
            } else {
              const body = `return (async () => { ${macro.command} })()`;
              const fn = Function("{speaker, actor, token, character, args}={}", body);
              await fn.call(this, { speaker: {}, actor: undefined, token: undefined, character: null, args: qe._args ?? [] });
            }
          }
        } else if (typeof qe._handler === "function") {
          await qe._handler(...(qe._args ?? []));
        }

        // ---- Reschedule repeating entries drift-free ----
        if (qe._recurring && Number(qe._increment) > 0) {
          const iv = Math.floor(Number(qe._increment));
          // Count how many whole intervals have passed since the scheduled time.
          // +EPS avoids missing an interval due to rounding; +1 ensures strictly in the future.
          const missed = Math.max(1, Math.ceil((nowSec - qe._time + EPS) / iv));
          qe._time = qe._time + missed * iv;  // reschedule from last scheduled time
          q.add(qe);                           // reinsert (do NOT remove a repeating event)
        }
      } catch (err) {
        console.error("about-time | queue entry failed", err);
      } finally {
        needSave = true;
      }
    }

    if (needSave) ElapsedTime._save(true);
  }

  static _flushQueue() {
    if (PseudoClock.isMaster) {
      ElapsedTime._eventQueue = new FastPriorityQueue();
      ElapsedTime._save(true);
    }
  }

  static _load() {
    const saveData = game.settings.get(MODULE_ID, "store");
    if (!saveData) ElapsedTime._initialize();
    else ElapsedTime._createFromData(saveData);
  }

  static _save(force = false) {
    if (!PseudoClock.isMaster) return;
    const now = Date.now();
    if ((now - ElapsedTime._lastSaveTime > ElapsedTime._saveInterval) || force) {
      game.settings.set(MODULE_ID, "store", { _eventQueue: ElapsedTime._eventQueue.exportToJSON() });
      ElapsedTime._lastSaveTime = now;
    }
  }

  static init() {
    _userId = game.user.id;
    _isGM = game.user.isGM;
    ElapsedTime._lastSaveTime = Date.now();
    ElapsedTime._fetchParams();
    ElapsedTime._load();
    Hooks.on("updateWorldTime", ElapsedTime.pseudoClockUpdate);
  }

  static _initialize() {
    ElapsedTime._eventQueue = new FastPriorityQueue();
    if (PseudoClock.isMaster) ElapsedTime._save(true);
  }

  static _createFromData(data) {
    ElapsedTime._eventQueue = FastPriorityQueue.createFromJson(data._eventQueue);
    ElapsedTime._fetchParams();
  }

  static _fetchParams() {
    ElapsedTime.debug = game.settings.get(MODULE_ID, "debug") || false;
  }

  static showQueue() {
    if (ElapsedTime._eventQueue.size === 0) {
      console.log("Empty Queue");
      return;
    }
    for (let i = 0; i < ElapsedTime._eventQueue.size; i++) {
      log(
        `queue [${i}]`,
        ElapsedTime._eventQueue.array[i]._uid,
        globalThis.SimpleCalendar?.api?.timestampToDate?.(ElapsedTime._eventQueue.array[i]._time),
        ElapsedTime._eventQueue.array[i]._recurring,
        ElapsedTime._eventQueue.array[i]._increment,
        ElapsedTime._eventQueue.array[i]._handler,
        ElapsedTime._eventQueue.array[i]._args
      );
    }
  }

  static chatQueue({ showArgs = false, showUid = false, showDate = false, gmOnly = true } = {}) {
    let content = "";
    for (let i = 0; i < ElapsedTime._eventQueue.size; i++) {
      if (showUid) content += ElapsedTime._eventQueue.array[i]._uid + " ";
      const dt = globalThis.SimpleCalendar?.api?.timestampToDate?.(ElapsedTime._eventQueue.array[i]._time);
      const f  = dt ? globalThis.SimpleCalendar.api.formatDateTime(dt) : { date: "", time: `t+${ElapsedTime._eventQueue.array[i]._time}` };
      if (showDate) content += (f.date ? f.date + " " : "");
      content += f.time + " ";
      const handlerString = typeof ElapsedTime._eventQueue.array[i]._handler === "string"
        ? ElapsedTime._eventQueue.array[i]._handler
        : "[function]";
      content += handlerString + " ";
      if (showArgs) content += ElapsedTime._eventQueue.array[i]._args;
      content += "\n";
    }
    const chatData = {};
    if (gmOnly) chatData.whisper = ChatMessage.getWhisperRecipients("GM").filter(u => u.active);
    chatData.content = content || "Empty Queue";
    ChatMessage.create(chatData);
  }

  static message(content, alias = null, targets = undefined, ...args) {
  const Doc = CONFIG.ChatMessage.documentClass;

  // Base payload (v12+: 'style' replaces 'type')
  const chatData = {
    user: game.user.id,
    content,
    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    flags: {}
  };
  if (alias) chatData.speaker = { alias };

  // Default per workflow: GM-only whisper unless explicitly overridden
  let recipients = null;

  if (targets === "PUBLIC") {
    recipients = null; // public message
  } else if (Array.isArray(targets) && targets.length) {
    recipients = [];
    for (const id of targets) {
      recipients = recipients.concat(Doc.getWhisperRecipients(id));
    }
  } else if (typeof targets === "string" && targets.trim()) {
    recipients = Doc.getWhisperRecipients(targets.trim());
  } else {
    // Default: GM-only
    recipients = Doc.getWhisperRecipients("GM").filter(u => u.active);
  }

  if (recipients && recipients.length > 0) chatData.whisper = recipients;

  Doc.create(chatData);
}


}

ElapsedTime.debug = true;
ElapsedTime._saveInterval = 60 * 1000;

async function macroExecute(macro, ...args) {
  if (isNewerVersion(game.version, "11.0")) return macro.execute({ args });
  const body = `return (async () => { ${macro.command} })()`;
  const fn = Function("{speaker, actor, token, character, item, args}={}", body);
  return fn.call(this, { speaker: {}, actor: undefined, token: undefined, character: null, args });
}
