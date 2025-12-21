// module/ATChat.js
// v13.0.7.6 — /at chat command (GM-only output) - (v11-)CHAT_MESSAGE_TYPES.OTHER changed to CHAT_MESSAGE_STYLES.OTHER (v12+)

import { isTimekeeper } from "./permissions.js";

const MODULE_ID = "about-time-next";
const AT = () => (game.abouttime ?? game.Gametime);

function gmWhisper(html) {
  const gm = ChatMessage.getWhisperRecipients("GM").filter(u => u.active).map(u => u.id);
  return ChatMessage.create({ content: html, whisper: gm, type: CONST.CHAT_MESSAGE_STYLES.OTHER });
}

function getGMWhisperRecipients() {
  return ChatMessage.getWhisperRecipients("GM").filter(u => u.active).map(u => u.id);
}

function getQueueAdminWhisperRecipients() {
  const ids = new Set(getGMWhisperRecipients());
  try {
    const me = game.user;
    if (me?.active && me?.id) ids.add(me.id);
  } catch {
    // ignore
  }
  return [...ids];
}

function confirmCard({ title, lines = [], confirmLabel = "Confirm", cancelLabel = "Cancel" }) {
  const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
  const body = lines.length
    ? `<div style="margin: 4px 0 6px;">${lines.map(l => `<div style=\"margin:2px 0;\">${esc(l)}</div>`).join("")}</div>`
    : "";
  return `
    <div class="atn-at-confirm" style="border-left: 3px solid #ffb86c; padding-left: 8px; font-family: monospace;">
      <p style="margin: 4px 0;"><strong>[${MODULE_ID}]</strong> ${esc(title)}</p>
      ${body}
      <div style="display:flex; gap:6px; align-items:center; margin: 6px 0 2px;">
        <button type="button" data-atn-confirm="1">${esc(confirmLabel)}</button>
        <button type="button" data-atn-cancel="1">${esc(cancelLabel)}</button>
      </div>
    </div>
  `;
}

function statusCard({ title, lines = [] }) {
  const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
  const body = lines.length
    ? `<div style="margin: 4px 0 2px;">${lines.map(l => `<div style=\"margin:2px 0;\">${esc(l)}</div>`).join("")}</div>`
    : "";
  return `
    <div style="border-left: 3px solid #50fa7b; padding-left: 8px; font-family: monospace;">
      <p style="margin: 4px 0;"><strong>[${MODULE_ID}]</strong> ${esc(title)}</p>
      ${body}
    </div>
  `;
}

async function postConfirmMessage(confirmData, html) {
  return ChatMessage.create({
    content: html,
    whisper: getQueueAdminWhisperRecipients(),
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
    flags: { [MODULE_ID]: { confirm: confirmData } }
  });
}

