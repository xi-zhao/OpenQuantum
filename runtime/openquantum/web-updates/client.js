globalThis.__ModuleLoader__.load({
  id: "@openquantum/harness-web-updates",
  factory: (require) => {
    const React = require("react");
    const h = React.createElement;
    const NS = "settings.openquantumUpdates";
    const css = `
      .oq-updates{max-width:620px;color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.6;overflow-wrap:anywhere}
      .oq-updates h3{font-size:18px;margin:0 0 6px}.oq-updates p{margin:8px 0}.oq-updates small{display:block;color:var(--dsw-alias-label-tertiary)}
      .oq-updates-actions{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.oq-updates button,.oq-updates a,.oq-update-trigger,.oq-update-close{font:inherit;color:inherit;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:9px;padding:7px 12px;cursor:pointer;text-decoration:none}
      .oq-updates button:disabled{opacity:.5;cursor:wait}.oq-updates a[data-primary]{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-1)}
      .oq-updates label{display:flex;gap:10px;align-items:center}.oq-updates input{accent-color:var(--dsw-alias-state-business-primary)}
      .oq-update-trigger{position:relative;padding:8px;line-height:1;flex-shrink:0}.oq-update-trigger[data-available=true]::after{content:"";position:absolute;inset-block-start:3px;inset-inline-end:3px;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-business-primary)}
      .oq-update-notice{position:fixed;inset-inline-end:24px;inset-block-end:24px;width:min(420px,calc(100vw - 32px));box-sizing:border-box;padding:20px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:16px;box-shadow:0 10px 40px #0003;z-index:10000}
      .oq-update-notice .oq-update-close{float:inline-end;padding:2px 8px;margin-inline-start:8px}.oq-updates [role=alert]{color:var(--dsw-alias-state-error-primary)}
      .oq-updates .oq-update-version{direction:ltr;unicode-bidi:isolate;display:inline-block}
      @media(max-width:600px){.oq-update-notice{inset-inline-end:16px;inset-block-end:16px}}
    `;

    function apply(ctx) {
      const t = ctx.locale.bind(NS);
      let state = { snapshot: null, busy: false, error: false, open: false };
      const listeners = new Set();
      let disposed = false;
      let polling = false;
      let desktopCheck;
      const controller = new AbortController();
      const emit = (patch) => { if (!disposed) { state = { ...state, ...patch }; for (const listener of listeners) listener(); } };
      const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
      const accept = (snapshot) => {
        if (state.snapshot?.instanceId !== snapshot.instanceId) desktopCheck = snapshot.desktopCheck;
        if (!state.snapshot || state.snapshot.instanceId !== snapshot.instanceId || snapshot.revision >= state.snapshot.revision) emit({ snapshot });
      };
      async function request(command) {
        const response = await fetch("/openquantum/api/updates", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify(command), signal: controller.signal,
        });
        if (!response.ok) throw new Error("Update request failed");
        const snapshot = await response.json();
        accept(snapshot);
        return snapshot;
      }
      async function action(command, { open = false, close = false } = {}) {
        emit({ busy: true, error: false, ...(open ? { open: true } : {}) });
        try { await request(command); if (close) emit({ open: false }); }
        catch { emit({ error: command.action === "check" ? "failed" : "saveFailed" }); }
        finally { emit({ busy: false }); }
      }
      async function poll() {
        if (polling || disposed || document.hidden) return;
        polling = true;
        try {
          const snapshot = await request({ action: "snapshot" });
          if (desktopCheck !== undefined && snapshot.desktopCheck !== desktopCheck) emit({ open: true, error: false });
          desktopCheck = snapshot.desktopCheck;
          if (snapshot.notify) {
            const result = await request({ action: "claim" });
            if (result.claimed) emit({ open: true });
          }
        } catch { /* Background connection failures must not interrupt work. */ }
        finally { polling = false; }
      }
      function useState() {
        React.useSyncExternalStore(ctx.locale.subscribe.bind(ctx.locale), () => ctx.locale.getSnapshot().active);
        return React.useSyncExternalStore(subscribe, () => state);
      }
      function Details({ compact = false }) {
        const { snapshot, busy, error } = useState();
        const available = snapshot?.release && snapshot.status === "available";
        const message = snapshot?.checking ? "checking" : ({ available: "available", current: "current", unpublished: "unpublished", error: "failed", idle: "idle" }[snapshot?.status] ?? "idle");
        return h("div", { className: "oq-updates" },
          h("h3", null, t("nav")),
          h("small", { className: "oq-update-version" }, snapshot ? `OpenQuantum ${snapshot.currentVersion}` : "OpenQuantum"),
          h("p", { role: "status", "aria-live": "polite" }, t(message, { version: snapshot?.release?.version ?? "" })),
          error ? h("p", { role: "alert" }, t(error)) : null,
          !compact && snapshot?.lastCheckedAt ? h("small", null, t("lastChecked", { time: new Date(snapshot.lastCheckedAt).toLocaleString(ctx.locale.getSnapshot().active) })) : null,
          h("div", { className: "oq-updates-actions" },
            h("button", { type: "button", disabled: busy || snapshot?.checking, onClick: () => action({ action: "check" }) }, t(busy || snapshot?.checking ? "checking" : "check")),
            snapshot?.release ? h("a", { href: snapshot.release.releaseUrl, target: "_blank", rel: "noopener noreferrer", "data-primary": available || undefined }, t("viewRelease")) : null,
            available ? h("a", { href: snapshot.release.upgradeUrl, target: "_blank", rel: "noopener noreferrer" }, t("upgradeGuide")) : null,
          ),
          available ? h("p", null, t("upgradeHint")) : null,
          available && snapshot.skippedVersion === snapshot.release.version ? h("small", null, t("skipped")) : null,
          available ? h("div", { className: "oq-updates-actions" },
            h("button", { type: "button", disabled: busy, onClick: () => action({ action: "later", version: snapshot.release.version }, { close: true }) }, t("later")),
            h("button", { type: "button", disabled: busy, onClick: () => action({ action: "skip", version: snapshot.release.version }, { close: true }) }, t("skip")),
          ) : null,
          !compact && snapshot ? h("label", null,
            h("input", { type: "checkbox", checked: snapshot.automatic, disabled: busy || !snapshot.automaticAllowed, onChange: (event) => action({ action: "automatic", enabled: event.target.checked }) }),
            t("automatic"),
          ) : null,
          !compact && snapshot?.automatic ? h("small", null, t("channel")) : null,
        );
      }
      function Footer() {
        const { snapshot, open } = useState();
        return h(React.Fragment, null,
          h("button", { className: "oq-update-trigger", type: "button", "aria-label": t("nav"), title: t("nav"), "data-available": snapshot?.status === "available", onClick: () => emit({ open: !open }) },
            h("svg", { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, "aria-hidden": true },
              h("path", { d: "M12 16V4m-4 4 4-4 4 4M5 15v5h14v-5" }))),
          open ? h("aside", { className: "oq-update-notice", "aria-label": t("nav") },
            h("button", { type: "button", className: "oq-update-close", "aria-label": t("close"), onClick: () => emit({ open: false }) }, "×"),
            h(Details, { compact: true }),
          ) : null,
        );
      }
      ctx.slots.inject("settings.section", () => ctx.slots.register({ name: "settings.section", id: "openquantum-updates", order: 14, label: () => t("nav"), locale: NS }, Details));
      ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({ name: "sidebar.footer.action", id: "openquantum-updates", order: 20, locale: NS }, Footer));
      ctx.effect(() => {
        const style = document.createElement("style");
        style.dataset.pluginCss = "openquantum-updates";
        style.textContent = css;
        document.head.appendChild(style);
        void poll();
        // Local status only; the Host limits external requests to the daily schedule.
        const timer = setInterval(poll, 5000);
        document.addEventListener("visibilitychange", poll);
        return () => { disposed = true; controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", poll); style.remove(); listeners.clear(); };
      }, "openquantum: update presentation and status subscription");
    }
    return { inject: ["slots", "locale"], apply };
  },
});
