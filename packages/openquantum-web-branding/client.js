globalThis.__ModuleLoader__.load({
  id: "@openquantum/harness-web-branding",
  factory: () => {
    const pluginModule = { exports: {} };

    function SuppressUpstreamDeveloperNotice() {
      return null;
    }

    const inject = ["slots"];

    function apply(ctx) {
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
