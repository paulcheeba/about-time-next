function intervalToSeconds(iv = {}) {
  // safe ints; fallback for SC-off mode
  const day = Number(iv.day ?? iv.days ?? 0);
  const hour = Number(iv.hour ?? iv.hours ?? 0);
  const minute = Number(iv.minute ?? iv.minutes ?? 0);
  const second = Number(iv.second ?? iv.seconds ?? 0);

  // use DTCalc.spd if available; else 24h
  const spd = (globalThis.game?.abouttime?.DTC?.spd) ? game.abouttime.DTC.spd : 24 * 60 * 60;
  return (day * spd) + (hour * 3600) + (minute * 60) + second;
}

import { FastPriorityQueue, Quentry } from "./FastPirorityQueue.js";
import { PseudoClock, PseudoClockMessage, _addEvent } from "./PseudoClock.js";
import { currentWorldTime, dateToTimestamp, intervalATtoSC, intervalSCtoAT } from "./calendar/DateTime.js";
import { MODULE_ID } from "./settings.js";

const _moduleSocket = `module.${MODULE_ID}`;
let _userId = "";
let _isGM = false;

const warn = (...args) => { if (ElapsedTime.debug) console.warn(`${MODULE_ID} | `, ...args); };
const log  = (...args) => { console.log(`${MODULE_ID} | `, ...args); };

function isSCActive() {
  const useSC = game.settings?.get?.(MODULE_ID, "use-simple-calendar") ?? true;
  if (!useSC) return false;
  const sc = game.modules.get("foundryvtt-simple-calendar") ?? game.modules.get("simple-calendar");
  return !!(sc && sc.active && globalThis.SimpleCalendar?.api);
}

export class ElapsedTime {
  get eventQueue() { return ElapsedTime._eventQueue; }
  set eventQueue(queue) { ElapsedTime._eventQueue = queue; }

  static currentTimeString() {
    if (!isSCActive()) return `t+${Math.floor(game.time.worldTime)}s`;
    const datetime = globalThis.SimpleCalendar.api.timestampToDate(game.time.worldTime);
    return `${datetime.hour}:${datetime.minute}:${datetime.second}`;
  }

