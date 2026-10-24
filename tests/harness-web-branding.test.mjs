import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { Context } from "@deepseek-ai/cordis";

import {
  apply,
  brandHarnessIndex,
} from "../packages/openquantum-web-branding/index.mjs";
import { OPENQUANTUM_BRAND } from "../packages/openquantum-web-branding/identity.mjs";

const HARNESS_INDEX = `<!doctype html>
<html>
  <head>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>DeepSeek Harness</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

test("brands the official Harness index without replacing its application shell", () => {
  const branded = brandHarnessIndex(HARNESS_INDEX);

  assert.match(branded, /<title>OpenQuantum<\/title>/);
  assert.match(branded, /data-openquantum-branding/);
  assert.match(branded, /\.oq-brand-name/);
  assert.match(branded, /\.oq-brand-mark/);
  assert.match(branded, /\[data-slot="sidebar"\] button > svg\[viewBox="0 0 182 24"\] \{ visibility: hidden; \}/);
  assert.match(branded, /\[data-phase="hero"\] span > svg\[viewBox="0 0 23.16 17.04"\] \{ visibility: hidden; \}/);
  assert.doesNotMatch(branded, /content: "OQ"/);
  assert.match(branded, /name="application-name" content="OpenQuantum"/);
  assert.match(branded, /name="theme-color" content="#061f38"/);
  assert.match(branded, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(branded, /rel="apple-touch-icon" sizes="192x192"/);
  assert.match(branded, /src="\/openquantum-branding\.js"/);
  assert.match(branded, /<div id="root"><\/div>/);
  assert.match(branded, /href="\/favicon\.svg"/);
  assert.equal(brandHarnessIndex(branded), branded);
});

test("narrow settings keep native navigation and give translated content its own row", async () => {
  const branded = brandHarnessIndex(HARNESS_INDEX);
  const require = createRequire(new URL("../node_modules/@deepseek-ai/dsh-web-app/package.json", import.meta.url));
  const manifest = require.resolve("@deepseek-ai/dsh-client-ui-settings-general/package.json");
  const native = await readFile(manifest.replace(/package\.json$/, "lib/client.js"), "utf8");
  assert.match(native, /role: "dialog"/);
  assert.match(native, /"aria-modal": "true"/);
  assert.match(native, /"aria-current": row\.id === active/);
  assert.match(native, /renderSlot\("settings\.general\.item"/);
  assert.match(branded, /@media \(max-width: 600px\)/);
  assert.match(branded, /\[data-sidebar-collapsed\] > div:has\(> \[data-slot="sidebar"\]\):has\(\[role="dialog"\]\[aria-modal="true"\]\) \{\s*z-index: 1000;/);
  assert.match(branded, /\[role="dialog"\]\[aria-modal="true"\]:has\(> nav \[aria-current\]\) \{\s*flex-direction: column;/);
  assert.match(branded, /\[aria-modal="true"\]:has\(> nav \[aria-current\]\) > nav > div:last-child \{\s*flex-direction: row;/);
  assert.match(branded, /\[data-slot="settings\.general\.item"\] > div:has\(> span > button\[aria-haspopup="menu"\]\)/);
  assert.doesNotMatch(branded, /VOzbGW_|hVGvvW_/, "do not couple the adaptation to generated CSS class hashes");
});

test("registers one canonical brand across the Harness Web surfaces", async () => {
  let transform;
  const routes = [];
  const effectLabels = [];
  const dispose = () => {};
  const ctx = {
    webServer: {
      tapIndex(nextTransform) {
        transform = nextTransform;
        return dispose;
      },
      register(route) {
        routes.push(route);
        return dispose;
      },
    },
    effect(register, label) {
      effectLabels.push(label);
      assert.equal(register(), dispose);
    },
  };

  apply(ctx);

  assert.deepEqual(effectLabels, [
    "openquantum: native Harness Web branding",
    "openquantum: favicon",
    "openquantum: brand mark",
    "openquantum: inverse brand mark",
    "openquantum: brand lockup",
    "openquantum: inverse brand lockup",
    "openquantum: app icon",
    "openquantum: large app icon",
    "openquantum: web manifest",
    "openquantum: product copy",
  ]);
  assert.equal(typeof transform, "function");
  assert.match(transform(HARNESS_INDEX), /<title>OpenQuantum<\/title>/);
  assert.deepEqual(
    routes.map((route) => route.path),
    [
      "/favicon.svg",
      "/openquantum/mark.svg",
      "/openquantum/mark-inverse.svg",
      "/openquantum/lockup.svg",
      "/openquantum/lockup-inverse.svg",
      "/openquantum/icon-192.png",
      "/openquantum/icon-512.png",
      "/manifest.webmanifest",
      "/openquantum-branding.js",
    ],
  );

  const responses = new Map();
  for (const route of routes) {
    let status;
    let headers;
    let body;
    route.handler(
      { method: "GET" },
      {
        writeHead(nextStatus, nextHeaders) {
          status = nextStatus;
          headers = nextHeaders;
        },
        end(value = "") {
          body = value;
        },
      },
    );
    responses.set(route.path, { body, headers, status });
  }

  const sourceMark = await readFile(
    new URL(
      "../packages/openquantum-web-branding/assets/mark.svg",
      import.meta.url,
    ),
    "utf8",
  );
  assert.equal(responses.get("/favicon.svg").body, sourceMark);
  assert.equal(responses.get("/openquantum/mark.svg").body, sourceMark);
  assert.equal(
    responses.get("/openquantum/icon-192.png").headers["content-type"],
    "image/png",
  );
  const icon = responses.get("/openquantum/icon-192.png").body;
  assert(Buffer.isBuffer(icon));
  assert.equal(icon.readUInt32BE(16), 192);
  assert.equal(icon.readUInt32BE(20), 192);
  const largeIcon = responses.get("/openquantum/icon-512.png").body;
  assert(Buffer.isBuffer(largeIcon));
  assert.equal(largeIcon.readUInt32BE(16), 512);
  assert.equal(largeIcon.readUInt32BE(20), 512);

  const manifest = JSON.parse(responses.get("/manifest.webmanifest").body);
  assert.equal(manifest.name, OPENQUANTUM_BRAND.name);
  assert.equal(manifest.short_name, OPENQUANTUM_BRAND.name);
  assert.equal(manifest.description, OPENQUANTUM_BRAND.tagline.zh);
  assert.equal(manifest.theme_color, OPENQUANTUM_BRAND.colors.ink);
  assert.deepEqual(
    manifest.icons.map((iconEntry) => iconEntry.src),
    [
      OPENQUANTUM_BRAND.mark.icon192Path,
      OPENQUANTUM_BRAND.mark.icon512Path,
      OPENQUANTUM_BRAND.mark.svgPath,
    ],
  );

  const copyRoute = routes.find(
    (route) => route.path === "/openquantum-branding.js",
  );
  assert(copyRoute);
  let body = "";
  copyRoute.handler(
    { method: "GET" },
    {
      writeHead(status, headers) {
        assert.equal(status, 200);
        assert.equal(headers["content-type"], "text/javascript; charset=utf-8");
      },
      end(value = "") {
        body = value;
      },
    },
  );
  assert.match(body, /量子计算，就在指尖/);
  assert.match(body, /Quantum computing, right at your fingertips/);
  assert.match(body, /配置提供方的 API 地址和凭据/);
  assert.match(body, /Configure each provider endpoint and credential/);
  assert.match(body, /连接与模型设置/);
  assert.match(body, /details\.open = true/);
  assert.match(body, /heroPreviewLabels/);
  assert.match(body, /parent\.remove\(\)/);
});

test("keeps the repository brand name, tagline and mark aligned", async () => {
  const [readme, preset, mark] = await Promise.all([
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../runtime/openquantum/agent-presets/openquantum/preset.yml",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../packages/openquantum-web-branding/assets/mark.svg",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.match(
    readme,
    /<h1 align="center">\s*<img src="\.\/packages\/openquantum-web-branding\/assets\/lockup\.svg"[^>]*alt="OpenQuantum"[^>]*\/>\s*<\/h1>/,
  );
  assert.ok(
    readme.includes(OPENQUANTUM_BRAND.tagline.zh),
    "README must include the canonical Chinese brand tagline",
  );
  assert.match(
    readme,
    /packages\/openquantum-web-branding\/assets\/lockup\.svg/,
  );
  assert.match(preset, /^name: OpenQuantum$/m);
  assert.match(mark, /<title id="title">OpenQuantum<\/title>/);
  assert.match(mark, /OpenQuantum OQ 标记/);
  assert.equal(OPENQUANTUM_BRAND.name, "OpenQuantum");
  assert.equal(OPENQUANTUM_BRAND.tagline.zh, "量子计算，就在指尖");
});

test("replaces the upstream developer notice through the native onboarding slot", async () => {
  const [manifestText, bundlePatch, client] = await Promise.all([
    readFile(
      new URL("../packages/openquantum-web-branding/package.json", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../packages/openquantum-web-branding/cordis.patch.yml",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../packages/openquantum-web-branding/client.js", import.meta.url),
      "utf8",
    ),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest.exports["./client"], "./client.js");
  assert.equal(manifest.dsh.bundle.patch, "./cordis.patch.yml");
  assert.equal(manifest.dsh.client.platform, "web");
  assert.deepEqual(manifest.dsh.client.inject, [
    "@deepseek-ai/dsh-client-ui-renderer",
    "@deepseek-ai/dsh-client-ui-sidebar",
    "@deepseek-ai/dsh-client-ui-conversation",
    "@deepseek-ai/dsh-client-ui-settings",
  ]);
  assert.equal(manifest.private, undefined);
  assert.equal(manifest.dependencies, undefined);
  assert.match(bundlePatch, /name: '@openquantum\/harness-web-branding'/);
  assert.match(client, /settings\.onboarding/);
  assert.match(client, /id: "welcome-notice"/);
  assert.match(client, /priority: -1000/);
  assert.match(client, /return null/);
  assert.doesNotMatch(client, /localStorage|sessionStorage/);
});

test("renders the canonical sidebar name and shared hero mark through native brand slots", async () => {
  const client = await readFile(
    new URL("../packages/openquantum-web-branding/client.js", import.meta.url),
    "utf8",
  );
  let plugin;
  runInNewContext(client, {
    __ModuleLoader__: {
      load({ factory }) {
        plugin = factory((name) => {
          assert.equal(name, "react");
          return {
            createElement(type, props, ...children) {
              return { type, props, children };
            },
          };
        });
      },
    },
  });
  const slots = new Map();
  plugin.apply({
    slots: {
      inject(_name, register) {
        const result = register();
        if (result?.[Symbol.iterator]) Array.from(result);
      },
      register(entry, component) {
        slots.set(entry.name, { entry, component });
        return () => {};
      },
    },
  });

  for (const name of ["sidebar.brand.mark", "sidebar.brand.name"]) {
    assert(slots.has(name), `missing brand occupant: ${name}`);
    assert(slots.get(name).entry.priority < 0, "must precede the official brand occupant");
  }
  const name = slots.get("sidebar.brand.name").component();
  assert.equal(name.type, "span");
  assert.equal(name.children.join(""), OPENQUANTUM_BRAND.name);
  for (const size of [24, 32]) {
    const mark = slots.get("sidebar.brand.mark").component({ size });
    assert.equal(mark.type, "img");
    assert.equal(mark.props.src, OPENQUANTUM_BRAND.mark.svgPath);
    assert.equal(mark.props.width, size);
    assert.equal(mark.props.height, size);
  }
  const hero = slots.get("conversation.hero.brand.mark").component({
    size: 34,
    className: "host-hero-mark",
  });
  assert.equal(hero.props.src, OPENQUANTUM_BRAND.mark.svgPath);
  assert.equal(hero.props.width, 34);
  assert.equal(hero.props.height, 34);
  assert.equal(hero.props.className, "oq-brand-mark host-hero-mark");
  assert.equal(slots.get("settings.onboarding").component(), null);
});

test("fails loudly if a future Harness shell no longer has an HTML head", () => {
  assert.throws(
    () => brandHarnessIndex("<main>missing head</main>"),
    /requires a Harness HTML head/,
  );
});

test("Desktop empty model hint restores the native selector on configuration, failure and disposal", async () => {
  const client = await readFile(new URL("../packages/openquantum-web-branding/client.js", import.meta.url), "utf8");
  const slots = new Map(), listeners = new Map(), pending = [], effects = [], directories = [];
  let plugin;
  const locale = { active: "zh" };
  let activeProvider = false;
  runInNewContext(client, {
    document: { querySelector: () => ({}) },
    __ModuleLoader__: { load({ factory }) {
      plugin = factory(() => ({
        createElement: (type, props, ...children) => ({ type, props, children }),
        useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
      }));
    } },
  });
  const on = (event, callback) => { listeners.set(event, callback); return () => listeners.delete(event); };
  const ctx = {
    slots: {
      inject(_name, register) { if (_name === "sidebar.settings") return () => {}; const result = register(); if (result?.[Symbol.iterator]) Array.from(result); },
      register(entry, component) { slots.set(entry.name, sessionId => component(entry.inject?.(sessionId))); return () => slots.delete(entry.name); },
    },
    inject(_names, register) { register(ctx); return { dispose() {} }; },
    effect(register) { effects.push(register()); },
    on,
    locale: { subscribe: () => () => {}, getSnapshot: () => locale },
    modelDirectories: { directoryFor: sessionId => directories.push(sessionId) },
    sessions: { subagentAddress: sessionId => sessionId === "child" ? {} : undefined },
    remote: { $on: on },
    connection: { api: { llm: { models: () => new Promise((resolve, reject) => pending.push({ resolve, reject })),
      providers: async () => ({ ok: true, value: { providers: activeProvider ? [{ active: true }] : [] } }),
    } } },
  };
  const hint = () => slots.get("conversation.input.model");
  const empty = { ok: true, value: { groups: [], failures: [] } };
  const configured = { ok: true, value: { groups: [{ provider: "user-provider", models: [] }], failures: [] } };
  plugin.apply(ctx);
  pending.shift().resolve(empty);
  await new Promise(setImmediate);
  assert.match(hint()("fresh-session").children.join(""), /请在设置/);
  assert.deepEqual(directories, ["fresh-session"]);
  assert.equal(hint()("child"), null);
  assert.deepEqual(directories, ["fresh-session"]);
  locale.active = "en";
  assert.match(hint()().children.join(""), /Settings → Models/);

  activeProvider = true;
  const unadvertisedRead = listeners.get("settings/document-updated")();
  pending.shift().resolve(empty);
  await unadvertisedRead;
  assert.equal(hint(), undefined, "an active route without advertised models retains the native selector");
  activeProvider = false;

  const configuredRead = listeners.get("settings/document-updated")();
  pending.shift().resolve(configured);
  await configuredRead;
  assert.equal(hint(), undefined);

  const oldRead = listeners.get("llm/adapters-updated")();
  const old = pending.shift();
  const freshRead = listeners.get("credentials/updated")();
  pending.shift().resolve(configured);
  await freshRead;
  old.resolve(empty);
  await oldRead;
  assert.equal(hint(), undefined, "an older response must not hide the configured selector");

  for (const result of [empty, { ok: true, value: { groups: [], failures: [{ provider: "broken" }] } }, empty, { ok: false }]) {
    const read = listeners.get("settings/document-updated")();
    pending.shift().resolve(result);
    await read;
    assert.equal(Boolean(hint()), result === empty);
  }
  const read = listeners.get("settings/document-updated")();
  pending.shift().resolve(empty);
  await read;
  listeners.get("connection/reset")();
  assert.equal(hint(), undefined, "reconnect immediately clears previous Host state");
  pending.shift().reject(new Error("offline"));
  await new Promise(setImmediate);
  assert.equal(hint(), undefined);

  const lateRead = listeners.get("settings/document-updated")();
  effects.forEach(dispose => dispose());
  pending.shift().resolve(empty);
  await lateRead;
  assert.equal(hint(), undefined);
  assert.equal(listeners.size, 0);
});

test("native Cordis disposes and remounts the model hint with its slot declaration", async t => {
  const client = await readFile(new URL("../packages/openquantum-web-branding/client.js", import.meta.url), "utf8");
  let plugin, registerSlot;
  runInNewContext(client, {
    document: { querySelector: () => ({}) },
    __ModuleLoader__: { load({ factory }) { plugin = factory(() => ({})); } },
  });
  const ctx = new Context();
  t.after(() => ctx.fiber.dispose());
  const listeners = new Map(), pending = [], slots = new Set();
  const remote = {
    $on(event, callback) { listeners.set(event, callback); return () => listeners.delete(event); },

  };
  ctx.provide("remote", remote);
  ctx.provide("connection", { api: { llm: { models: () => new Promise(resolve => pending.push(resolve)), providers: async () => ({ ok: true, value: { providers: [] } }) } } });
  ctx.provide("locale", {});
  ctx.provide("modelDirectories", {});
  ctx.provide("sessions", {});
  ctx.provide("slots", {
    inject(name, register) {
      if (name === "conversation.input.model") registerSlot = register;
      return () => {};
    },
    register(entry) { slots.add(entry.name); return () => slots.delete(entry.name); },
  });
  plugin.apply(ctx);
  const empty = { ok: true, value: { groups: [], failures: [] } };
  for (let mount = 0; mount < 2; mount++) {
    // The pinned SlotRegistry uses this actual effect boundary for each declaration.
    const dispose = ctx.effect(registerSlot);
    await dispose;
    await new Promise(setImmediate);
    assert.equal(listeners.size, 3);
    pending.shift()(empty);
    await new Promise(setImmediate);
    assert.ok(slots.has("conversation.input.model"));
    const lateRead = listeners.get("settings/document-updated")();
    await dispose();
    assert.equal(listeners.size, 0);
    assert.equal(slots.size, 0);
    pending.shift()(empty);
    await lateRead;
    assert.equal(slots.size, 0, "a late catalog cannot restore a disposed slot");
  }
});

test("only minimal Desktop composition enables the empty model hint", () => {
  for (const minimalUi of [false, true]) {
    let transform;
    apply({
      effect: register => register(),
      webServer: { tapIndex(fn) { transform = fn; return () => {}; }, register: () => () => {} },
    }, { minimalUi });
    const html = transform(HARNESS_INDEX);
    assert.equal(html.includes('name="openquantum-minimal-ui"'), minimalUi);
    assert.equal(transform(html), html);
  }
});

test("Desktop settings owns its child slots and renders only native general and model forms", async () => {
  const client = await readFile(new URL("../packages/openquantum-web-branding/client.js", import.meta.url), "utf8");
  const declarations = new Set(["sidebar.settings", "shell.overlay"]);
  const occupants = new Map(), pending = new Map(), forms = [];
  const nativeModels = { options: { id: "models", label: "Models" } };
  const nativeDesktop = { options: { id: "desktop", label: "Desktop" } };
  const slots = {
    inject(name, register) {
      if (declarations.has(name)) return register();
      pending.set(name, register);
      return () => {};
    },
    register(options, component) {
      assert.ok(declarations.has(options.name), options.name);
      for (const child of Object.keys(options.children ?? {})) {
        assert.ok(!declarations.has(child), `duplicate child declaration: ${child}`);
        declarations.add(child);
        pending.get(child)?.();
      }
      occupants.set(options.name, { options, component });
      return () => occupants.delete(options.name);
    },
    subscribe: () => () => {}, getVersion: () => 1,
    entriesOfSlot: () => [occupants.get("settings.section"), nativeModels, nativeDesktop],
  };
  const react = {
    createElement: (type, props, ...children) => { assert.ok(type, "every component must exist"); return { type, props, children }; },
    Fragment: "fragment", useState: value => [value, () => {}], useRef: () => ({ current: null }),
    useEffect() {}, useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
  };
  let plugin;
  runInNewContext(client, {
    document: { querySelector: selector => selector.includes("minimal-settings") ? {} : null },
    __ModuleLoader__: { load({ factory }) {
      plugin = factory(name => name === "react" ? react : { Modal: "native-modal", IconSettingsOutline16: "native-icon" });
    } },
  });
  const scope = { slots, effect: fn => fn(),
    locale: { register: () => () => {}, bind: () => key => key, subscribe: () => () => {}, getSnapshot: () => ({ revision: 1 }) },
  };
  scope.inject = (_names, callback) => { callback(scope); return { dispose() {} }; };
  plugin.apply(scope);
  const render = (entry, props = {}) => entry.component({ ...props, ...entry.options.children && {
    renderSlot(name, owner, options) {
      assert.ok(entry.options.children[name], `unauthorized child slot: ${name}`);
      forms.push({ name, owner, options });
      return "native-form";
    },
  } });
  const root = render(occupants.get("sidebar.settings"), { wide: true });
  const modal = root.children.find(child => child.type === "native-modal");
  assert.deepEqual(modal.children[0].children.map(button => button.children[0]), ["general.nav", "Models"]);
  assert.equal(forms[0].name, "settings.section");
  assert.equal(forms[0].options.only, "general");
  render(occupants.get("settings.section"));
  assert.equal(forms[1].name, "settings.general.item");
  assert.equal(typeof modal.props.onClose, "function");
});


test("the pinned legacy brand adapter matches both shipped decorative marks", async () => {
  const require = createRequire(new URL("../node_modules/@deepseek-ai/dsh-web-app/package.json", import.meta.url));
  const source = async name => readFile(require.resolve(`${name}/package.json`).replace(/package\.json$/, "lib/client.js"), "utf8");
  const sidebar = await source("@deepseek-ai/dsh-client-ui-sidebar");
  const conversation = await source("@deepseek-ai/dsh-client-ui-conversation");
  const primitives = await readFile(require.resolve("@deepseek-ai/dsh-client-ui-primitives"), "utf8");
  assert.match(sidebar, /\.BrandWordmark/);
  assert.match(sidebar, /\.FishLogo/);
  assert.match(primitives, /viewBox: "0 0 182 24"/);
  assert.match(primitives, /viewBox: "0 0 23.16 17.04"/);
  assert.match(conversation, /\.FishLogo/);
  assert.match(conversation, /"data-phase":/);
});
