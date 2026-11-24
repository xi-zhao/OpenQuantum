import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";

const POLICY_PATH = ".agents/capability-packages.yml";
const PRESET_PATH = "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml";
const SDK_LIBRARIES_PATH = ".agents/sdk-libraries.json";
const SKILLS_DIR = ".agents/skills";

function readYaml(source, label, customTags = []) {
  const document = parseDocument(source, { strict: true, uniqueKeys: true, customTags });
  if (document.errors.length || document.warnings.length) {
    throw new Error(`${label}: ${[...document.errors, ...document.warnings].map(issue => issue.message).join("; ")}`);
  }
  return document.toJS({ maxAliasCount: 20 });
}

function readPolicySummary(projectRoot) {
  const raw = fs.readFileSync(path.join(projectRoot, POLICY_PATH), "utf8");
  const { packages } = readYaml(raw, POLICY_PATH);
  const levels = { L0: 0, L1: 0, L2: 0, L3: 0 };
  const ids = packages.map(item => item.id);
  let mcpToolCount = 0;

  for (const item of packages) {
    if (Object.hasOwn(levels, item.level)) levels[item.level] += 1;
    for (const server of item.execution?.mcpServers ?? []) {
      mcpToolCount += (server.tools ?? []).length;
    }
  }

  return { packageCount: ids.length, ids, levels, mcpToolCount };
}

function readSkillSummary(projectRoot) {
  const skillsRoot = path.join(projectRoot, SKILLS_DIR);
  const entries = fs.readdirSync(skillsRoot, { withFileTypes: true });
  const skillIds = [];
  let autoCount = 0;
  let manualCount = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(skillsRoot, entry.name, "SKILL.md");
    if (!fs.existsSync(skillPath)) continue;
    skillIds.push(entry.name);
    const content = fs.readFileSync(skillPath, "utf8");
    const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
    if (frontmatter === undefined) throw new Error(`${skillPath} must begin with YAML frontmatter`);
    const metadata = readYaml(frontmatter, skillPath);
    if (metadata["disable-model-invocation"] === true) {
      manualCount += 1;
    } else {
      autoCount += 1;
    }
  }

  skillIds.sort();
  return { totalSkills: skillIds.length, autoCount, manualCount, skillIds };
}

function readPresetMcpSummary(projectRoot) {
  const raw = fs.readFileSync(path.join(projectRoot, PRESET_PATH), "utf8");
  // Cordis expressions are data here. Never evaluate !!js while auditing declarations.
  const rows = readYaml(raw, PRESET_PATH, [{ tag: "tag:yaml.org,2002:js", resolve: expression => ({ expression }) }]);
  const activation = { always: 0, conditional: 0, "opt-in": 0 };
  const serverNames = [];

  for (const row of rows) {
    if (!row.config?.serverName) continue;
    serverNames.push(row.config.serverName);
    if (row.disabled === true) {
      activation["opt-in"] += 1;
    } else if (row.disabled?.expression !== undefined) {
      activation.conditional += 1;
    } else {
      activation.always += 1;
    }
  }

  return { totalMcpConnections: serverNames.length, activation, serverNames };
}

function readSdkSummary(projectRoot) {
  const parsed = JSON.parse(fs.readFileSync(path.join(projectRoot, SDK_LIBRARIES_PATH), "utf8"));
  const libraries = parsed.libraries ?? [];
  const byLanguage = {};
  let nativeOnly = 0;
  for (const lib of libraries) {
    const lang = lib.language ?? "python";
    byLanguage[lang] = (byLanguage[lang] ?? 0) + 1;
    if (lib.nativeOnly) nativeOnly += 1;
  }
  return { totalSdkEnvironments: libraries.length, nativeOnly, byLanguage };
}

