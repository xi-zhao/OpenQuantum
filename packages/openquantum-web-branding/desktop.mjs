import { fileURLToPath } from "node:url";

export const name = "openquantum-desktop-branding";
export const inject = ["desktopRuntime", "openquantumWebSecurity", "settings"];
const iconPath = fileURLToPath(new URL("assets/desktop-icon-512.png", import.meta.url));
const trayIcons = Object.freeze({
  templatePath: fileURLToPath(new URL("assets/tray-iconTemplate.png", import.meta.url)),
  bluePath: fileURLToPath(new URL("assets/tray-icon-color.png", import.meta.url)),
});

/** Own presentation only; the native shell still owns show, quit and disposal. */
export function installDesktopPresentation(runtime, authenticatedUrl = url => url, readLocale = () => undefined) {
  const original = runtime.schedule;
  const schedule = spec => {
    const url = new URL(spec.url);
    url.searchParams.set("dsh-desktop-mode", "compatibility");
    return original.call(runtime, {
      ...spec, mode: "compatibility", url: authenticatedUrl(url.href), iconPath, trayIcons,
      productName: "OpenQuantum", windowTitle: "OpenQuantum",
      readTrayMenu(languages) {
        const preference = readLocale();
        const locale = [preference, ...languages].filter(value => typeof value === "string")
          .map(value => value.toLowerCase().split("-")[0]).find(value => value === "zh" || value === "en") ?? "zh";
        return {
          openLabel: locale === "zh" ? "打开 OpenQuantum" : "Open OpenQuantum",
          quitLabel: locale === "zh" ? "退出 OpenQuantum" : "Quit OpenQuantum",
          showContributions: false,
          showModeSwitch: false,
        };
      },
    });
  };
  runtime.schedule = schedule;
  return () => { if (runtime.schedule === schedule) runtime.schedule = original; };
}

export function apply(ctx) {
  // The settings owner is a Desktop composition choice, independent of optional
  // copy/hint overrides on the shared web-branding plugin.
  ctx.inject(["webServer"], scope => {
    scope.effect(() => scope.webServer.tapIndex(html => html.includes('name="openquantum-minimal-settings"')
      ? html : html.replace("</head>", '<meta name="openquantum-minimal-settings" content="true" />\n</head>')),
    "OpenQuantum Desktop settings navigator");
  });
  ctx.effect(() => installDesktopPresentation(ctx.get("desktopRuntime"),
    url => ctx.openquantumWebSecurity.authenticatedUrl(url),
    () => ctx.settings.get("locale")?.preference), "OpenQuantum Desktop presentation");
  ctx.on("settings/updated", namespace => {
    // The source-built OpenQuantum shell provides this presentation interface.
    // Original third-party Desktop hosts retain their own native menu policy.
    if (namespace === "locale") ctx.desktopRuntime.refreshTrayMenu?.();
  });
  // The shell mounts after decoration. Profile disposal waits for shell cleanup;
  // restoring this method can run alongside cleanup of the existing shell.
  ctx.provide("openquantumDesktopIcon", true);
}
