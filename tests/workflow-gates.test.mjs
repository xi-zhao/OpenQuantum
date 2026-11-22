import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { parse } from "yaml";

for (const name of ["ppvm", "rcmps", "tnqs"]) {
  test(`${name} numerical CI preserves computation status through log capture`, { skip: process.platform === "win32" }, async t => {
    const workflow = parse(await readFile(new URL(`../.github/workflows/${name}-sdk.yml`, import.meta.url), "utf8"));
    const job = workflow.jobs["native-sdk"];
    const step = job.steps.find(item => item.run?.includes("numerical.log"));
    assert.ok(step, "The numerical validation step must remain covered");
    for (const config of [job, step]) {
      assert.ok(config["continue-on-error"] === undefined || config["continue-on-error"] === false,
        "Numerical validation must fail the job on error");
    }
    const shell = step.shell ?? job.defaults?.run?.shell ?? workflow.defaults?.run?.shell;
    assert.ok(shell === undefined || shell === "bash", `Unsupported shell in regression: ${shell}`);
    // Match GitHub's runner templates: an implicit bash shell omits pipefail.
    const args = shell === "bash" ? ["--noprofile", "--norc", "-eo", "pipefail"] : ["-e"];
    for (const status of [0, 23]) {
      await t.test(`computation exits ${status}`, async t => {
        const directory = await mkdtemp(path.join(tmpdir(), "oq-workflow-gate-"));
        t.after(() => rm(directory, { recursive: true, force: true }));
        await mkdir(path.join(directory, "bin"));
        await writeFile(path.join(directory, "bin/sandbox-exec"),
          `#!/bin/bash\nprintf 'numerical fixture exit ${status}\\n' >&2\nexit ${status}\n`, { mode: 0o700 });
        const script = path.join(directory, "run.sh");
        await writeFile(script, step.run);
        const result = spawnSync("bash", [...args, script], { encoding: "utf8", timeout: 5000,
          env: { ...process.env, PATH: `${path.join(directory, "bin")}${path.delimiter}${process.env.PATH}`,
            OPENQUANTUM_PYTHON_ENV_ROOT: path.join(directory, "python"),
            OPENQUANTUM_SDK_CHECK_OUTPUT: path.join(directory, "evidence") } });
        assert.ifError(result.error);
        assert.equal(result.status, status, `Log capture changed the computation exit status: ${result.stderr}`);
        assert.match(await readFile(path.join(directory, "evidence/numerical.log"), "utf8"),
          new RegExp(`numerical fixture exit ${status}`));
      });
    }
  });
}
