import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readSdkLibraries } from "../src/lib/sdk-access.mjs";
import { upsertSdkSection } from "../src/lib/sdk-skill.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const check = process.argv.includes("--check");
for (const entry of await readSdkLibraries(root)) {
  if (entry.id === "quantum-algorithms") continue; // Owned by build-open-algorithm-skills.
  const file = path.join(root, ".agents/skills", entry.id, "SKILL.md");
  const source = await fs.readFile(file, "utf8");
  const expected = upsertSdkSection(source, entry);
  if (check && source !== expected) throw new Error(`Native SDK guidance is stale: ${entry.id}`);
  if (!check && source !== expected) await fs.writeFile(file, expected);
}
