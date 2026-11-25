import { isMainModule } from "../src/lib/cli-entrypoint.mjs";
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

export const REUSABLE_PYTHON_WORKFLOW = ".github/workflows/_reusable-python-sdk.yml";
export const REUSABLE_JULIA_WORKFLOW = ".github/workflows/_reusable-julia-sdk.yml";
export const SDK_CHECKS_WORKFLOW = ".github/workflows/sdk-checks.yml";

export const SDK_CI_TARGETS = Object.freeze({
  mwpf: Object.freeze({
    template: "python",
    paths: Object.freeze([
      ".agents/skills/mwpf-decoding/**",
      "tests/fixtures/mwpf-validation.py",
      "tests/mwpf-decoding-live.test.mjs",
    ]),
  }),
  ppvm: Object.freeze({
    template: "python",
    paths: Object.freeze([
      ".agents/skills/ppvm-simulation/**",
      "tests/fixtures/ppvm-*",
      "tests/ppvm-*",
    ]),
  }),
  pyzx: Object.freeze({
    template: "python",
    paths: Object.freeze([
      ".agents/skills/pyzx-optimization/**",
      "benchmarks/upstream-updates/pyzx_regressions.py",
      "tests/unitary-next-live.test.mjs",
    ]),
  }),
  tropidist: Object.freeze({
    template: "python",
    paths: Object.freeze([
      ".agents/skills/tropidist-distance/**",
      ".agents/sdk-libraries.json",
      "src/lib/sdk-source.mjs",
      "src/lib/sdk-source-record.mjs",
      "src/lib/sdk-access.mjs",
      "src/lib/sdk_bootstrap.py",
      "src/lib/tropidist-build.mjs",
      "scripts/setup-sdk.mjs",
      "tests/tropidist-*",
    ]),
  }),
  stgrape: Object.freeze({
    template: "python",
    paths: Object.freeze([
      ".agents/skills/stgrape-control/**",
      ".agents/sdk-libraries.json",
      "scripts/setup-sdk.mjs",
      "scripts/setup-paper-tools.mjs",
      "tests/stgrape-control-live.test.mjs",
      "tests/fixtures/stgrape-validation.py",
    ]),
  }),
  braket: Object.freeze({
    template: "python",
    paths: Object.freeze([
      ".agents/skills/braket-simulation/**",
      "scripts/setup-paper-tools.mjs",
      "src/lib/prepared-python.mjs",
      "src/lib/sdk_expansion_circuits.py",
      "tests/sdk-expansion-circuits-live.test.mjs",
      "tests/fixtures/sdk_expansion_circuits_science.py",
    ]),
  }),
  rcmps: Object.freeze({
    template: "julia",
    paths: Object.freeze([
      ".agents/skills/rcmps-field-theory/**",
      "tests/fixtures/rcmps-*",
      "tests/rcmps-*",
    ]),
  }),
  tnqs: Object.freeze({
    template: "julia",
    paths: Object.freeze([
      ".agents/skills/tnqs-dynamics/**",
      "tests/fixtures/tnqs-*",
      "tests/tnqs-*",
    ]),
  }),
});

export function matchesPattern(filePath, pattern) {
  const normalized = filePath.replaceAll("\\", "/").replace(/^\.\//, "");
  if (pattern.endsWith("/**")) {
    const prefix = pattern.slice(0, -3);
    return normalized === prefix || normalized.startsWith(`${prefix}/`);
  }
  if (pattern.includes("*")) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", "[^/]*");
    return new RegExp(`^${escaped}$`).test(normalized);
  }
  return normalized === pattern;
}

export function selectSdkTargets({ changedFiles = [], dispatchTarget = "" } = {}) {
  const names = Object.keys(SDK_CI_TARGETS);
  const selected = Object.fromEntries(names.map(name => [name, false]));

  if (dispatchTarget) {
    if (dispatchTarget === "all") {
      for (const name of names) selected[name] = true;
      return selected;
    }
    for (const target of dispatchTarget.split(",").map(value => value.trim())) {
      if (!Object.hasOwn(SDK_CI_TARGETS, target)) {
        throw new Error(`Unknown SDK CI target: ${target}`);
      }
      selected[target] = true;
    }
    return selected;
  }

  const normalizedFiles = changedFiles.map(file => file.replaceAll("\\", "/").replace(/^\.\//, ""));
  if (normalizedFiles.includes(SDK_CHECKS_WORKFLOW) || normalizedFiles.includes("scripts/detect-sdk-ci-targets.mjs")) {
    for (const name of names) selected[name] = true;
    return selected;
  }
  const pythonTemplateChanged = normalizedFiles.includes(REUSABLE_PYTHON_WORKFLOW);
  const juliaTemplateChanged = normalizedFiles.includes(REUSABLE_JULIA_WORKFLOW);

  for (const [name, config] of Object.entries(SDK_CI_TARGETS)) {
    if (config.template === "python" && pythonTemplateChanged) {
      selected[name] = true;
      continue;
    }
    if (config.template === "julia" && juliaTemplateChanged) {
      selected[name] = true;
      continue;
    }
    selected[name] = normalizedFiles.some(file =>
      config.paths.some(pattern => matchesPattern(file, pattern)),
    );
  }
  return selected;
}

function readChangedFiles({ base, head, cwd }) {
  const isZeroSha = !base || /^0+$/.test(base);
  const rangeBase = isZeroSha ? `${head}~1` : base;
  const output = execFileSync("git", ["diff", "--name-only", rangeBase, head], {
    cwd,
    encoding: "utf8",
  });
  return output.split(/\r?\n/).filter(Boolean);
}

function parseArgs(argv) {
  const options = { base: "", head: "HEAD", dispatch: "", githubOutput: "" };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--base") options.base = argv[++i] ?? "";
    else if (arg === "--head") options.head = argv[++i] ?? "HEAD";
    else if (arg === "--dispatch") options.dispatch = argv[++i] ?? "";
    else if (arg === "--github-output") options.githubOutput = argv[++i] ?? "";
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  return options;
}

if (isMainModule(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  const changedFiles = options.dispatch
    ? []
    : readChangedFiles({ base: options.base, head: options.head, cwd: process.cwd() });
  const selected = selectSdkTargets({ changedFiles, dispatchTarget: options.dispatch });
  if (options.githubOutput) {
    const lines = Object.entries(selected).map(([name, enabled]) => `${name}=${enabled}\n`).join("");
    appendFileSync(options.githubOutput, lines, "utf8");
  }
  process.stdout.write(`${JSON.stringify({ selected, changedFileCount: changedFiles.length }, null, 2)}\n`);
}
