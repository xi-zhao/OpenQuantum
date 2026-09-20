import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { setImmediate } from "node:timers/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { dictionariesFor } from "../runtime/openquantum/web-locales/catalog.mjs";

const source = await readFile(new URL("../runtime/openquantum/web-updates/client.js", import.meta.url), "utf8");
const initial = () => ({ instanceId: "first", revision: 0, desktopCheck: 0, status: "idle", currentVersion: "0.4.0", automatic: true, automaticAllowed: true, release: null, notify: false });
const available = () => ({ ...initial(), revision: 1, status: "available", notify: true, release: { version: "0.5.0", releaseUrl: "https://github.com/xi-zhao/OpenQuantum/releases/tag/v0.5.0", upgradeUrl: "https://github.com/xi-zhao/OpenQuantum/blob/v0.5.0/docs/UPDATES.md" } });
const settle = async () => { for (let i = 0; i < 5; i++) await setImmediate(); };

function mount({ snapshot = initial(), fail = false } = {}) {
  let plugin;
  let tick;
  let language = "en";
  let removed = false;
  let aborted = false;
  const commands = [];
  const entries = new Map();
  const disposers = [];
  const server = { snapshot, fail };
  const React = {
    Fragment: "fragment",
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
  };
  const document = { hidden: false, head: { appendChild() {} }, createElement: () => ({ dataset: {}, remove() { removed = true; } }), addEventListener() {}, removeEventListener() {} };
  runInNewContext(source, {
    __ModuleLoader__: { load({ factory }) { plugin = factory((name) => { assert.equal(name, "react"); return React; }); } },
    AbortController, document, setInterval(fn) { tick = fn; return 1; }, clearInterval() { tick = undefined; },
    async fetch(url, options) {
      assert.equal(url, "/openquantum/api/updates");
      options.signal.addEventListener("abort", () => { aborted = true; }, { once: true });
      const command = JSON.parse(options.body);
      commands.push(command);
      if (server.fail) throw new Error("network details must not become user copy");
      let result = structuredClone(server.snapshot);
      if (command.action === "check") { server.snapshot = { ...available(), notify: false }; result = structuredClone(server.snapshot); }
      if (command.action === "claim") { server.snapshot = { ...server.snapshot, notify: false, revision: server.snapshot.revision + 1 }; result = { ...server.snapshot, claimed: true }; }
      return { ok: true, json: async () => result };
    },
  });
  const locale = {
    subscribe: () => () => {}, getSnapshot: () => ({ active: language }),
    bind: (namespace) => (key, params = {}) => {
      let value = dictionariesFor(language)[namespace][key];
      for (const [name, replacement] of Object.entries(params)) value = value.replaceAll(`{${name}}`, replacement);
      return value;
    },
  };
  plugin.apply({ locale, slots: { inject(_slot, fn) { fn(); }, register(meta, component) { entries.set(meta.name, component); return () => {}; } }, effect(fn) { disposers.push(fn()); } });
  const render = (value) => {
    if (Array.isArray(value)) return value.map(render);
    if (!value || typeof value !== "object") return value;
    if (typeof value.type === "function") return render(value.type(value.props));
    return { ...value, children: value.children.map(render) };
  };
  const view = (slot) => render(entries.get(slot)({}));
  return { server, commands, view, poll: () => tick(), setLanguage: (id) => { language = id; }, dispose() { disposers.forEach((fn) => fn()); assert.equal(tick, undefined); assert.equal(removed, true); assert.equal(aborted, true); } };
}

function nodes(value) {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object") return [];
  return [value, ...value.children.flatMap(nodes)];
}
function text(value) {
  if (Array.isArray(value)) return value.map(text).join(" ");
  if (!value || typeof value !== "object") return value ?? "";
  return value.children.map(text).join(" ");
}

test("background failures stay quiet; explicit check failures use localized copy", async (t) => {
  const ui = mount({ fail: true });
  t.after(() => ui.dispose());
  await settle();
  assert.equal(nodes(ui.view("settings.section")).some(({ props }) => props.role === "alert"), false);
  const check = nodes(ui.view("settings.section")).find(({ type }) => type === "button");
  await check.props.onClick();
  const view = ui.view("settings.section");
  assert.equal(nodes(view).some(({ props }) => props.role === "alert"), true);
  assert.doesNotMatch(text(view), /network details/);
});

test("new release reminders are claimed once, can be dismissed and keep manual checks usable", async (t) => {
  const ui = mount({ snapshot: available() });
  t.after(() => ui.dispose());
  await settle();
  let footer = ui.view("sidebar.footer.action");
  assert.ok(nodes(footer).some(({ type }) => type === "aside"));
  assert.match(text(footer), /0.5.0/);
  assert.equal(ui.commands.filter(({ action }) => action === "claim").length, 1);
  nodes(footer).find(({ props }) => props["aria-label"] === "Close").props.onClick();
  await ui.poll();
  footer = ui.view("sidebar.footer.action");
  assert.equal(nodes(footer).some(({ type }) => type === "aside"), false);
  assert.equal(ui.commands.filter(({ action }) => action === "claim").length, 1);
  nodes(ui.view("settings.section")).find(({ type }) => type === "button").props.onClick();
  await settle();
  assert.ok(ui.commands.some(({ action }) => action === "check"));
});

test("Desktop manual checks reveal the shared result, and a Host restart resets the revision fence", async (t) => {
  const ui = mount();
  t.after(() => ui.dispose());
  await settle();
  ui.server.snapshot = { ...available(), revision: 50, desktopCheck: 1, notify: false };
  await ui.poll();
  assert.ok(nodes(ui.view("sidebar.footer.action")).some(({ type }) => type === "aside"));
  ui.server.snapshot = { ...initial(), instanceId: "restarted", status: "unpublished" };
  await ui.poll();
  assert.match(text(ui.view("settings.section")), /No published OpenQuantum update/);
});

test("settings copy follows all ten languages and links only to release instructions", async (t) => {
  const ui = mount({ snapshot: { ...available(), notify: false } });
  t.after(() => ui.dispose());
  await settle();
  for (const id of ["zh", "en", "ja", "ko", "es", "fr", "de", "pt", "ru", "ar"]) {
    ui.setLanguage(id);
    const view = ui.view("settings.section");
    assert.ok(text(view).includes(dictionariesFor(id)["settings.openquantumUpdates"].nav));
    assert.doesNotMatch(text(view), /\{version\}/);
    for (const node of nodes(view).filter(({ type }) => type === "a")) {
      assert.match(node.props.href, /^https:\/\/github.com\/xi-zhao\/OpenQuantum\//);
      assert.equal(node.props.rel, "noopener noreferrer");
    }
  }
});
