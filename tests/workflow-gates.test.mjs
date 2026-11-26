import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import {
  REUSABLE_JULIA_WORKFLOW,
  REUSABLE_PYTHON_WORKFLOW,
  SDK_CHECKS_WORKFLOW,
  SDK_CI_TARGETS,
  matchesPattern,
  selectSdkTargets,
} from "../scripts/detect-sdk-ci-targets.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

async function runNumericalLogStep({ workflowPath, extraEnv, fixtureExecutable }) {
  const workflow = parse(await readFile(path.join(root, workflowPath), "utf8"));
  const job = workflow.jobs["native-sdk"];
  const step = job.steps.find(item => item.run?.includes("numerical.log"));
  assert.ok(step, `${workflowPath}: the numerical validation step must remain covered`);
  for (const config of [job, step]) {
    assert.ok(
      config["continue-on-error"] === undefined || config["continue-on-error"] === false,
      `${workflowPath}: numerical validation must fail the job on error`,
    );
  }
  const shell = step.shell ?? job.defaults?.run?.shell ?? workflow.defaults?.run?.shell;
  assert.ok(shell === undefined || shell === "bash", `Unsupported shell in regression: ${shell}`);
  // Match GitHub's runner templates: an implicit bash shell omits pipefail.
  const args = shell === "bash" ? ["--noprofile", "--norc", "-eo", "pipefail"] : ["-e"];
  return { args, run: step.run, extraEnv, fixtureExecutable };
}

for (const scenario of [
  {
    label: "reusable Python SDK (sandboxed)",
    workflowPath: REUSABLE_PYTHON_WORKFLOW,
    fixtureExecutable: "sandbox-exec",
    extraEnv: {
      SDK_ID: "ppvm-simulation",
      NUMERICAL_SCRIPT: "tests/fixtures/ppvm-validation.py",
      SANDBOX_NUMERICAL: "true",
    },
  },
  {
    label: "reusable Python SDK (direct)",
    workflowPath: REUSABLE_PYTHON_WORKFLOW,
    fixtureExecutable: "fake-python",
    extraEnv: {
      SDK_ID: "mwpf-decoding",
      NUMERICAL_SCRIPT: "tests/fixtures/mwpf-validation.py",
      SANDBOX_NUMERICAL: "false",
    },
  },
  {
    label: "reusable Julia SDK (sandboxed)",
    workflowPath: REUSABLE_JULIA_WORKFLOW,
    fixtureExecutable: "sandbox-exec",
    extraEnv: {
      SDK_ID: "rcmps-field-theory",
      VALIDATION_SCRIPT: "tests/fixtures/rcmps-validation.jl",
    },
  },
]) {
  test(`${scenario.label} numerical CI preserves computation status through log capture`, { skip: process.platform === "win32" }, async t => {
    const { args, run, extraEnv, fixtureExecutable } = await runNumericalLogStep(scenario);
    for (const status of [0, 23]) {
      await t.test(`computation exits ${status}`, async t => {
        const directory = await mkdtemp(path.join(tmpdir(), "oq-workflow-gate-"));
        t.after(() => rm(directory, { recursive: true, force: true }));
        await mkdir(path.join(directory, "bin"));
        const binPath = path.join(directory, "bin", fixtureExecutable);
        await writeFile(
          binPath,
          `#!/bin/bash\nprintf 'numerical fixture exit ${status}\\n' >&2\nexit ${status}\n`,
          { mode: 0o700 },
        );
        const script = path.join(directory, "run.sh");
        await writeFile(script, run);
        const env = {
          ...process.env,
          PATH: `${path.join(directory, "bin")}${path.delimiter}${process.env.PATH}`,
          GITHUB_WORKSPACE: directory,
          OPENQUANTUM_PYTHON_ENV_ROOT: path.join(directory, "python"),
          OPENQUANTUM_SDK_CHECK_OUTPUT: path.join(directory, "evidence"),
          ...extraEnv,
        };
        if (fixtureExecutable === "fake-python") {
          env.SDK_PYTHON = binPath;
        }
        const result = spawnSync("bash", [...args, script], {
          encoding: "utf8",
          timeout: 5000,
          env,
        });
        assert.ifError(result.error);
        assert.equal(result.status, status, `Log capture changed the computation exit status: ${result.stderr}`);
        assert.match(
          await readFile(path.join(directory, "evidence/numerical.log"), "utf8"),
          new RegExp(`numerical fixture exit ${status}`),
        );
      });
    }
  });
}

test("unified sdk-checks workflow stays aligned with SDK_CI_TARGETS and reusable templates", async () => {
  const sdkChecks = parse(await readFile(path.join(root, SDK_CHECKS_WORKFLOW), "utf8"));
  const targetNames = Object.keys(SDK_CI_TARGETS);

  assert.deepEqual(sdkChecks.on.workflow_dispatch.inputs.sdk.options, ["all", ...targetNames]);
  assert.equal(sdkChecks.on.workflow_call.inputs.targets.type, "string");
  assert.equal(sdkChecks.on.workflow_call.inputs.targets.required, true);
  assert.deepEqual(Object.keys(sdkChecks.jobs.changes.outputs), targetNames);

  const prPaths = sdkChecks.on.pull_request.paths;
  const pushPaths = sdkChecks.on.push.paths;
  assert.deepEqual(pushPaths, prPaths, "pull_request and push path filters must match");

  for (const requiredWorkflowFile of [
    SDK_CHECKS_WORKFLOW,
    REUSABLE_PYTHON_WORKFLOW,
    REUSABLE_JULIA_WORKFLOW,
    "scripts/detect-sdk-ci-targets.mjs",
  ]) {
    assert.ok(prPaths.includes(requiredWorkflowFile), `Missing trigger path: ${requiredWorkflowFile}`);
  }

  for (const [name, config] of Object.entries(SDK_CI_TARGETS)) {
    const job = sdkChecks.jobs[name];
    assert.ok(job, `Missing caller job for ${name}`);
    assert.equal(job.needs, "changes");
    assert.equal(job.if, `needs.changes.outputs.${name} == 'true'`);
    const expectedTemplate = config.template === "julia" ? `./${REUSABLE_JULIA_WORKFLOW}` : `./${REUSABLE_PYTHON_WORKFLOW}`;
    assert.equal(job.uses, expectedTemplate);
    await access(path.join(root, job.uses.slice(2)));

    for (const pattern of config.paths) {
      assert.ok(prPaths.includes(pattern), `sdk-checks.yml trigger missing pattern ${pattern} for ${name}`);
    }
  }
});

