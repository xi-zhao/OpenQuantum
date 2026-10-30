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
      ctx.slots.inject("conversation.input.model", () => {
        const fiber = ctx.inject(["connection", "remote", "locale", "modelDirectories", "sessions"], (scope) => {
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
                const [response, providers] = await Promise.all([
                  scope.connection.api.llm.models({}), scope.connection.api.llm.providers({}),
                ]);
                if (disposed || request !== generation) return;
                const catalog = response.ok && providers.ok ? response.value : null;
                // A failed catalog or an existing provider retains the native
                // selector and its diagnostics. Never rewrite Session history.
                const empty = catalog?.groups.length === 0 && catalog.failures.length === 0 &&
                  !providers.value.providers.some(provider => provider.active);
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
              scope.remote.$on("credentials/updated", refresh),
              scope.on("connection/reset", () => { hide(); void refresh(); }),
            ];
            void refresh();
            return () => {
              disposed = true;
              stop.forEach((dispose) => dispose());
              hide();
            };
          }, "openquantum: empty model catalog hint");
        });
        return () => fiber.dispose();
      });
    }

    // Own only the settings navigator. The Desktop composition disables the
    // upstream navigator so these child slots have exactly one lifetime owner.
    // Forms, credentials, preferences and their write paths remain native.
    function installMinimalSettings(ctx) {
      ctx.slots.inject("sidebar.settings", () => {
        const fiber = ctx.inject(["locale", "connection"], (scope) => {
          const { Modal, IconSettingsOutline16 } = require("@deepseek-ai/dsh-client-ui-primitives");
          scope.effect(() => scope.locale.register("settings", {
            zh: { trigger: "设置", title: "设置", close: "关闭", "general.nav": "通用设置",
              "connection.error": "连接异常", "connection.retry": "立即重连", "connection.connecting": "自动重连中",
              "connection.reconnect": "连接异常，点击立即重连", "connection.restart": "连接中断，正在自动重试，点击立即重连" },
            en: { trigger: "Settings", title: "Settings", close: "Close", "general.nav": "General",
              "connection.error": "Disconnected", "connection.retry": "Reconnect now", "connection.connecting": "Reconnecting",
              "connection.reconnect": "Disconnected, reconnect now", "connection.restart": "Reconnecting automatically, reconnect now" },
          }), "OpenQuantum settings chrome");
          const t = scope.locale.bind("settings");
          function MinimalSettings({ wide, renderSlot }) {
            const [open, setOpen] = React.useState(false);
            const [selected, select] = React.useState("general");
            const trigger = React.useRef(null);
            const navigation = React.useRef(null);
            React.useEffect(() => { if (open) navigation.current?.querySelector("button")?.focus(); }, [open]);
            React.useSyncExternalStore(
              (notify) => {
                const stopSlots = scope.slots.subscribe("settings.section", notify);
                const stopLocale = scope.locale.subscribe(notify);
                return () => { stopSlots(); stopLocale(); };
              },
              () => `${scope.slots.getVersion("settings.section")}:${scope.locale.getSnapshot().revision}`,
            );
            const sections = scope.slots.entriesOfSlot("settings.section")
              .filter(entry => ["general", "models", "openquantum-capabilities"].includes(entry.options.id))
              .map(entry => ({ id: entry.options.id, label: typeof entry.options.label === "function"
                ? entry.options.label() : entry.options.label }));
            const active = sections.some(section => section.id === selected) ? selected : sections[0]?.id;
            const close = () => { setOpen(false); trigger.current?.focus(); };
            return h(React.Fragment, null,
              h("button", { className: "oq-settings-trigger", ref: trigger, type: "button",
                "aria-label": t("trigger"), "aria-haspopup": "dialog", "aria-expanded": open, onClick: () => setOpen(true) },
                h(IconSettingsOutline16, { size: 20 }), wide && t("trigger")),
              h(Modal, { open, onClose: close, title: t("title"), closeLabel: t("close"),
                className: "oq-settings", contentClassName: "oq-settings-content",
              },
                h("nav", { className: "oq-settings-nav", ref: navigation }, ...sections.map(section => h("button", { key: section.id, type: "button",
                  "aria-current": section.id === active ? "page" : undefined, onClick: () => select(section.id) }, section.label)),
                  h("a", { className: "oq-settings-license", href: "https://github.com/xi-zhao/OpenQuantum/blob/main/THIRD_PARTY_NOTICES.md", target: "_blank", rel: "noreferrer" }, "OpenQuantum · © / MIT")),
                active && renderSlot("settings.section", { close }, { only: active }),
              ),
            );
          }
          scope.slots.register({ name: "sidebar.settings", priority: -1000,
            children: {
              "settings.section": { kind: "list", scope: "root" },
              "settings.action": { kind: "list", scope: "root" },
              "settings.onboarding": { kind: "list", scope: "root" },
            },
          }, MinimalSettings);
          scope.slots.inject("settings.section", () => scope.slots.register({
            name: "settings.section", id: "general", order: 0, label: () => t("general.nav"),
            children: { "settings.general.item": { kind: "list", scope: "root" } },
          }, ({ renderSlot }) => renderSlot("settings.general.item", {})));
        });
        return () => fiber.dispose();
      });
      // Preserve native window geometry and traffic lights without its developer menu.
      ctx.slots.inject("shell.overlay", () => ctx.slots.register({
        name: "shell.overlay", id: "desktop-frame-titlebar", priority: -1000,
      }, () => h("div", { className: "oq-desktop-titlebar" }, "OpenQuantum")));
    }

    const inject = ["slots"];

    function apply(ctx) {
      if (globalThis.document?.querySelector('meta[name="openquantum-minimal-ui"][content="true"]')) {
        showModelSetupHint(ctx);
      }
      if (globalThis.document?.querySelector('meta[name="openquantum-minimal-settings"][content="true"]')) {
        installMinimalSettings(ctx);
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
