// File: modules/about-time-v13/module/ATEventManagerV2.js
// Additive scaffold for an Event Manager built on ApplicationV2 + Handlebars.
// Does not modify toolbars, settings, or the existing DialogV2 EM.

const MODULE_ID = "about-time-v13";

// Convenience: expose the class for macros without import hassles.
globalThis.AboutTimeV13 ??= {};

export class ATEventManagerV2 extends foundry.applications.api.HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "at-event-manager-v2",
    tag: "section",
    classes: ["about-time", "at-emv2"],
    window: {
      title: "About Time — Event Manager (AppV2)", // i18n later
      icon: "fa-solid fa-clock"
    },
    position: {
      width: 760,
      height: "auto"
    },
    // Form semantics let us capture submit, change, etc. without reloading.
    form: {
      handler: (event, form, formData) => {
        // No-op for now; we’ll wire this up when we add inline edits/filters.
      },
      closeOnSubmit: false,
      submitOnChange: false
    }
  };

  /** The main template. Keep all UI in HBS so we can iterate safely. */
  static PARTS = {
    body: {
      template: `modules/${MODULE_ID}/templates/event-manager.hbs`
    }
  };

  /** Data context for the template. Wire real data sources in later steps. */
  async getData() {
    // TODO: Replace with your real event list source.
    // For now we show a placeholder array so you can see row rendering.
    return {
      // Example structure to discuss and then replace:
      events: [
        // { id: "ex1", label: "Placeholder event (10 min)", due: "in 10m", status: "pending" }
      ],
      summary: {
        total: 0,
        pending: 0,
        paused: 0,
        recurring: 0
      }
    };
  }

  /** Minimal listeners for now; we’ll expand as we add features. */
  activateListeners(html) {
    super.activateListeners(html);

    // Add a new event (placeholder action)
    html.on("click", "[data-action='add']", (ev) => {
      ev.preventDefault();
      ui.notifications?.info("AT EM AppV2: Add clicked (wire later).");
    });

    // Pause/resume/delete handlers (placeholders)
    html.on("click", "[data-action='pause']", (ev) => {
      ev.preventDefault();
      const id = ev.currentTarget?.dataset?.id;
      ui.notifications?.info(`AT EM AppV2: Pause ${id} (wire later).`);
    });
    html.on("click", "[data-action='resume']", (ev) => {
      ev.preventDefault();
      const id = ev.currentTarget?.dataset?.id;
      ui.notifications?.info(`AT EM AppV2: Resume ${id} (wire later).`);
    });
    html.on("click", "[data-action='delete']", (ev) => {
      ev.preventDefault();
      const id = ev.currentTarget?.dataset?.id;
      ui.notifications?.warn(`AT EM AppV2: Delete ${id} (wire later).`);
    });

    // Sorting/filtering placeholders
    html.on("change", "[data-filter]", (ev) => {
      ev.preventDefault();
      const f = ev.currentTarget?.value;
      ui.notifications?.info(`AT EM AppV2: Filter ${f} (wire later).`);
    });
    html.on("click", "[data-sort]", (ev) => {
      ev.preventDefault();
      const s = ev.currentTarget?.dataset?.sort;
      ui.notifications?.info(`AT EM AppV2: Sort ${s} (wire later).`);
    });
  }
}

globalThis.AboutTimeV13.ATEventManagerV2 = ATEventManagerV2;