test("detect-sdk-ci-targets routes file changes, template updates and manual dispatches accurately", () => {
  assert.equal(matchesPattern(".agents/skills/mwpf-decoding/uv.lock", ".agents/skills/mwpf-decoding/**"), true);
  assert.equal(matchesPattern("tests/fixtures/ppvm-validation.py", "tests/fixtures/ppvm-*"), true);
  assert.equal(matchesPattern("tests/fixtures/sub/ppvm-validation.py", "tests/fixtures/ppvm-*"), false);

  const onlyBraket = selectSdkTargets({ changedFiles: [".agents/skills/braket-simulation/uv.lock"] });
  assert.equal(onlyBraket.braket, true);
  assert.equal(onlyBraket.mwpf, false);
  assert.equal(onlyBraket.rcmps, false);

  const onlyErasure = selectSdkTargets({ changedFiles: [".agents/skills/erasure-recovery/uv.lock"] });
  assert.equal(onlyErasure.erasure, true);
  assert.equal(onlyErasure.tropidist, false);
  assert.equal(onlyErasure.rcmps, false);

  const sharedSdk = selectSdkTargets({ changedFiles: [".agents/sdk-libraries.json"] });
  assert.equal(sharedSdk.tropidist, true);
  assert.equal(sharedSdk.stgrape, true);
  assert.equal(sharedSdk.erasure, true);
  assert.equal(sharedSdk.braket, false);

  const juliaTemplate = selectSdkTargets({ changedFiles: [REUSABLE_JULIA_WORKFLOW] });
  assert.equal(juliaTemplate.rcmps, true);
  assert.equal(juliaTemplate.tnqs, true);
  assert.equal(juliaTemplate.ppvm, false);

  const pythonTemplate = selectSdkTargets({ changedFiles: [REUSABLE_PYTHON_WORKFLOW] });
  assert.equal(pythonTemplate.mwpf, true);
  assert.equal(pythonTemplate.ppvm, true);
  assert.equal(pythonTemplate.pyzx, true);
  assert.equal(pythonTemplate.tropidist, true);
  assert.equal(pythonTemplate.stgrape, true);
  assert.equal(pythonTemplate.braket, true);
  assert.equal(pythonTemplate.erasure, true);
  assert.equal(pythonTemplate.rcmps, false);

  const dispatchOne = selectSdkTargets({ dispatchTarget: "tnqs" });
  assert.equal(dispatchOne.tnqs, true);
  assert.equal(dispatchOne.rcmps, false);

  const dispatchAll = selectSdkTargets({ dispatchTarget: "all" });
  assert.ok(Object.values(dispatchAll).every(Boolean));
  for (const file of [SDK_CHECKS_WORKFLOW, "scripts/detect-sdk-ci-targets.mjs"]) {
    assert.ok(Object.values(selectSdkTargets({ changedFiles: [file] })).every(Boolean), file);
  }

  assert.throws(() => selectSdkTargets({ dispatchTarget: "unknown-sdk" }), /Unknown SDK CI target/);
  assert.throws(() => selectSdkTargets({ dispatchTarget: "tropidist,unknown-sdk" }), /Unknown SDK CI target/);
});

test("release SDK detection runs exactly the three former CI checks with an empty event base", { skip: process.platform === "win32" }, async t => {
  const release = parse(await readFile(path.join(root, ".github/workflows/release-updates.yml"), "utf8"));
  const workflow = parse(await readFile(path.join(root, SDK_CHECKS_WORKFLOW), "utf8"));
  const detect = workflow.jobs.changes.steps.find(step => step.id === "detect");
  assert.equal(detect.env.DISPATCH_TARGET, "${{ inputs.targets || (github.event_name == 'workflow_dispatch' && inputs.sdk) || '' }}");
  const directory = await mkdtemp(path.join(tmpdir(), "oq-release-sdk-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = path.join(directory, "output");
  const result = spawnSync("bash", ["--noprofile", "--norc", "-e", "-c", detect.run], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, BASE_SHA: "", DISPATCH_TARGET: release.jobs["verify-sdk"].with.targets, GITHUB_OUTPUT: output },
    timeout: 5000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  const expected = Object.fromEntries(Object.keys(SDK_CI_TARGETS).map(name => [name, ["tropidist", "stgrape", "braket"].includes(name)]));
  assert.deepEqual(JSON.parse(result.stdout).selected, expected);
  assert.equal(await readFile(output, "utf8"), Object.entries(expected).map(([name, enabled]) => `${name}=${enabled}\n`).join(""));
});