  static timeString(duration) {
    if (!isSCActive()) return `${duration}s`;
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

  static setClock(timeInSeconds) { console.error(`${MODULE_ID} | setClock() deprecated.`); }
  static advanceClock(timeIncrement) { console.error(`${MODULE_ID} | advanceClock() deprecated.`); }
  static advanceTime(spec = {}) { console.error(`${MODULE_ID} | advanceTime() deprecated.`); }
  static setTime(spec) { console.error(`${MODULE_ID} | setTime() deprecated.`); }
  static setDateTime(dt) { console.error(`${MODULE_ID} | setDateTime() deprecated.`); }
  static setAbsolute(spec = { years:0, months:0, days:0, hours:0, minutes:0, seconds:0 }) { console.error(`${MODULE_ID} | setAbsolute() deprecated.`); }

  static doAt(when, handler, ...args) {
    if (typeof when !== "number") {
      when = intervalATtoSC(when);
      when = dateToTimestamp(when);
    }
    return ElapsedTime.gsetTimeoutAt(when, handler, ...args);
  }

  static doIn(when, handler, ...args) {
    if (typeof when !== "number") {
      when = intervalATtoSC(when);
      when = globalThis.SimpleCalendar?.api?.timestampPlusInterval?.(0, when);
    }
    return ElapsedTime.gsetTimeoutIn(when, handler, ...args);
  }

  static doEvery(when, handler, ...args) {
    if (typeof when !== "number") when = intervalATtoSC(when);
    return ElapsedTime.gsetInterval(when, handler, ...args);
  }

  static reminderAt(when, ...args) {
    when = intervalATtoSC(when);
    return this.doAt(when, (...a) => game.abouttime.ElapsedTime.message(...a), ...args);
  }

  static reminderIn(when, ...args) {
    return this.doIn(when, (...a) => game.abouttime.ElapsedTime.message(...a), ...args);
  }

  static reminderEvery(interval, ...args) {
    return this.doEvery(interval, (...a) => game.abouttime.ElapsedTime.message(...a), ...args);
  }

  static notifyAt(when, eventName, ...args) {
    if (ElapsedTime.debug) ElapsedTime.log("notifyAt", eventName, ...args);
    return this.doAt(when, (e, ...a) => game.abouttime._notifyEvent(e, ...a), eventName, ...args);
  }

  static notifyIn(when, eventName, ...args) {
    return this.doIn(when, (e, ...a) => game.abouttime._notifyEvent(e, ...a), eventName, ...args);
  }

  static notifyEvery(when, eventName, ...args) {
    if (ElapsedTime.debug) ElapsedTime.log("notifyEvery", eventName, ...args);
    return this.doEvery(when, (e, ...a) => game.abouttime._notifyEvent(e, ...a), eventName, ...args);
  }

  static gsetTimeout(when, handler, ...args) {
    let timeout;
    if (typeof when !== "number") {
      when = intervalATtoSC(when);
      //timeout = globalThis.SimpleCalendar?.api?.timestampPlusInterval?.(currentWorldTime(), when);
      const scAdd = globalThis.SimpleCalendar?.api?.timestampPlusInterval;
      timeout = scAdd ? scAdd(currentWorldTime(), when)
        : currentWorldTime() + intervalToSeconds(when);
    } else timeout = when;
    if (ElapsedTime.debug) ElapsedTime.log("gsetTimeout", timeout, handler, ...args);
    return ElapsedTime._addEVent(timeout, false, null, handler, ...args);
  }

  static gsetTimeoutAt(when, handler, ...args) {
    const eventTime = (typeof when === "number") ? when : dateToTimestamp(intervalATtoSC(when));
    return ElapsedTime._addEVent(eventTime, false, null, handler, ...args);
  }

  static gsetTimeoutIn(when, handler, ...args) {
    const timeoutSeconds = (typeof when === "number")
      ? when + currentWorldTime()
      //: globalThis.SimpleCalendar?.api?.timestampPlusInterval?.(currentWorldTime(), intervalATtoSC(when));
      : (() => {
      const iv = intervalATtoSC(when);
      const scAdd = globalThis.SimpleCalendar?.api?.timestampPlusInterval;
      return scAdd ? scAdd(currentWorldTime(), iv)
           : currentWorldTime() + intervalToSeconds(iv);
      })();
    return ElapsedTime._addEVent(timeoutSeconds, false, null, handler, ...args);
  }

  static gsetInterval(when, handler, ...args) {
    const futureTime = (typeof when === "number")
      ? currentWorldTime() + when
      //: globalThis.SimpleCalendar?.api?.timestampPlusInterval?.(currentWorldTime(), when);
      : (() => {
      const iv = intervalATtoSC(when);
      const scAdd = globalThis.SimpleCalendar?.api?.timestampPlusInterval;
      return scAdd ? scAdd(currentWorldTime(), iv)
          : currentWorldTime() + intervalToSeconds(iv);
      })();
    //return ElapsedTime._addEVent(futureTime, true, when, handler, ...args);
    // store normalized increment (SC-style) so reschedule is reliable
  const inc = (typeof when === "number") ? { second: when } : intervalATtoSC(when);
  return ElapsedTime._addEVent(futureTime, true, inc, handler, ...args);
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

  static _addEVent(time, recurring, increment = null, handler, ...args) {
    if (typeof time !== "number") time = dateToTimestamp(time);
    if (time < 0) {
      ui.notifications.warn("Cannot set event in the past");
      time = 1;
    }
    let uid = null;
    const entry = new Quentry(time, recurring, increment, handler, uid, game.user.id, ...args);

    if (PseudoClock.isMaster) {
      ElapsedTime._eventQueue.add(entry);
      ElapsedTime._save(true);
      ElapsedTime._increment = increment;
      return entry._uid;
    } else {
      const eventMessage = new PseudoClockMessage({ action: _addEvent, userId: game.user.id, newTime: 0 }, entry.exportToJson());
      PseudoClock._notifyUsers(eventMessage);
    }
  }

  static async pseudoClockUpdate(newTime) {
    if (!PseudoClock.isMaster) return;
    let needSave = false;
    const q = ElapsedTime._eventQueue;

    while (q.peek() && q.peek()._time <= currentWorldTime()) {
      const qe = q.poll();
      try {
        if (typeof qe._handler === "string") {
          const macro = game.macros.get(qe._handler) || game.macros.getName(qe._handler);
          if (macro) macroExecute(macro, ...qe._args);
        } else {
          await qe._handler(...qe._args);
        }
        if (qe._recurring) {
          /*const seconds = globalThis.SimpleCalendar?.api?.timestampPlusInterval?.(qe._time, qe._increment);
          if (seconds > qe._time) {
            qe._time = seconds;*/
        const scAdd = globalThis.SimpleCalendar?.api?.timestampPlusInterval;
        const next = scAdd
          ? scAdd(qe._time, qe._increment)                  // SC path
          : (() => {                                        // fallback seconds math
            if (typeof qe._increment === "number") return qe._time + qe._increment;
            return qe._time + intervalToSeconds(qe._increment);
          })();
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
    if (PseudoClock.isMaster) {
      const newSaveTime = Date.now();
      if ((newSaveTime - ElapsedTime._lastSaveTime > ElapsedTime._saveInterval) || force) {
        game.settings.set(MODULE_ID, "store", {
          _eventQueue: ElapsedTime._eventQueue.exportToJSON(),
        });
        ElapsedTime._lastSaveTime = newSaveTime;
      }
    }
  }

  static init() {
    _userId = game.user.id;
    _isGM = game.user.isGM;
    ElapsedTime._lastSaveTime = Date.now();
    ElapsedTime._fetchParams();
    Hooks.on(`${MODULE_ID}.debug-changed`, () => ElapsedTime._fetchParams());
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
      ElapsedTime.log(
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
      const eventDate = globalThis.SimpleCalendar?.api?.formatDateTime?.(
        globalThis.SimpleCalendar?.api?.timestampToDate?.(ElapsedTime._eventQueue.array[i]._time)
      ) || { date: "", time: `${ElapsedTime._eventQueue.array[i]._time}s` };
      if (showDate) content += eventDate.date + " ";
      content += eventDate.time + " ";
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
    const chatMessage = CONFIG.ChatMessage.documentClass;
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
        for (const id of targets) {
          whisperTargets = whisperTargets.concat(chatMessage.getWhisperRecipients(id));
        }
      } else if (typeof targets === "string") {
        whisperTargets = chatMessage.getWhisperRecipients(targets);
      }
      if (whisperTargets.length > 0) chatData["whisper"] = whisperTargets;
    }
    chatMessage.create(chatData);
  }
}

ElapsedTime.debug = true;
ElapsedTime.log = (...args) => { console.log(`${MODULE_ID} | `, ...args); };
ElapsedTime._saveInterval = 1 * 60 * 1000;

function macroExecute(macro, ...args) {
  if (isNewerVersion(game.version, "11.0")) {
    return macro.execute({ args });
  } else {
    const body = `return (async () => { ${macro.command} })()`;
    const fn = Function("{speaker, actor, token, character, item, args}={}", body);
    return fn.call(this, { speaker: {}, actor: undefined, token: undefined, character: null, args });
  }
}
