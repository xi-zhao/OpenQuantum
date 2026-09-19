import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { installedLocaleSources, sourceDifferences } from "./lib/harness-locale-source.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const referenceUrl = new URL("../runtime/openquantum/web-locales/harness-source.json", import.meta.url);
const args = new Set(process.argv.slice(2));
if ([...args].some((arg) => !["--check", "--write", "--require-desktop"].includes(arg)) || args.has("--write") === args.has("--check")) {
  throw new Error("Usage: node scripts/sync-ui-locales.mjs --check|--write [--require-desktop]");
}
const reference = JSON.parse(await readFile(referenceUrl, "utf8"));
const { sources, desktopChecked } = await installedLocaleSources(root, { requireDesktop: args.has("--require-desktop") });
// A normal Web checkout does not install Desktop. Its source is checked in the
// Desktop CI job; keep that reference when synchronizing from a Web checkout.
if (!desktopChecked) sources["desktop.settings"] = reference["desktop.settings"];
const differences = sourceDifferences(reference, sources);
if (args.has("--write")) {
  await writeFile(referenceUrl, `${JSON.stringify(Object.fromEntries(Object.entries(sources).sort(([a], [b]) => a.localeCompare(b))), null, 2)}\n`);
  console.log(`Updated ${Object.keys(sources).length} source namespaces. Review these changes, complete translations, then run npm run locales:check.`);
} else if (differences.length) {
  console.error("Upstream interface copy changed. Run npm run locales:sync, review the source diff and update translations before upgrading.");
  process.exitCode = 1;
} else {
  console.log(`Locale source matches ${Object.keys(sources).length} namespaces; Desktop ${desktopChecked ? "checked" : "not installed (checked by Desktop CI)"}.`);
}
for (const difference of differences) console.log(difference);
