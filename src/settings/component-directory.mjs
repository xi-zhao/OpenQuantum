import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { capabilityCategory, mcpCategories } from "./capability-categories.mjs";
import { mcpCatalogEntry } from "./server/project-settings-catalog.mjs";

// Presentation is shared; enablement, connection targets and credentials belong
// to each host. Neither reading this directory nor rendering it starts a Tool.
export function skillPresentation(name, metadata, capability = {}, ui = {}) {
  return {
    name,
    displayName: typeof ui.display_name === "string" ? ui.display_name
      : typeof capability?.displayName === "string" ? capability.displayName : name,
    description: String(metadata.description ?? ""),
    version: typeof capability?.version === "string" ? capability.version : null,
    maturity: typeof capability?.maturity?.status === "string" ? capability.maturity.status : null,
  };
}

async function optionalYaml(filename) {
  try { return parse(await readFile(filename, "utf8"), { strict: true, uniqueKeys: true }); }
  catch (error) { if (error.code === "ENOENT") return {}; throw error; }
}

export async function readComponentDirectory(projectRoot) {
  const policy = await optionalYaml(path.join(projectRoot, ".agents/capability-packages.yml"));
  if (policy.schemaVersion !== "1.1" || !Array.isArray(policy.packages)) throw new Error("Unsupported capability directory");
  const root = path.join(projectRoot, ".agents/skills");
  const entries = await readdir(root, { withFileTypes: true });
  const skills = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() || entry.isSymbolicLink() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name)) continue;
    const directory = path.join(root, entry.name);
    const raw = await readFile(path.join(directory, "SKILL.md"), "utf8");
    const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    const metadata = frontmatter && parse(frontmatter[1], { strict: true, uniqueKeys: true });
    if (metadata?.name !== entry.name || typeof metadata.description !== "string") throw new Error(`Invalid Skill: ${entry.name}`);
    const [capability, agent] = await Promise.all([
      optionalYaml(path.join(directory, "capability.yaml")), optionalYaml(path.join(directory, "agents/openai.yaml")),
    ]);
    skills.push({ ...skillPresentation(entry.name, metadata, capability, agent?.interface), category: capabilityCategory(entry.name) });
  }
  const categories = mcpCategories(policy.packages);
  const names = [...new Set(policy.packages.flatMap(item => (item.execution?.mcpServers ?? []).map(server => server.name)))].sort();
  const mcpServers = names.map(serverName => {
    const catalog = mcpCatalogEntry(serverName);
    const fields = ["displayName", "description", "provider", "sourceUrl", "packageName", "packageVersion"];
    return { serverName, ...Object.fromEntries(fields.map(key => [key, catalog[key]])), category: categories[serverName] ?? "other" };
  });
  return { skills, mcpServers };
}
