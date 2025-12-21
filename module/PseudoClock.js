// module/PseudoClock.js
// PseudoClock (v13.0.9.0.4) — v13-safe sockets/users

import { ElapsedTime } from "./ElapsedTime.js";
import { Quentry } from "./FastPriorityQueue.js";
import { MODULE_ID } from "./settings.js";

const _moduleSocket   = `module.${MODULE_ID}`;
const _eventTrigger   = "about-time.eventTrigger";
const _queryMaster    = "about-time.queryMaster";
const _masterResponse = "about-time.masterResponse";
const _masterMutiny   = "about-time.Arrrgh...Matey";
const _runningClock   = "about-time.clockRunningStatus";
const _acquiredMaster = "about-time.pseudoclockMaster";
export const _addEvent = "about-time.addEvent";

let _userId = "";

const log = (...args) => ElapsedTime?.debug && console.log(`${MODULE_ID} |`, ...args);

export class PseudoClockMessage {
  constructor({ action, userId, newTime = 0 }, ...args) {
    this._action = action;
    this._userId = userId;
    this._newTime = newTime;
    this._args = args;
    this._originator = game.user.id;
    return this;
  }
}

export class PseudoClock {
  static _pendingAddEvents = new Map(); // uid -> exported event JSON

  static _initialize() {}
  static get isMaster() { return PseudoClock._isMaster; }

  static _drainPendingAddEvents() {
    if (!PseudoClock.isMaster) return;
    if (!PseudoClock._pendingAddEvents || PseudoClock._pendingAddEvents.size === 0) return;

    let added = 0;
    for (const [uid, data] of PseudoClock._pendingAddEvents.entries()) {
      try {
        if (!data) continue;
        ElapsedTime._eventQueue.add(Quentry.createFromJSON(data));
        added++;
      } catch (e) {
        console.warn(`${MODULE_ID} | [PseudoClock] failed to drain pending addEvent`, uid, e);
      }
    }
    PseudoClock._pendingAddEvents.clear();
    if (added > 0) {
      log(`[PseudoClock] drained pending addEvent`, { added });
      ElapsedTime._save(true);
    }
  }

  static warnNotMaster(operation) {
    ui.notifications.error(`${game.user.name} ${operation} - ${game.i18n.localize("about-time.notMaster")}`);
    console.warn(`${MODULE_ID} | Non master timekeeper attempting to ${operation}`);
  }
  static warnNotGM(operation) {
    ui.notifications.error(`${game.user.name} ${operation} - ${game.i18n.localize("about-time.notMaster")}`);
    console.warn(`${MODULE_ID} | Non GM attempting to ${operation}`);
  }

  static _displayCurrentTime() {
    if (!ElapsedTime?.debug) return;
    console.log(`Elapsed time ${game.time.worldTime}`);
  }
  static advanceClock() { console.error(`${MODULE_ID} | advance clock Not supported`); }
  static setClock()     { console.error(`${MODULE_ID} | set clock Not supported`); }

  static demote() {
    PseudoClock._isMaster = false;
    log(`[PseudoClock] master demoted`, { userId: game.user?.id });
    Hooks.callAll(_acquiredMaster, false);
  }

  static notifyMutiny() {
    const message = new PseudoClockMessage({ action: _masterMutiny, userId: _userId });
    PseudoClock._notifyUsers(message);
  }

  static mutiny() {
    PseudoClock.notifyMutiny();
    const timeout = 10;
    PseudoClock._queryTimeoutId = setTimeout(() => {
      log("Mutineer assuming master timekeeper role");
      PseudoClock._isMaster = true;
      log(`[PseudoClock] master acquired (mutiny)`, { userId: game.user?.id });
      ElapsedTime._load();
      Hooks.callAll(_acquiredMaster, true);
      PseudoClock._drainPendingAddEvents();
      const message = new PseudoClockMessage({ action: _masterResponse, userId: _userId });
      PseudoClock._notifyUsers(message);
    }, timeout * 1000);
  }

  static notifyRunning(_status) {
    console.error(`${MODULE_ID} | notify running not supported`);
  }

  static isRunning() {
    const status = globalThis.SimpleCalendar?.api?.clockStatus?.();
    return !!(status && status.started && !status.paused);
  }

  static _processAction(message) {
    // Don't double-handle our own broadcasts, except for addEvent.
    // addEvent can be emitted before a master is elected; if we later become master,
    // we need a local copy queued so it can be applied.
    if (message._userId === _userId && message._action !== _addEvent) return;
    switch (message._action) {
      case _eventTrigger:
        Hooks.callAll(_eventTrigger, ...message._args);
        break;

      case _queryMaster:
        if (PseudoClock._isMaster) {
          log(game.user.name, "responding as master time keeper");
          const msg = new PseudoClockMessage({ action: _masterResponse, userId: _userId, newTime: game.time.worldTime });
          PseudoClock._notifyUsers(msg);
        }
        break;

      case _masterResponse:
        if (message._userId !== _userId) {
          clearTimeout(PseudoClock._queryTimeoutId);
          const userName = game.users.get(message._userId)?.name ?? message._userId;
          log(userName, "as master timekeeper responded cancelling timeout");
        }
        break;

        case _masterMutiny:
        if (message._userId !== _userId && PseudoClock._isMaster) {
          PseudoClock.demote();
          const userName = game.users.get(message._userId)?.name ?? message._userId;
          log(userName, "took control as master timekeeper. Aaaahhhrrr");
        }
        break;

      case _addEvent:
        // If a master exists, apply immediately. Otherwise, queue it for later.
        {
          const data = message?._args?.[0];
          const uid = data?.uid;

          if (!PseudoClock.isMaster) {
            if (uid) PseudoClock._pendingAddEvents.set(uid, data);
            log(`[PseudoClock] queued addEvent (no master yet)`, { from: message?._originator, uid });
            return;
          }

          log(`[PseudoClock] received addEvent`, { from: message?._originator, uid });
          ElapsedTime._eventQueue.add(Quentry.createFromJSON(data));
          ElapsedTime._save(true);
        }
        break;
    }
  }

  static async notifyEvent(eventName, ...args) {
    const message = new PseudoClockMessage({ action: _eventTrigger, userId: _userId, newTime: 0 }, eventName, ...args);
    Hooks.callAll(_eventTrigger, ...message._args);
    return PseudoClock._notifyUsers(message);
  }

  static async _notifyUsers(message) {
    await game.socket.emit(_moduleSocket, message, () => {});
  }

  static _setupSocket() {
    game.socket.on(_moduleSocket, (data) => PseudoClock._processAction(data));
  }

  static _load() { PseudoClock._fetchParams(); }

  static init() {
    _userId = game.user.id;

    Hooks.on("updateWorldTime", (newTime /*, options, userId */) => {
      Hooks.callAll("pseudoclockSet", newTime);
    });

    PseudoClock._isMaster = false;
    PseudoClock._setupSocket();

    log(`[PseudoClock] init`, { userId: _userId, isGM: !!game.user?.isGM });

    const message = new PseudoClockMessage({ action: _queryMaster, userId: _userId });
    PseudoClock._notifyUsers(message);

    if (game.user.isGM) {
      const timeout = 5;
      PseudoClock._queryTimeoutId = setTimeout(() => {
        PseudoClock.notifyMutiny();
        PseudoClock._isMaster = true;
        log(`[PseudoClock] master acquired (GM timeout)`, { userId: _userId });
        Hooks.callAll(_acquiredMaster, true);
        PseudoClock._drainPendingAddEvents();
      }, timeout * 1000);
    }
  }

  static _fetchParams() {}
}
