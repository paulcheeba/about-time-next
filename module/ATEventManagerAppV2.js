// File: modules/about-time-v13/module/ATEventManagerAppV2.js
// v13.0.9.0.1 — Remove private #gmWhisper from persisted handlers; register handler for safe restore; minor GM whisper helper.
// NOTE: Copy UID action remains defined (harmless), but the button was removed from the template.

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api; // v12+
import { ElapsedTime } from "./ElapsedTime.js";
import { Quentry } from "./FastPirorityQueue.js";
import { MODULE_ID } from "./settings.js";

// Helper: GM whisper without relying on private fields (safe for persistence)
const gmWhisper = (html) => {
  try {
    const ids = ChatMessage.getWhisperRecipients("GM").filter((u) => u.active).map((u) => u.id);
    return ChatMessage.create({ content: html, whisper: ids });
  } catch (e) {
    console.warn("[about-time] gmWhisper failed", e);
    return ChatMessage.create({ content: html });
  }
};

export class ATEventManagerAppV2 extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: "about-time-event-manager",
    classes: ["about-time", "at-event-manager"],
    window: { title: "About Time — Event Manager" },
    form: { handler: ATEventManagerAppV2, closeOnSubmit: false },
    position: { width: 920, height: "auto" },
    tag: "form",
    actions: {
      add: ATEventManagerAppV2.#onAdd,
      stop: ATEventManagerAppV2.#onStop,
      clear: ATEventManagerAppV2.#onClear,
      refresh: ATEventManagerAppV2.#onRefresh
    }
  });

  static PARTS = {
    form: {
      template: "modules/about-time-v13/templates/event-manager-app-v2.hbs",
      scrollable: [".events"]
    }
  };

  // Private helpers (retained)
  #gmWhisper(html) {
    const ids = ChatMessage.getWhisperRecipients("GM").filter((u) => u.active).map((u) => u.id);
    return ChatMessage.create({ content: html, whisper: ids });
  }
  #parseMixedDuration(input) {
    if (!input || typeof input !== "string") return 0;
    let total = 0; const re = /(\d+)\s*(d|day|days|h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|second|seconds)?/gi;
    let m; while ((m = re.exec(input))) {
      const v = Number(m[1]); const u = (m[2] || "s").toLowerCase();
      total += [
        u.startsWith("d") ? v * 86400 :
        u.startsWith("h") ? v * 3600 :
        u.startsWith("m") ? v * 60 :
        v
      ];
    }
    return total;
  }

  /*** ... (everything above/below unchanged except where noted) ***/

  static {
    // any static init if needed
  }

  /** Application lifecycle omitted for brevity (unchanged) **/

  static async #onAdd(event, form, formData) {
    event.preventDefault();

    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    const message = String(fd.get("message") || "").trim();
    const durStr = String(fd.get("duration") || "").trim();
    const repeat = !!fd.get("repeat");
    const runMacro = !!fd.get("runMacro");
    const macroName = String(fd.get("macroName") || "").trim();

    const seconds = this.#parseMixedDuration(durStr);
    if (!seconds || seconds <= 0) return gmWhisper(`<p>[${MODULE_ID}] Enter a valid duration.</p>`);

    const meta = { __atName: name || (runMacro ? macroName : "(unnamed)"), __atMsg: message };

    const handler = async (metaArg) => {
      try {
        if (runMacro && macroName) {
          const macro = game.macros.getName?.(macroName) ?? game.macros.find?.(m => m.name === macroName);
          if (macro) {
            if (isNewerVersion(game.version, "11.0")) await macro.execute({ args: [metaArg] });
            else {
              const body = `return (async () => { ${macro.command} })()`;
              const fn = Function("{speaker, actor, token, character, item, args}={}", body);
              await fn.call(this, { speaker: {}, args: [metaArg] });
            }
          } else ui.notifications?.warn?.(`[${MODULE_ID}] Macro not found: ${macroName}`);
        } else {
          await gmWhisper(`<p>[${MODULE_ID}] ${foundry.utils.escapeHTML(metaArg.__atMsg || metaArg.__atName || "(event)")}</p>`);
        }
      } catch (err) {
        console.error(`${MODULE_ID} | handler failed`, err);
        await gmWhisper(`<p>[${MODULE_ID}] Handler error: ${foundry.utils.escapeHTML(err?.message || err)}</p>`);
      }
    };
    // Tag and register this handler so it survives reload via the registry
    handler._atHandlerId = 'ATV2.basicGMNotify';
    Quentry.registerHandler('ATV2.basicGMNotify', handler);

    const AT = game.abouttime ?? game.Gametime;
    const uid = repeat ? AT.doEvery({ seconds }, handler, meta) : AT.doIn({ seconds }, handler, meta);
    if (uid) ui.notifications?.info?.(`[${MODULE_ID}] Scheduled "${meta.__atName}" in ${seconds}s.`);
    form.reset();
  }

  /** #onStop, #onClear, #onRefresh, render parts, etc. remain unchanged (they can still use this.#gmWhisper elsewhere) **/
}
