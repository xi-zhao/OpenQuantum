import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { CAPABILITY_CATEGORIES, capabilityCategory, mcpCategories } from "../capability-categories.mjs";

// Read presentation metadata from the existing policy; do not discover or start providers.
export async function readCapabilityCatalog(projectRoot) {
  let packages = [];
  try {
    const policy = parse(await readFile(path.join(projectRoot, ".agents/capability-packages.yml"), "utf8"));
    if (!Array.isArray(policy?.packages)) throw new Error("Invalid capability catalog");
    packages = policy.packages;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const servers = mcpCategories(packages);
  const tools = Object.create(null);
  for (const item of packages) {
    for (const tool of item.execution?.nativeTools ?? []) {
      // Host tools serve all subjects, including SDKs accessed through shell commands.
      tools[tool.name] = tool.providerPlugin?.startsWith("@deepseek-ai/") ? "reference" : capabilityCategory(item.id);
    }
    for (const server of item.execution?.mcpServers ?? []) {
      for (const tool of server.tools ?? []) tools[`mcp__${server.name}__${tool.name}`] = servers[server.name];
    }
  }
  return { categories: CAPABILITY_CATEGORIES, servers, tools };
}
