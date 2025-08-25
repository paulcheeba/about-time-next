// module/ElapsedTime.js
// Event scheduling (v13.0.5.1) — stabilized SC checks and logging

import { FastPriorityQueue, Quentry } from "./FastPirorityQueue.js";
import { PseudoClock, PseudoClockMessage, _addEvent } from "./PseudoClock.js";
import { currentWorldTime, dateToTimestamp, intervalATtoSC, intervalSCtoAT } from "./calendar/DateTime.js";
import { MODULE_ID } from "./settings.js";

const _moduleSocket = `module.${MODULE_ID}`;
let _userId = "";
let _isGM = false;

const log  = (...args) => console.log(`${MODULE_ID} |`, ...args);
const warn = (...args) => ElapsedTime.debug && console.warn(`${MODULE_ID} |`, ...args);

function isSCActive() {
  const useSC = game.settings.get(MODULE_ID, "use-simple-calendar");
  if (!useSC) return false;
  const sc = game.modules.get("foundryvtt-simple-calendar") ?? game.modules.get("simple-calendar");
  return !!(sc && sc.active && globalThis.SimpleCalendar?.api);
}

export class ElapsedTime {
  get eventQueue() { return ElapsedTime._eventQueue; }
  set eventQueue(queue) { ElapsedTime._eventQueue = queue; }

  static currentTimeString() {
    if (!isSCActive()) return String(game.time.worldTime);
    const datetime = globalThis.SimpleCalendar.api.timestampToDate(game.time.worldTime);
    return `${datetime.hour}:${datetime.minute}:${datetime.second}`;
  }

  static timeString(duration) {
    if (!isSCActive()) return String(duration);
    const datetime = globalThis.SimpleCalendar.api.timestampToDate(duration);
    return `${datetime.hour}:${datetime.minute}:${datetime.second}`;
  }

  static currentTime() {
    if (!isSCActive()) return game.time.worldTime;
    return intervalSCtoAT(globalThis.SimpleCalendar.api.timestampToDate(game.time.worldTime));
  }

  static currentTimeSeconds() { return game.time.worldTime; }

  static status() {
    console.log(ElapsedTime._eventQueue.array, ElapsedTime._eventQueue.size, ElapsedTime._saveInterval);
  }

  static _displayCurrentTime() {
    if (!isSCActive()) return;
    console.log(`Elapsed time ${globalThis.SimpleCalendar.api.timestampToDate(game.time.worldTime)}`);
  }

  static setClock()      { console.error(`${MODULE_ID} | setClock() deprecated.`); }
  static advanceClock()  { console.error(`${MODULE_ID} | advanceClock() deprecated.`); }
  static advanceTime()   { console.error(`${MODULE_ID} | advanceTime() deprecated.`); }
  static setTime()       { console.error(`${MODULE_ID} | setTime() deprecated.`); }
  static setDateTime()   { console.error(`${MODULE_ID} | setDateTime() deprecated.`); }
  static setAbsolute()   { console.error(`${MODULE_ID} | setAbsolute() deprecated.`); }

  static doAt(when, handler, ...args) {
    if (typeof when !== "number") {
      when = intervalATtoSC(when);
      when = dateToTimestamp(when);
    }
    return ElapsedTime._addEVent(when, false, null, handler, ...args);
  }

  static doIn(when, handler, ...args) {
    if (typeof when !== "number") {
      when = intervalATtoSC(when);
      when = globalThis.SimpleCalendar?.api?.timestampPlusInterval?.(0, when) ?? when;
    }
    return ElapsedTime._addEVent(when, false, null, handler, ...args);
  }

  static doEvery(when, handler, ...args) {
    if (typeof when !== "number") when = intervalATtoSC(when);
    const base = currentWorldTime();
    const first = (typeof when === "number")
      ? base + when
      : globalThis.SimpleCalendar?.api?.timestampPlusInterval?.(base, when) ?? base;
    return ElapsedTime._addEVent(first, true, when, handler, ...args);
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

  static doAtEvery(when, every, handler, ...args) {
    return ElapsedTime._addEVent(when, true, every, handler, ...args);
  }
  static reminderAtEvery(when, every, ...args) {
    return ElapsedTime._addEVent(when, true, every, (...a) => game.abouttime.ElapsedTime.message(...a), ...args);
  }
  static notifyAtEvery(when, every, eventName, ...args) {
    return ElapsedTime._addEVent(when, true, every, (e, ...a) => game.abouttime._notifyEvent(e, ...a), eventName, ...args);
  }

  static async pseudoClockUpdate() {
    if (!PseudoClock.isMaster) return;
    let needSave = false;
    const q = ElapsedTime._eventQueue;

    while (q.peek() && q.peek()._time <= currentWorldTime()) {
      const qe = q.poll();
      try {
        if (typeof qe._handler === "string") {
          const macro = game.macros.get(qe._handler) || game.macros.getName(qe._handler);
          if (macro) await macroExecute(macro, ...qe._args);
        } else {
          await qe._handler(...qe._args);
        }
        if (qe._recurring) {
          let next;
          if (typeof qe._increment === "number") next = qe._time + qe._increment;
          else next = globalThis.SimpleCalendar?.api?.timestampPlusInterval?.(qe._time, qe._increment);
          if (next > qe._time) {
            qe._time = next;
            q.add(qe);
          } else {
            console.error(`${MODULE_ID} | Recurring event reschedule rejected`, qe);
          }
        }
      } catch (err) {
        console.error(err);
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

  static message(content, alias = null, targets = null, ...args) {
    const Doc = CONFIG.ChatMessage.documentClass;
    const chatData = {
      user: game.user.id,
      content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      flags: {}
    };
    if (alias) chatData.speaker = { alias };
    if (targets) {
      let whisperTargets = [];
      if (Array.isArray(targets)) {
        for (let id of targets) whisperTargets = whisperTargets.concat(Doc.getWhisperRecipients(id));
      } else if (typeof targets === "string") {
        whisperTargets = Doc.getWhisperRecipients(targets);
      }
      if (whisperTargets.length > 0) chatData["whisper"] = whisperTargets;
    }
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
