#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { qpandaSkillIntegration } from "../src/settings/server/qpanda-skill.mjs";
import { installPinnedSource, inspectPinnedSource } from "./lib/install-pinned-source.mjs";

export const QPANDA_SKILL_SOURCE = qpandaSkillIntegration.sourceUrl;
export const QPANDA_SKILL_REVISION = qpandaSkillIntegration.revision;
export const QPANDA_SKILL_RELATIVE_ROOT = qpandaSkillIntegration.relativeRoot;

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

export function inspectQpandaSkill(root, options = {}) {
  return inspectPinnedSource(root, qpandaSkillIntegration, options);
}

export function installQpandaSkill(root, options = {}) {
  return installPinnedSource(root, qpandaSkillIntegration, options);
}

async function main() {
  const result = await installQpandaSkill(projectRoot);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(
    "OriginQ pyqpanda3 Skill mounted as-is under .agents/skills/pyqpanda3 (Git-ignored, not redistributed). " +
      "It only guides quantum development; running circuits on real hardware still requires enabling the default-off QPanda3 Runtime MCP. Restart Harness to load it.\n",
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
