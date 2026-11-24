import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const POLICY_PATH = ".agents/capability-packages.yml";
const PRESET_PATH = "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml";
const SDK_LIBRARIES_PATH = ".agents/sdk-libraries.json";
const SKILLS_DIR = ".agents/skills";
const GOVERNANCE_DOC_PATH = "docs/architecture/EXTENSION_GOVERNANCE.md";

function readPolicySummary(projectRoot) {
  const raw = fs.readFileSync(path.join(projectRoot, POLICY_PATH), "utf8");
  const blocks = raw.split(/\n(?=  - id: )/).slice(1);
  const levels = { L0: 0, L1: 0, L2: 0, L3: 0 };
  const ids = [];
  let mcpToolCount = 0;

  for (const block of blocks) {
    const idMatch = block.match(/^  - id:\s*(\S+)/);
    const levelMatch = block.match(/^    level:\s*(L[0-3])/m);
    if (idMatch) ids.push(idMatch[1]);
    if (levelMatch) levels[levelMatch[1]] += 1;

    const mcpSection = block.match(/(?:^|\n)      mcpServers:\n([\s\S]*?)(?=\n      [a-zA-Z]|$)/);
    if (mcpSection) {
      const toolMatches = mcpSection[1].match(/^            - name:\s*\S+/gm) ?? [];
      mcpToolCount += toolMatches.length;
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
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    if (/^disable-model-invocation:\s*true\s*$/m.test(frontmatter)) {
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
  const blocks = raw.split(/\n(?=- id: )/);
  const activation = { always: 0, conditional: 0, "opt-in": 0 };
  const serverNames = [];

  for (const block of blocks) {
    const serverMatch = block.match(/^\s+serverName:\s*(\S+)/m);
    if (!serverMatch) continue;
    serverNames.push(serverMatch[1]);
    if (/^\s*disabled:\s*true\b/m.test(block)) {
      activation["opt-in"] += 1;
    } else if (/^\s*disabled:\s*!!js\b/m.test(block)) {
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

export function checkGovernanceDocument(projectRoot = process.cwd()) {
  const metrics = collectExtensionGovernanceMetrics(projectRoot);
  const docPath = path.join(projectRoot, GOVERNANCE_DOC_PATH);
  const content = fs.readFileSync(docPath, "utf8");
  const issues = [];

  const requiredTokens = [
    ["capabilities", `**${metrics.capabilities}** 个 Capability`],
    ["levels", `L0=${metrics.levels.L0}`],
    ["levels", `L1=${metrics.levels.L1}`],
    ["levels", `L2=${metrics.levels.L2}`],
    ["levels", `L3=${metrics.levels.L3}`],
    ["skills", `**${metrics.skills.total}** 个内置 Skill`],
    ["auto/manual", `${metrics.skills.auto} 自动可选`],
    ["auto/manual", `${metrics.skills.manual} 手动分类索引`],
    ["mcp", `**${metrics.mcp.total}** 个 MCP 连接`],
    ["mcp activation", `${metrics.mcp.always} 默认开启`],
    ["mcp activation", `${metrics.mcp.conditional} 条件开关`],
    ["mcp activation", `${metrics.mcp.optIn} 按需启用`],
    ["sdk", `**${metrics.sdk.total}** 个 SDK/源码环境`],
    ["sdk nativeOnly", `nativeOnly=${metrics.sdk.nativeOnly}`],
  ];

  for (const [label, token] of requiredTokens) {
    if (!content.includes(token)) {
      issues.push(`${GOVERNANCE_DOC_PATH} is out of sync (${label}): expected "${token}"`);
    }
  }

  return { status: issues.length === 0 ? "pass" : "fail", metrics, issues };
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
    `| MCP 服务连接 | **${metrics.mcp.total}** 个 MCP 连接 | ${metrics.mcp.always} 默认开启、${metrics.mcp.conditional} 条件开关、${metrics.mcp.optIn} 按需启用；策略登记 ${metrics.mcp.policyTools} 个 MCP Tool |`,
    `| SDK / 源码环境 | **${metrics.sdk.total}** 个 SDK/源码环境 | ${langs}；其中 \`nativeOnly=${metrics.sdk.nativeOnly}\` |`,
  ].join("\n");
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const args = new Set(process.argv.slice(2));
  const projectRoot = process.cwd();
  if (args.has("--check")) {
    const result = checkGovernanceDocument(projectRoot);
    if (result.status !== "pass") {
      console.error("Extension governance drift detected:\n" + result.issues.map(i => `- ${i}`).join("\n"));
      process.exit(1);
    }
    console.log(JSON.stringify({ status: "pass", metrics: result.metrics }, null, 2));
  } else if (args.has("--markdown")) {
    console.log(formatMarkdown(collectExtensionGovernanceMetrics(projectRoot)));
  } else {
    console.log(JSON.stringify(collectExtensionGovernanceMetrics(projectRoot), null, 2));
  }
}
