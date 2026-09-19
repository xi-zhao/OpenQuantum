import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parse } from "acorn";
import { transform } from "esbuild";
import { DESKTOP_SOURCE, desktopPackageDirectory } from "./desktop-source.mjs";

// Read literals from the installed source without executing third-party UI code.
// An unsupported registration shape fails the check instead of silently losing copy.
function staticSource(source) {
  const ast = parse(source, { ecmaVersion: "latest", sourceType: "module" });
  const root = { bindings: new Map() };
  const scopes = new WeakMap();
  const calls = [];
  function visit(node, parent) {
    if (!node || typeof node.type !== "string") return;
    const scoped = /Function/.test(node.type) || ["BlockStatement", "ForOfStatement"].includes(node.type);
    const scope = scoped ? { parent, bindings: new Map(), loop: node.type === "ForOfStatement" ? node : null } : parent;
    scopes.set(node, scope);
    if (node.type === "VariableDeclarator" && node.id.type === "Identifier") scope.bindings.set(node.id.name, node.init);
    if (node.type === "CallExpression" && node.callee.type === "MemberExpression" && node.callee.property.name === "register") {
      const owner = node.callee.object;
      if (owner.name === "locale" || (owner.type === "MemberExpression" && owner.property.name === "locale")) calls.push(node);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach((child) => visit(child, scope));
      else if (value && typeof value === "object") visit(value, scope);
    }
  }
  visit(ast, root);
  function literal(node, scope, depth = 0) {
    if (!node || depth > 30) throw new Error("Unresolved or recursive locale literal");
    const resolve = (child) => literal(child, scope, depth + 1);
    if (node.type === "Literal") return node.value;
    if (node.type === "Identifier") {
      for (let current = scope; current; current = current.parent) {
        if (current.bindings.has(node.name)) return literal(current.bindings.get(node.name), current, depth + 1);
      }
    }
    if (node.type === "ArrayExpression") return node.elements.map(resolve);
    if (node.type === "ObjectExpression") {
      const entries = node.properties.flatMap((property) => {
        if (property.type === "SpreadElement") return Object.entries(resolve(property.argument));
        if (property.type !== "Property" || property.method) throw new Error("Unsupported locale object property");
        return [[property.computed ? resolve(property.key) : property.key.name ?? property.key.value, resolve(property.value)]];
      });
      return Object.fromEntries(entries);
    }
    if (node.type === "MemberExpression") return resolve(node.object)[node.computed ? resolve(node.property) : node.property.name];
    throw new Error(`Unsupported locale expression: ${node.type}${node.name ? ` ${node.name}` : ""}`);
  }
  return { root, calls, scopes, literal };
}

export function extractLocaleRegistrations(source) {
  const { calls, scopes, literal } = staticSource(source);
  const dictionaries = {};
  function add(namespace, locale, dictionary) {
    if (typeof namespace !== "string" || !["en", "zh"].includes(locale) || !dictionary || Array.isArray(dictionary) || typeof dictionary !== "object" || Object.values(dictionary).some((value) => typeof value !== "string")) {
      throw new Error(`Invalid source locale registration: ${namespace}/${locale}`);
    }
    const target = (dictionaries[namespace] ??= {})[locale] ??= {};
    for (const [key, value] of Object.entries(dictionary)) {
      if (Object.hasOwn(target, key) && target[key] !== value) throw new Error(`Conflicting locale registration: ${namespace}/${locale}/${key}`);
      target[key] = value;
    }
  }
  for (const call of calls) {
    const scope = scopes.get(call);
    const [namespaceNode, localeNode, dictionaryNode] = call.arguments;
    const namespace = literal(namespaceNode, scope);
    if (call.arguments.length === 2) {
      const localized = literal(localeNode, scope);
      for (const [locale, dictionary] of Object.entries(localized)) add(namespace, locale, dictionary);
    } else if (call.arguments.length === 3) {
      let entries;
      for (let current = scope; current; current = current.parent) {
        const loop = current.loop;
        const pattern = loop?.left?.declarations?.[0]?.id;
        if (pattern?.type === "ArrayPattern" && pattern.elements[0]?.name === localeNode.name && pattern.elements[1]?.name === dictionaryNode.name) {
          entries = literal(loop.right, current);
          break;
        }
      }
      if (entries) for (const [locale, dictionary] of entries) add(namespace, locale, dictionary);
      else add(namespace, literal(localeNode, scope), literal(dictionaryNode, scope));
    } else throw new Error(`Unsupported locale registration arity: ${call.arguments.length}`);
  }
  return dictionaries;
}

export async function installedLocaleSources(root, { requireDesktop = false } = {}) {
  const base = path.join(root, "node_modules/@deepseek-ai");
  const entries = (await readdir(base)).filter((name) => name.startsWith("dsh-client-")).sort();
  const sources = {};
  for (const name of entries) {
    let source;
    try { source = await readFile(path.join(base, name, "lib/client.js"), "utf8"); }
    catch (error) { if (error.code === "ENOENT") continue; throw error; }
    let extracted;
    try { extracted = extractLocaleRegistrations(source); }
    catch (error) { throw new Error(`${name}: ${error.message}`, { cause: error }); }
    for (const [namespace, locales] of Object.entries(extracted)) {
      if (sources[namespace]) throw new Error(`Locale namespace has multiple owners: ${namespace}`);
      sources[namespace] = { package: name, ...locales };
    }
  }
  if (!sources.common || !sources["settings.locale"]) throw new Error("Harness locale source is missing; install the pinned dependencies first.");
  let desktopChecked = false;
  try {
    const directory = desktopPackageDirectory(root);
    const manifest = JSON.parse(await readFile(path.join(directory, "package.json"), "utf8"));
    if (manifest.version !== DESKTOP_SOURCE.version) throw new Error("Desktop locale source version differs from the pin.");
    const source = await readFile(path.join(directory, "src/client/desktop-settings-locales.ts"), "utf8");
    const { code } = await transform(source, { loader: "ts", format: "esm" });
    const parsed = staticSource(code);
    const locales = Object.fromEntries(["en", "zh"].map((id) => [id, parsed.literal({ type: "Identifier", name: id }, parsed.root)]));
    sources["desktop.settings"] = { package: `dsh-plugin-desktop@${manifest.version}`, ...locales };
    desktopChecked = true;
  } catch (error) {
    if (error.code !== "ENOENT" || requireDesktop) throw error;
  }
  return { sources, desktopChecked };
}

export function sourceDifferences(expected, actual) {
  const differences = [];
  for (const namespace of new Set([...Object.keys(expected), ...Object.keys(actual)])) {
    if (!expected[namespace] || !actual[namespace]) {
      differences.push(`${namespace}: ${actual[namespace] ? "new" : "removed"} namespace`);
      continue;
    }
    if (expected[namespace].package !== actual[namespace].package) differences.push(`${namespace}: package changed`);
    for (const locale of ["en", "zh"]) {
      const before = expected[namespace][locale] ?? {};
      const after = actual[namespace][locale] ?? {};
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (before[key] !== after[key]) differences.push(`${namespace}/${locale}/${key}: ${!Object.hasOwn(before, key) ? "added" : !Object.hasOwn(after, key) ? "removed" : "changed"}`);
      }
    }
  }
  return differences.sort();
}