Hooks.on("renderChatMessageHTML", (message, html /*, data */) => {
  try {
    const confirm = message?.getFlag?.(MODULE_ID, "confirm");
    if (!confirm || confirm.status !== "pending") return;
    if (!isTimekeeper(game.user)) return;

    const root = html?.querySelector ? html : (html?.[0] ?? html);
    if (!root?.querySelector) return;
    if (root.dataset?.atnConfirmBound === "1") return;
    root.dataset.atnConfirmBound = "1";

    const btnConfirm = root.querySelector("button[data-atn-confirm]");
    const btnCancel = root.querySelector("button[data-atn-cancel]");
    if (!btnConfirm || !btnCancel) return;

    const disableBtns = () => {
      try { btnConfirm.disabled = true; btnCancel.disabled = true; } catch { /* ignore */ }
    };

    btnCancel.addEventListener("click", async () => {
      disableBtns();
      try {
        await message.update({
          content: statusCard({ title: "Cancelled.", lines: [] }),
          flags: { [MODULE_ID]: { confirm: { ...confirm, status: "cancelled" } } }
        });
      } catch (err) {
        console.error(`${MODULE_ID} | cancel confirm failed`, err);
      }
    }, { passive: true });

    btnConfirm.addEventListener("click", async () => {
      disableBtns();
      const api = AT();
      try {
        if (!api) {
          await message.update({
            content: statusCard({ title: "Failed.", lines: ["About Time API not found."] }),
            flags: { [MODULE_ID]: { confirm: { ...confirm, status: "failed" } } }
          });
          return;
        }

        if (confirm.type === "clear") {
          const before = api.ElapsedTime?._eventQueue?.size ?? 0;
          api.flushQueue?.();
          const after = api.ElapsedTime?._eventQueue?.size ?? 0;
          const ok = after === 0;
          await message.update({
            content: statusCard({
              title: ok ? "Queue cleared." : "Clear failed.",
              lines: [ok ? `Cleared ${before} event(s).` : "You may not be the master timekeeper."]
            }),
            flags: { [MODULE_ID]: { confirm: { ...confirm, status: ok ? "done" : "failed" } } }
          });
          return;
        }

        if (confirm.type === "stop") {
          const uid = String(confirm.uid || "");
          const fn = api.gclearTimeout?.bind(api) ?? api.clearTimeout?.bind(api);
          const removed = (typeof fn === "function") ? fn(uid) : null;
          const ok = !!removed;
          await message.update({
            content: statusCard({
              title: ok ? "Event stopped." : "Stop failed.",
              lines: [uid ? `UID: ${uid}` : "", ok ? "" : "Event not found, or you may not be the master timekeeper."]
                .filter(Boolean)
            }),
            flags: { [MODULE_ID]: { confirm: { ...confirm, status: ok ? "done" : "failed" } } }
          });
          return;
        }

        await message.update({
          content: statusCard({ title: "Failed.", lines: ["Unknown action."] }),
          flags: { [MODULE_ID]: { confirm: { ...confirm, status: "failed" } } }
        });
      } catch (err) {
        console.error(`${MODULE_ID} | confirm action failed`, err);
        try {
          await message.update({
            content: statusCard({ title: "Failed.", lines: [String(err?.message || err)] }),
            flags: { [MODULE_ID]: { confirm: { ...confirm, status: "failed" } } }
          });
        } catch {
          // ignore
        }
      }
    }, { passive: true });
  } catch (err) {
    console.error(`${MODULE_ID} | renderChatMessageHTML handler failed`, err);
  }
});

function parseDuration(input) {
  if (!input) return 0;
  const s = String(input).trim();
  if (/^\d+$/.test(s)) return Number(s);
  const re = /(\d+)\s*(d|day|days|h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|second|seconds)/gi;
  let total = 0, m;
  while ((m = re.exec(s))) {
    const val = Number(m[1]); const unit = m[2].toLowerCase();
    if (["d","day","days"].includes(unit)) total += val * 86400;
    else if (["h","hr","hrs","hour","hours"].includes(unit)) total += val * 3600;
    else if (["m","min","mins","minute","minutes"].includes(unit)) total += val * 60;
    else total += val;
  }
  return total;
}

