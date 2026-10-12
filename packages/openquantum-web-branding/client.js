globalThis.__ModuleLoader__.load({
  id: "@openquantum/harness-web-branding",
  factory: (require) => {
    const pluginModule = { exports: {} };
    const React = require("react");
    const h = React.createElement;

    function OpenQuantumBrandMark({ size, className }) {
      return h("img", {
        className: ["oq-brand-mark", className].filter(Boolean).join(" "),
        src: "/openquantum/mark.svg",
        alt: "",
        width: size,
        height: size,
      });
    }

    function OpenQuantumBrandName() {
      return h("span", { className: "oq-brand-name" }, "OpenQuantum");
    }

    function SuppressUpstreamDeveloperNotice() {
      return null;
    }

    function showModelSetupHint(ctx) {
      ctx.slots.inject("conversation.input.model", () =>
        ctx.inject(["remote", "remote.session", "locale", "modelDirectories", "sessions"], (scope) => {
          function ModelSetupHint({ available }) {
            const locale = React.useSyncExternalStore(
              (notify) => scope.locale.subscribe(notify),
              () => scope.locale.getSnapshot(),
            );
            return available ? h("span", { style: { fontSize: 13, opacity: 0.65 } },
              locale.active.startsWith("zh")
                ? "请在设置 → 模型中添加模型"
                : "Add a model in Settings → Models",
            ) : null;
          }
          scope.effect(() => {
            let generation = 0;
            let disposed = false;
            let removeHint;
            const hide = () => {
              removeHint?.();
              removeHint = undefined;
            };
            const refresh = async () => {
              const request = ++generation;
              try {
                const response = await scope.remote.session.modelCatalog();
                if (disposed || request !== generation) return;
                const catalog = response.ok ? response.value : null;
                // A failed catalog or an existing provider retains the native
                // selector and its diagnostics. Never rewrite Session history.
                const empty = catalog?.groups.length === 0 &&
                  catalog.routableProviders.length === 0 && catalog.failures.length === 0;
                if (empty) {
                  removeHint ??= scope.slots.register(
                    {
                      name: "conversation.input.model", priority: -1000,
                      inject: (sessionId) => {
                        const available = scope.sessions.subagentAddress(sessionId) === undefined;
                        // Retain the native per-session composer block even when
                        // this hint is mounted before the original selector.
                        if (available) scope.modelDirectories.directoryFor(sessionId);
                        return { available };
                      },
                    }, ModelSetupHint,
                  );
                } else hide();
              } catch {
                if (!disposed && request === generation) hide();
              }
            };
            const stop = [
              scope.remote.$on("llm/adapters-updated", refresh),
              scope.remote.$on("settings/document-updated", refresh),
              scope.remote.$on("credentials/reference-updated", refresh),
              scope.on("connection/reset", () => { hide(); void refresh(); }),
            ];
            void refresh();
            return () => {
              disposed = true;
              stop.forEach((dispose) => dispose());
              hide();
            };
          }, "openquantum: empty model catalog hint");
        }),
      );
    }

    const inject = ["slots"];

    function apply(ctx) {
      if (globalThis.document?.querySelector('meta[name="openquantum-minimal-ui"][content="true"]')) {
        showModelSetupHint(ctx);
      }
      ctx.slots.inject("sidebar.brand.mark", () =>
        ctx.slots.inject("sidebar.brand.name", function* () {
          yield ctx.slots.register(
            { name: "sidebar.brand.mark", priority: -1000 },
            OpenQuantumBrandMark,
          );
          yield ctx.slots.register(
            { name: "sidebar.brand.name", priority: -1000 },
            OpenQuantumBrandName,
          );
        }),
      );
      ctx.slots.inject("conversation.hero.brand.mark", () =>
        ctx.slots.register(
          { name: "conversation.hero.brand.mark", priority: -1000 },
          OpenQuantumBrandMark,
        ),
      );
      ctx.slots.inject("settings.onboarding", () =>
        ctx.slots.register(
          {
            name: "settings.onboarding",
            id: "welcome-notice",
            order: -1000,
            priority: -1000,
          },
          SuppressUpstreamDeveloperNotice,
        ),
      );
    }

    pluginModule.exports.apply = apply;
    pluginModule.exports.inject = inject;
    return pluginModule.exports;
  },
});
