import { ElapsedTime } from "./ElapsedTime.js";
import { Quentry } from "./FastPirorityQueue.js";
const _moduleSocket = "module.about-time";
const _eventTrigger = "about-time.eventTrigger";
const _queryMaster = "about-time.queryMaster";
const _masterResponse = "about-time.masterResponse";
const _masterMutiny = "about-time.Arrrgh...Matey";
const _runningClock = "about-time.clockRunningStatus";
const _acquiredMaster = "about-time.pseudoclockMaster";
export const _addEvent = "about-time.addEvent";
let _userId = "";
let log = (...args) => {
    console.log("about-time | ", ...args);
};
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
    static _initialize(currentTime = 0, realTimeMult = 0, realTimeInterval, running = false) {
    }
    static get isMaster() {
        return PseudoClock._isMaster;
    }
    static warnNotMaster(operation) {
        ui.notifications.error(`${game.user.name} ${operation} - ${game.i18n.localize("about-time.notMaster")}`);
        console.warn(`about-time | Non master timekeeper attempting to ${operation}`);
    }
    static warnNotGM(operation) {
        ui.notifications.error(`${game.user.name} ${operation} - ${game.i18n.localize("about-time.notMaster")}`);
        console.warn(`about-time | Non GM attempting to ${operation}`);
    }
    static _displayCurrentTime() {
        //@ts-ignore .time
        console.log(`Elapsed time ${game.time.worldTime}`);
    }
    static advanceClock(timeIncrement) {
        console.error("about-time | advance clock Not supported");
    }
    static setClock(newTime) {
        console.error("about-time | set clock Not supported");
    }
    static demote() {
        PseudoClock._isMaster = false;
        Hooks.callAll(_acquiredMaster, false);
    }
    static notifyMutiny() {
        let message = new PseudoClockMessage({ action: _masterMutiny, userId: _userId });
        PseudoClock._notifyUsers(message);
    }
    static mutiny() {
        PseudoClock.notifyMutiny();
        let timeout = 10;
        // 2 set a timeout, if it expires assume master timekeeper role.
        PseudoClock._queryTimeoutId = setTimeout(() => {
            log("Mutineer assuming master timekeeper role ", 5);
            PseudoClock._isMaster = true;
            ElapsedTime._load();
            Hooks.callAll(_acquiredMaster, true);
            let message = new PseudoClockMessage({ action: _masterResponse, userId: _userId });
            PseudoClock._notifyUsers(message);
        }, timeout * 1000);
    }
    static notifyRunning(status) {
        console.error("about-time | notify running not supported");
    }
    static isRunning() {
        //@ts-ignore
        const clockStatus = window.SimpleCalendar.api.clockStatus();
        return clockStatus.started && !clockStatus.paused;
    }
    static _processAction(message) {
        if (message._userId === _userId)
            return;
        switch (message._action) {
            case _eventTrigger:
                Hooks.callAll(_eventTrigger, ...message._args);
                break;
            case _queryMaster:
                if (PseudoClock._isMaster) {
                    log(game.user.name, "responding as master time keeper");
                    //@ts-ignore
                    let message = new PseudoClockMessage({ action: _masterResponse, userId: _userId, newTime: game.time.worldTime });
                    PseudoClock._notifyUsers(message);
                }
                break;
            case _masterResponse:
                if (message._userId !== _userId) {
                    // cancel timeout
                    clearTimeout(PseudoClock._queryTimeoutId);
                    console.log("Master response message ", message);
                    //@ts-ignore
                    let userName = game.users.entities.find(u => u._id === message._userId).name;
                    log(userName, " as master timekeeper responded cancelling timeout");
                }
                break;
            case _masterMutiny:
                if (message._userId !== _userId && PseudoClock._isMaster) {
                    PseudoClock.demote();
                    //@ts-ignore
                    let userName = game.users.entities.find(u => u._id === message._userId).name;
                    log(userName, " took control as master timekeeper. Aaaahhhrrr");
                }
                break;
            case _addEvent:
                if (!PseudoClock.isMaster)
                    return;
                ElapsedTime._eventQueue.add(Quentry.createFromJSON(message._args[0]));
                ElapsedTime._save(true);
                break;
        }
    }
    ;
    static async notifyEvent(eventName, ...args) {
        let message = new PseudoClockMessage({ action: _eventTrigger, userId: _userId, newTime: 0 }, eventName, ...args);
        Hooks.callAll(_eventTrigger, ...message._args);
        return PseudoClock._notifyUsers(message);
    }
    static async _notifyUsers(message) {
        //@ts-ignore
        await game.socket.emit(_moduleSocket, message, resp => {
        });
    }
    static _setupSocket() {
        //@ts-ignore
        game.socket.on(_moduleSocket, (data) => {
            PseudoClock._processAction(data);
        });
    }
    ;
    static _load() {
        PseudoClock._fetchParams();
    }
    ;
    static init() {
		_userId = game.user.id;
        Hooks.on("updateWorldTime", (newTime, dt) => {
            Hooks.callAll("pseudoclockSet", newTime);
        });
        //@ts-ignore
        // find a better way to do this.
        PseudoClock._isMaster = false;
        PseudoClock._setupSocket();
        // 1 send a message to see if there is another master clock already out there
        if (ElapsedTime.debug)
            log("pseudoclock sending query master message");
        let message = new PseudoClockMessage({ action: _queryMaster, userId: _userId });
        PseudoClock._notifyUsers(message);
        if (game.user.isGM) {
            let timeout = 5;
            // 2 set a timeout, if it expires assume master timekeeper role.
            PseudoClock._queryTimeoutId = setTimeout(() => {
                PseudoClock.notifyMutiny();
                PseudoClock._isMaster = true;
                Hooks.callAll(_acquiredMaster, true);
            }, timeout * 1000);
        }
        if (ElapsedTime.debug)
            log("election-timeout: timeout set id is ", PseudoClock._queryTimeoutId);
    }
    static _fetchParams() {
    }
}
function warn(arg0, _queryTimeoutId) {
    throw new Error("Function not implemented.");
}
