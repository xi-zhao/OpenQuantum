globalThis.__ModuleLoader__.load({
  id: "@openquantum/harness-web-branding",
  factory: (require) => {
    const pluginModule = { exports: {} };
    const h = require("react").createElement;

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

    const inject = ["slots"];

    function apply(ctx) {
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
