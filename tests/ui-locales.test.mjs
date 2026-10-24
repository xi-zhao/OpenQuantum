import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { dictionariesFor, languages, sources, translations } from "../runtime/openquantum/web-locales/catalog.mjs";
import { apply } from "../runtime/openquantum/web-locales/client.js";
import { acceptsLocaleRequest, createLocaleMessage, languageFor, readLocaleMessage, LOCALE_CHANNEL } from "../src/learning/ui-locale.mjs";
import { extractLocaleRegistrations, sourceDifferences } from "../scripts/lib/harness-locale-source.mjs";

const placeholders = (text) => [...text.matchAll(/\{[A-Za-z0-9_]+\}/g)].map(([value]) => value).sort();

test("source extraction handles scoped literals and registrations without executing UI code", () => {
  const source = `
    throw new Error('UI code must not execute');
    const name = 'dialog';
    const common = { cancel: 'Cancel' };
    const en = { ...common, title: 'Choose {name}' };
    function apply(ctx) {
      ctx.locale.register(name, { en, zh: { cancel: '取消', title: '选择 {name}' } });
      const rows = [['en', { hint: en.title }], ['zh', { hint: '提示' }]];
      for (const [id, dict] of rows) ctx.locale.register('extra', id, dict);
    }`;
  const extracted = extractLocaleRegistrations(source);
  assert.deepEqual(extracted.dialog.en, { cancel: "Cancel", title: "Choose {name}" });
  assert.deepEqual(extracted.extra, { en: { hint: "Choose {name}" }, zh: { hint: "提示" } });
  assert.throws(() => extractLocaleRegistrations("ctx.locale.register('future', makeDictionaries())"), /Unsupported locale expression/);
  const before = { dialog: { package: "test", ...extracted.dialog } };
  const after = structuredClone(before);
  after.dialog.en.title = "Updated {name}";
  after.dialog.en.new = "New";
  delete after.dialog.en.cancel;
  assert.deepEqual(sourceDifferences(before, after), ["dialog/en/cancel: removed", "dialog/en/new: added", "dialog/en/title: changed"]);
});

