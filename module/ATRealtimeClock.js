// module/ATRealtimeClock.js
// v13.0.6.7 — Real-time worldTime runner (rate/tickHz), GM-only, single-owner via socket hints.

import { MODULE_ID } from "./settings.js";

let _timer = null;
let _ownerId = null;
let _lastReal = 0;
let _accum = 0;
let _rate = 1.0;
let _tickHz = 1;
let _stoppedDueToError = false;

/** Internal: read current world settings. */
function _readConfig() {
  try {
    _rate = Number(game.settings.get(MODULE_ID, "rtRate")) || 1.0;
    _tickHz = Math.max(0.25, Number(game.settings.get(MODULE_ID, "rtTickHz")) || 1);
  } catch {
    _rate = 1.0; _tickHz = 1;
  }
}

/** Whether this client is allowed to drive real-time. */
function _canDrive() {
  return game.user?.isGM === true;
}

/** Stop runner if another GM announced they are starting (best-effort single-owner). */
function _setupSocket() {
  try {
    game.socket?.on(`module.${MODULE_ID}`, (msg) => {
      if (!msg || msg?.t !== "rt") return;
      if (msg?.a === "start" && msg?.owner && msg.owner !== game.user?.id) {
        // Another GM claimed ownership — stop our local runner if we were running.
        if (_timer) stopRealtime();
      }
    });
  } catch (e) {
    console.warn(`[${MODULE_ID}] socket setup failed`, e);
  }
}

/** Start the real-time runner (GM only). */
export function startRealtime() {
  if (!_canDrive()) return false;
  _readConfig();
  if (_timer) return true;

  _stoppedDueToError = false;

  _ownerId = game.user?.id ?? null;
  _lastReal = performance.now();
  _accum = 0;

  const periodMs = Math.max(50, Math.floor(1000 / _tickHz)); // clamp to avoid crazy spam
  _timer = window.setInterval(async () => {
    try {
      const now = performance.now();
      const dtReal = Math.max(0, (now - _lastReal) / 1000); // seconds
      _lastReal = now;

      // Accumulate game seconds
      _accum += dtReal * _rate;

      // Only advance in full seconds to keep updateWorldTime volume reasonable
      const whole = Math.floor(_accum);
      if (whole !== 0) {
        _accum -= whole;
        await game.time.advance(whole);
      }
    } catch (e) {
      console.warn(`[${MODULE_ID}] realtime tick failed; stopping realtime`, e);
      try { stopRealtime(); } catch {}
      if (!_stoppedDueToError) {
        _stoppedDueToError = true;
        try {
          ui?.notifications?.warn?.(`[${MODULE_ID}] Realtime clock stopped due to an error while advancing world time. Check other calendar modules / console logs.`);
        } catch {
          // ignore
        }
      }
    }
  }, periodMs);

  // Best-effort ownership announce (advisory)
  try { game.socket?.emit(`module.${MODULE_ID}`, { t: "rt", a: "start", owner: _ownerId }); } catch {}

  return true;
}

/** Stop the real-time runner. */
export function stopRealtime() {
  if (_timer) {
    try { clearInterval(_timer); } catch {}
    _timer = null;
  }
  _ownerId = null;
  return true;
}

export function isRealtimeRunning() { return !!_timer; }

export function setRealtimeRate(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return false;
  _rate = n;
  return true;
}

export function getRealtimeOwner() { return _ownerId; }

// Initialize socket listener once
_setupSocket();
