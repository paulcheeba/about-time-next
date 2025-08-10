import { MODULE_ID } from "../settings.js";

const warn = (...args) => console.warn(`${MODULE_ID} |`, ...args);

export class DTCalc {
  static numLeapYears(year) { console.error(`${MODULE_ID} | numLeapYears not supported.`); return -1; }
  static setFirstDay(day)   { console.error(`${MODULE_ID} | setFirstDay not supported — use your calendar UI.`); }

  static padNumber(n, digits = 2) { return `${n}`.padStart(digits, "0"); }
  static padYear(n, digits = 2) { return `${n}`.padStart(digits, " "); }

  static isLeapYear(year) { console.error(`${MODULE_ID} | isLeapYear not supported.`); return undefined; }
  static daysInYear(year) { warn("daysInYear is deprecated — use calendar API."); return undefined; }

  static get spd() {
    const useSC = game.settings?.get?.(MODULE_ID, "use-simple-calendar") ?? true;
    const sc = game.modules.get("foundryvtt-simple-calendar") ?? game.modules.get("simple-calendar");
    const api = (useSC && sc?.active) ? globalThis.SimpleCalendar?.api : null;
    return api?.timestampPlusInterval?.(0, { day: 1 }) ?? 24 * 60 * 60;
  }

  static timeToSeconds({ days = 0, hours = 0, minutes = 0, seconds = 0 } = {}) {
    console.error(`${MODULE_ID} | timeToSeconds is deprecated.`);
    const useSC = game.settings?.get?.(MODULE_ID, "use-simple-calendar") ?? true;
    const sc = game.modules.get("foundryvtt-simple-calendar") ?? game.modules.get("simple-calendar");
    const api = (useSC && sc?.active) ? globalThis.SimpleCalendar?.api : null;

    if (api) {
      const now = game.time.worldTime;
      const interval = { day: days, hour: hours, minute: minutes, second: seconds };
      const future = api.timestampPlusInterval(now, interval);
      return (future ?? now) - now;
    }
    return days * 86400 + hours * 3600 + minutes * 60 + seconds;
  }
}
DTCalc.sum = (...args) => args.reduce((acc, v) => acc + v, 0);