export function collectExtensionGovernanceMetrics(projectRoot = process.cwd()) {
  const policy = readPolicySummary(projectRoot);
  const skills = readSkillSummary(projectRoot);
  const mcp = readPresetMcpSummary(projectRoot);
  const sdk = readSdkSummary(projectRoot);

  const skillSet = new Set(skills.skillIds);
  const toolOnlyCapabilities = policy.ids.filter(id => !skillSet.has(id)).sort();

  return {
    capabilities: policy.packageCount,
    levels: policy.levels,
    toolOnlyCapabilities,
    skills: {
      total: skills.totalSkills,
      auto: skills.autoCount,
      manual: skills.manualCount,
    },
    mcp: {
      total: mcp.totalMcpConnections,
      always: mcp.activation.always,
      conditional: mcp.activation.conditional,
      optIn: mcp.activation["opt-in"],
      policyTools: policy.mcpToolCount,
    },
    sdk: {
      total: sdk.totalSdkEnvironments,
      nativeOnly: sdk.nativeOnly,
      byLanguage: sdk.byLanguage,
    },
  };
}

export function validateExtensionGovernanceMetrics(metrics) {
  const issues = [];
  const sum = values => Object.values(values).reduce((total, value) => total + value, 0);
  const checks = [
    ["capability levels", sum(metrics.levels), metrics.capabilities],
    ["Skill activation", metrics.skills.auto + metrics.skills.manual, metrics.skills.total],
    ["Skills + Tool-only capabilities", metrics.skills.total + metrics.toolOnlyCapabilities.length, metrics.capabilities],
    ["MCP activation", metrics.mcp.always + metrics.mcp.conditional + metrics.mcp.optIn, metrics.mcp.total],
    ["SDK languages", sum(metrics.sdk.byLanguage), metrics.sdk.total],
  ];
  for (const [label, actual, expected] of checks) {
    if (actual !== expected) issues.push(`${label}: sum ${actual} does not match total ${expected}`);
  }
  return { status: issues.length === 0 ? "pass" : "fail", metrics, issues };
}

export function checkExtensionGovernance(projectRoot = process.cwd()) {
  return validateExtensionGovernanceMetrics(collectExtensionGovernanceMetrics(projectRoot));
}

function formatMarkdown(metrics) {
  const langs = Object.entries(metrics.sdk.byLanguage)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}=${v}`)
    .join("、");
  return [
    `| 维度 | 当前统计 | 说明 |`,
    `| --- | --- | --- |`,
    `| Capability 总数 | **${metrics.capabilities}** 个 Capability | \`L0=${metrics.levels.L0}\`、\`L1=${metrics.levels.L1}\`、\`L2=${metrics.levels.L2}\`、\`L3=${metrics.levels.L3}\`（含 ${metrics.toolOnlyCapabilities.length} 个 Tool-only 能力） |`,
    `| 内置 Skill | **${metrics.skills.total}** 个内置 Skill | ${metrics.skills.auto} 自动可选，${metrics.skills.manual} 手动分类索引（\`disable-model-invocation: true\`） |`,
    `| MCP 服务连接 | **${metrics.mcp.total}** 个 MCP 连接 | ${metrics.mcp.always + metrics.mcp.conditional} 个默认开启（其中 ${metrics.mcp.conditional} 项可通过离线开关关闭），${metrics.mcp.optIn} 个按需启用；策略登记 ${metrics.mcp.policyTools} 个 MCP Tool |`,
    `| SDK / 源码环境 | **${metrics.sdk.total}** 个 SDK/源码环境 | ${langs}；其中 \`nativeOnly=${metrics.sdk.nativeOnly}\` |`,
  ].join("\n");
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const args = new Set(process.argv.slice(2));
  const projectRoot = process.cwd();
  if (args.has("--check")) {
    const result = checkExtensionGovernance(projectRoot);
    if (result.status !== "pass") {
      console.error("Extension governance inconsistency detected:\n" + result.issues.map(i => `- ${i}`).join("\n"));
      process.exit(1);
    }
    console.log(JSON.stringify({ status: "pass", metrics: result.metrics }, null, 2));
  } else if (args.has("--markdown")) {
    console.log(formatMarkdown(collectExtensionGovernanceMetrics(projectRoot)));
  } else {
    console.log(JSON.stringify(collectExtensionGovernanceMetrics(projectRoot), null, 2));
  }
}
