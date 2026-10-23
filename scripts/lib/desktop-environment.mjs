import { readFileSync } from "node:fs";
import { lstat, readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { parseEnv } from "node:util";
import { parseDocument, visit } from "yaml";
import { Context } from "@deepseek-ai/cordis";
import { LocalCredentialProvider } from "@deepseek-ai/dsh-credentials-local";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { createLaunchEnvironmentSnapshot } from "@deepseek-ai/dsh-launch-environment";
import { SERVICES } from "../../src/settings/codex/service-catalog.mjs";

const publicNames = [
  "OPENQUANTUM_PUBLIC_BASE_URL", "OPENQUANTUM_PRIVATE_BASE_URL",
  "OPENQUANTUM_GYM_TOOL_PROFILE", "OPENQUANTUM_HARDWARE_TOOL_PROFILE",
  "OPENQUANTUM_FLAGQUANTUM_TOOL_PROFILE", "OPENQUANTUM_DISABLE_QISKIT_MCP",
];

export function projectEnvironment(projectRoot) {
  try { return parseEnv(readFileSync(path.join(projectRoot, ".env"), "utf8")); }
  catch (error) { if (error.code === "ENOENT") return {}; throw error; }
}

// Native Desktop reads its launch directory's environment before selecting a
// Home. Persist only these public deployment defaults, never secret values.
export function desktopEnvironmentDefaults(source, projectRoot) {
  const environment = projectEnvironment(projectRoot);
  const defaults = new Map();
  for (const name of publicNames) {
    const value = environment[name];
    if (!value) continue;
    if (name.endsWith("_BASE_URL")) {
      let url;
      try { url = new URL(value); } catch { throw new Error(`Invalid ${name}`); }
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
        throw new Error(`${name} must be an HTTP(S) endpoint without credentials, query or fragment`);
      }
    }
    defaults.set(name, value);
  }
  if (!defaults.size) return source;
  const document = parseDocument(source, { customTags: [{ tag: "tag:yaml.org,2002:js", resolve: value => value }] });
  if (document.errors.length) throw new Error("Invalid Desktop deployment configuration");
  visit(document, {
    Scalar(_key, node) {
      if (node.tag !== "tag:yaml.org,2002:js") return;
      for (const [name, value] of defaults) {
        node.value = node.value.replace(new RegExp(`process\\.env\\.${name}\\b`, "g"), `(process.env.${name} ?? ${JSON.stringify(value)})`);
      }
    },
  });
  return document.toString({ lineWidth: 0 });
}

export function desktopCredentialReferences(sources) {
  const references = new Set();
  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (value.id === "openquantum-adaptive-capabilities") {
      for (const service of SERVICES) for (const field of service.fields) references.add(credentialRef(field.name));
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === "apiKeyEnv" && typeof child === "string") references.add(credentialRef(child));
      else if (["credentialEnv", "optionalCredentialEnv"].includes(key) && child && typeof child === "object") {
        for (const ref of Object.values(child)) if (typeof ref === "string") references.add(credentialRef(ref));
      } else visit(child);
    }
  }
  for (const source of sources) {
    const document = parseDocument(source, { customTags: [{ tag: "tag:yaml.org,2002:js", resolve: value => value }] });
    if (document.errors.length) throw new Error("Invalid Desktop credential configuration");
    visit(document.toJS());
  }
  return references;
}

// Once adopted, the native credential store owns project-file references.
// Explicit shell overrides remain authoritative; stale .env values must not
// make a native credential read-only or resurrect one deleted in Settings.
export function desktopLaunchEnvironment(projectRoot, sources, inherited = process.env) {
  const environment = projectEnvironment(projectRoot);
  for (const ref of desktopCredentialReferences(sources)) delete environment[ref];
  return { ...environment, ...inherited };
}

// Use the upstream store and its locking/permissions. This one-shot migration
// never overwrites an existing native credential and never logs secret values.
export async function persistDesktopCredentials(projectRoot, harnessHome, sources) {
  const environment = projectEnvironment(projectRoot);
  const marker = path.join(harnessHome, ".openquantum-credential-migration.json");
  const info = await lstat(marker).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  if (info?.isSymbolicLink()) throw new Error("Refusing a linked credential migration marker");
  const state = info ? JSON.parse(await readFile(marker, "utf8")) : { version: 1, references: [] };
  if (state.version !== 1 || !Array.isArray(state.references) || state.references.some(ref => typeof ref !== "string")) throw new Error("Invalid credential migration marker");
  const considered = new Set(state.references);
  const pending = [...desktopCredentialReferences(sources)].filter(ref => environment[ref] && !considered.has(ref));
  if (!pending.length) return [];
  const context = new Context();
  context.provide("launchEnvironment", createLaunchEnvironmentSnapshot([{ source: "process", values: {} }]));
  const provider = await context.plugin(LocalCredentialProvider, { dshHome: harnessHome, watch: false });
  const migrated = [];
  try {
    for (const ref of pending) {
      if (!(await context.credentials.describe(ref)).configured) {
        await context.credentials.set(ref, environment[ref]);
        migrated.push(ref);
      }
      // Native settings own this reference after adoption, including deletion.
      considered.add(ref);
      const temporary = `${marker}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify({ version: 1, references: [...considered] }), { mode: 0o600, flag: "wx" });
      await rename(temporary, marker);
    }
  } finally { await provider.dispose(); }
  return migrated;
}