function formatDHMS(total) {
  total = Math.max(0, Math.floor(Number(total) || 0));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${String(d).padStart(2, "0")}:${pad(h)}:${pad(m)}:${pad(s)}`;
}

function usage() {
  return gmWhisper(`
    <div style="border-left: 3px solid #8be9fd; padding-left: 8px; font-family: monospace;">
      <p style="margin: 4px 0;"><strong>/at</strong> commands</p>
      <p style="margin: 2px 0;"><em>Note:</em> Queue control commands are GM-only.</p>
      <p style="margin: 2px 0;"><code>/at queue</code> | <code>/at list</code> — show the queue</p>
      <p style="margin: 2px 0;"><code>/at clear</code> — clear the queue</p>
      <p style="margin: 2px 0;"><code>/at stop &lt;uid&gt;</code> — stop a specific event by UID</p>
      <p style="margin: 2px 0;"><code>/at pause &lt;uid&gt;</code> — pause an event by UID</p>
      <p style="margin: 2px 0;"><code>/at resume &lt;uid&gt;</code> — resume a paused event by UID</p>
      <p style="margin: 2px 0;"><code>/at in &lt;duration&gt; &lt;message&gt;</code> — schedule one-time reminder</p>
      <p style="margin: 2px 0;"><code>/at every &lt;duration&gt; &lt;message&gt;</code> — schedule repeating reminder</p>
      <p style="margin: 6px 0 2px;"><em>Duration examples:</em> <code>1h30m</code>, <code>2d 4h</code>, <code>45m10s</code>, or seconds</p>
    </div>
  `);
}

Hooks.on("chatMessage", (chatLog, message) => {
  const raw = (message ?? "").trim();
  if (!raw.startsWith("/at")) return;

  const api = AT();
  if (!api) {
    ui.notifications?.warn?.("About Time API not found.");
    return false;
  }

  const parts = raw.split(/\s+/);
  const sub = (parts[1] ?? "").toLowerCase();
  if (!sub) { usage(); return false; }

  const reply = (html) => gmWhisper(`<p>[${MODULE_ID}] ${html}</p>`);

  try {
    switch (sub) {
      case "queue":
      case "list": {
        api.chatQueue?.({ showArgs: true, showUid: true, showDate: true, gmOnly: true });
        break;
      }
      case "clear": {
        if (!isTimekeeper(game.user)) { reply("Timekeeper only."); break; }

        const q = api.ElapsedTime?._eventQueue;
        const count = q?.size ?? 0;
        const reqId = foundry.utils.randomID?.() ?? `${Date.now()}`;
        postConfirmMessage(
          { type: "clear", status: "pending", requestId: reqId, by: game.user.id },
          confirmCard({
            title: "Clear the queue?",
            lines: [`This will stop ${count} event(s).`],
            confirmLabel: "Clear",
            cancelLabel: "Cancel"
          })
        );
        break;
      }
      case "stop": {
        const uid = parts[2];
        if (!uid) { reply("Usage: <code>/at stop &lt;uid&gt;</code>"); break; }
        if (!isTimekeeper(game.user)) { reply("Timekeeper only."); break; }

        const reqId = foundry.utils.randomID?.() ?? `${Date.now()}`;
        postConfirmMessage(
          { type: "stop", uid, status: "pending", requestId: reqId, by: game.user.id },
          confirmCard({
            title: "Stop this event?",
            lines: [`UID: ${uid}`],
            confirmLabel: "Stop",
            cancelLabel: "Cancel"
          })
        );
        break;
      }
      case "pause":
      case "resume": {
        const uid = parts[2];
        if (!uid) { reply(`Usage: <code>/at ${sub} &lt;uid&gt;</code>`); break; }
        if (!isTimekeeper(game.user)) { reply("Timekeeper only."); break; }
        const fn = (sub === "pause") ? api.pauseEvent : api.resumeEvent;
        const res = (typeof fn === "function") ? fn(uid) : null;
        const ok = !!(res && res.ok);
        reply(`${sub === "pause" ? "Pause" : "Resume"} <code>${foundry.utils.escapeHTML(uid)}</code> ${ok ? "succeeded" : "failed"}.`);
        break;
      }
      case "in":
      case "every": {
        const durStr = parts[2];
        if (!durStr) { reply(`Usage: <code>/at ${sub} &lt;duration&gt; &lt;message&gt;</code>`); break; }
        const seconds = parseDuration(durStr);
        if (!seconds || seconds <= 0) { reply("Invalid duration."); break; }
        const msg = parts.slice(3).join(" ").trim() || "(no message)";
        let uid;
        if (sub === "every") {
          uid = api.reminderEvery?.({ seconds }, msg);
          reply(`Repeating every ${formatDHMS(seconds)}: ${foundry.utils.escapeHTML(msg)}`);
        } else {
          uid = api.reminderIn?.({ seconds }, msg);
          reply(`In ${formatDHMS(seconds)}: ${foundry.utils.escapeHTML(msg)}`);
        }
        if (uid) reply(`Event UID: <code>${uid}</code>`);
        break;
      }
      default: usage();
    }
  } catch (err) {
    console.error(`${MODULE_ID} | /at command failed`, err);
    reply("Command failed. See console for details.");
  }
  return false;
});