test("every README edition links all languages and keeps valid shared startup commands", async () => {
  const root = new URL("../", import.meta.url);
  const editions = languages.map(({ id }) => new URL(id === "zh" ? "README.md" : `docs/readme/README.${id}.md`, root));
  const manifest = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  for (const edition of editions) {
    const content = await readFile(edition, "utf8");
    assert.equal((content.match(/^```/gm) ?? []).length % 2, 0, `${edition}: unbalanced code fence`);
    const links = [...content.matchAll(/(?:href|src)="([^"]+)"|\]\(([^)]+)\)/g)].map((match) => match[1] ?? match[2]);
    const local = links.filter((href) => !/^(?:[a-z]+:|#)/i.test(href)).map((href) => new URL(href.split("#")[0], edition));
    for (const target of editions) assert.ok(local.some((link) => link.href === target.href), `${edition}: missing language link to ${target}`);
    for (const link of local) await access(fileURLToPath(link));
    for (const command of ["npm ci", "npm run dev", "npm run desktop:setup", "npm run desktop", "npm run learning:ui:setup"]) assert.ok(content.includes(command), `${edition}: missing ${command}`);
    for (const [, script] of content.matchAll(/npm run ([a-z][a-z0-9:-]*)/g)) assert.ok(Object.hasOwn(manifest.scripts, script), `${edition}: unknown npm script ${script}`);
  }
});

test("all ten language catalogs preserve source keys and interpolation parameters", () => {
  assert.deepEqual(languages.map(({ id }) => id), ["zh", "en", "ja", "ko", "es", "fr", "de", "pt", "ru", "ar"]);
  for (const { id } of languages) {
    const dictionaries = dictionariesFor(id);
    for (const [namespace, dictionary] of Object.entries(dictionaries)) {
      const source = sources[namespace].en;
      assert.deepEqual(Object.keys(dictionary).sort(), Object.keys(source).sort(), `${id}/${namespace} key coverage`);
      for (const [key, value] of Object.entries(dictionary)) {
        assert.equal(typeof value, "string");
        // Upstream may intentionally leave an English fragment empty (e.g. a shared prefix).
        assert.ok(value.length > 0 || key === "hero.preview" || source[key] === "", `${id}/${namespace}/${key} is empty`);
        assert.deepEqual(placeholders(value), placeholders(source[key]), `${id}/${namespace}/${key} parameters`);
        if (!["zh", "en"].includes(id) && !["hero.headline", "hero.preview"].includes(key)) {
          assert.ok(Object.hasOwn(translations[id], source[key]), `${id}: missing translation for ${source[key]}`);
        }
      }
    }
  }
});

test("retained AI review binds all eight phrase sets and the unchanged active subset", async () => {
  const root = new URL("../runtime/openquantum/web-locales/", import.meta.url);
  const review = JSON.parse(await readFile(new URL("translation-review.json", root), "utf8"));
  const digest = (value) => createHash("sha256").update(value).digest("hex");
  assert.equal(review.status, "ai-reviewed");
  assert.equal(review.humanNativeReview, false);
  assert.equal(review.method, "sequential retranslation and semantic review; no subagents or external translation provider");
  assert.equal(review.initialDraft.phraseCount, 1219);
  assert.equal(review.phrases.length, 1278);
  assert.equal(new Set(review.phrases).size, review.phrases.length);
  assert.equal(review.source, "Harness 0.2.1-rc.2 / Desktop 2.0.18 interface copy");
  assert.equal(review.activeBaseline.source, "Harness 0.1.0-rc.6 / Desktop 2.0.0 interface copy");
  assert.equal(review.activeBaseline.sourceSha256, digest(await readFile(new URL("harness-source.json", root))));
  assert.deepEqual(review.languages, languages.filter(({ id }) => !["zh", "en"].includes(id)).map(({ id }) => id));
  const english = new Set(Object.values(sources).flatMap((entry) => Object.values(entry.en ?? {})));
  assert.deepEqual(review.activeBaseline.phrases, review.phrases.filter(phrase => english.has(phrase)));
  for (const phrase of review.phrases) {
    for (const id of review.languages) assert.ok(Object.hasOwn(translations[id], phrase), `${id}: reviewed translation missing for ${phrase}`);
  }
  for (const id of review.languages) {
    const entries = review.phrases.map((phrase) => [phrase, translations[id][phrase]]);
    assert.equal(review.translationSha256[id], digest(JSON.stringify(entries)), `${id}: wording changed since review; re-review and update the digest`);
  }
});

test("translated actions retain their meaning and date formatters use regional locales", () => {
  const actions = {
    ja: ["サインアウト", "ピン留めを解除"],
    ko: ["로그아웃", "고정 해제"],
    es: ["Cerrar sesión", "Desfijar"],
    fr: ["Se déconnecter", "Désépingler"],
    de: ["Abmelden", "Nicht mehr anheften"],
    pt: ["Sair da conta", "Desafixar"],
    ru: ["Выйти из аккаунта", "Открепить"],
    ar: ["تسجيل الخروج", "إلغاء التثبيت"],
  };
  for (const { id, learningLocale } of languages.filter(({ id }) => actions[id])) {
    const dict = dictionariesFor(id);
    assert.equal(translations[id]["Sign out"], actions[id][0]);
    assert.equal(translations[id].Unpin, actions[id][1]);
    assert.equal(translations[id].en, learningLocale);
    assert.doesNotThrow(() => new Intl.DateTimeFormat(translations[id].en).format(0));
    const help = translations[id]["Unable to create default workspace. Use Choose workspace to select a folder."];
    assert.ok(help.includes(dict.conversation["hero.chooseWorkspace"]), `${id}: workspace help must match the visible label`);
  }
});

test("English covers every owned Chinese interface key", () => {
  for (const entry of Object.values(sources).filter(({ package: owner }) => owner === "openquantum")) {
    assert.deepEqual(Object.keys(entry.en).sort(), Object.keys(entry.zh).sort());
    for (const text of Object.values(entry.en)) assert.doesNotMatch(text, /[\u4e00-\u9fff]/);
  }
});

async function nativeLocaleRuntime() {
  let result;
  const source = await readFile(new URL("../node_modules/@deepseek-ai/dsh-client-locale/lib/client.js", import.meta.url), "utf8");
  runInNewContext(source, {
    navigator: { languages: ["en-US"] },
    window: { __ModuleLoader__: { load: ({ factory }) => { result = factory(() => ({})); } } },
  });
  return result.LocaleRuntime;
}

test("native Harness owns switching, durable restoration, fallback and plugin disposal", async (context) => {
  const LocaleRuntime = await nativeLocaleRuntime();
  let persisted = {};
  const hostListeners = new Set();
  const host = {
    getSnapshot: () => ({ value: persisted }),
    subscribe: (fn) => { hostListeners.add(fn); return () => hostListeners.delete(fn); },
    set: (key, value) => { persisted = { ...persisted, [key]: value }; for (const fn of hostListeners) fn(); },
  };
  const originalDocument = globalThis.document;
  const root = { dir: "ltr", getAttribute: () => "ltr", setAttribute(name, value) { this[name] = value; } };
  globalThis.document = { documentElement: root };
  context.after(() => { if (originalDocument) globalThis.document = originalDocument; else delete globalThis.document; });
  const mount = () => {
    const disposers = [];
    const ctx = { emit() {}, effect(register) { disposers.push(register()); } };
    ctx.locale = new LocaleRuntime(ctx, host);
    for (const [namespace, entry] of Object.entries(sources).filter(([, entry]) => entry.package !== "openquantum")) {
      ctx.locale.register(namespace, { en: entry.en, zh: entry.zh });
    }
    apply(ctx);
    return { locale: ctx.locale, dispose: () => disposers.reverse().forEach((dispose) => dispose()) };
  };
  const first = mount();
  assert.deepEqual(Array.from(first.locale.getSnapshot().locales, ({ id }) => id), ["zh", "en"]);
  assert.throws(() => first.locale.setLocale("ja"), /not registered/);
  const label = first.locale.bind("settings.locale");
  for (const { id, direction } of languages.filter(({ id }) => ["zh", "en"].includes(id))) {
    first.locale.setLocale(id);
    assert.equal(persisted.preference, id);
    assert.equal(root.dir, direction);
    assert.equal(label("language.title"), dictionariesFor(id)["settings.locale"]?.["language.title"] ?? sources["settings.locale"][id]["language.title"]);
  }
  first.locale.register("future.plugin", "zh", { help: "中文回退 {name}" });
  assert.equal(first.locale.bind("future.plugin")("help", { name: "OK" }), "中文回退 OK");
  first.dispose();
  assert.equal(persisted.preference, "en", "unloading must not rewrite the preference");
  assert.equal(root.dir, "ltr");
  const refreshed = mount();
  assert.equal(refreshed.locale.getSnapshot().active, "en");
  assert.equal(root.dir, "ltr");
  refreshed.locale.setLocale("en");
  assert.equal(root.dir, "ltr");
  refreshed.dispose();
});

test("classroom locale bridge rejects unrelated windows, origins, channels and languages", () => {
  const peer = {};
  const origin = "http://localhost:3037";
  const ready = { source: peer, origin, data: { channel: LOCALE_CHANNEL, type: "ready" } };
  assert.equal(acceptsLocaleRequest(ready, peer, origin), true);
  for (const { id, learningLocale } of languages) {
    const data = createLocaleMessage(id);
    assert.equal(readLocaleMessage({ source: peer, origin, data }, peer, origin).learningLocale, learningLocale);
    const selection = createLocaleMessage(learningLocale, "select");
    assert.equal(readLocaleMessage({ source: peer, origin, data: selection }, peer, origin, "select").id, id);
    assert.equal(readLocaleMessage({ source: peer, origin, data: selection }, peer, origin), null);
  }
  for (const invalid of [
    { ...ready, source: {} }, { ...ready, origin: "http://localhost:3038" },
    { ...ready, data: { ...ready.data, channel: "openquantum.openmaic.v1" } },
  ]) assert.equal(acceptsLocaleRequest(invalid, peer, origin), false);
  assert.equal(acceptsLocaleRequest(ready, null, origin), false);
  assert.equal(createLocaleMessage("unsupported"), null);
  assert.equal(languageFor("../../settings"), undefined);
  assert.equal(readLocaleMessage({ source: peer, origin, data: { channel: LOCALE_CHANNEL, type: "locale", locale: "xx" } }, peer, origin), null);
});
