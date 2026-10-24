import { fileURLToPath } from "node:url";

export const name = "openquantum-desktop-branding";
export const inject = ["desktopRuntime", "openquantumWebSecurity"];
const iconPath = fileURLToPath(new URL("assets/icon-512.png", import.meta.url));

/** Supply a brand asset through the public shell contract, including Host IPC. */
export function installDesktopIcon(runtime, authenticatedUrl = url => url) {
  const original = runtime.schedule;
  const schedule = spec => original.call(runtime, { ...spec, url: authenticatedUrl(spec.url), iconPath, productName: "OpenQuantum", windowTitle: "OpenQuantum" });
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
  ctx.effect(() => installDesktopIcon(ctx.get("desktopRuntime"), url => ctx.openquantumWebSecurity.authenticatedUrl(url)), "OpenQuantum Desktop icon");
  // The shell mounts after decoration. Profile disposal waits for shell cleanup;
  // restoring this method can run alongside cleanup of the existing shell.
  ctx.provide("openquantumDesktopIcon", true);
}
