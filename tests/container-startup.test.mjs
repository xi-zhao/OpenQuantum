import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { parse } from "yaml";

const exec = promisify(execFile);
const workflow = parse(await readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"));
const smoke = workflow.jobs["container-smoke"].steps.find(step => step.name === "Build and boot the production image").run;

for (const scenario of ["delayed", "exited", "missing"]) {
  test(`container smoke waits for authenticated startup: ${scenario}`, { skip: process.platform === "win32", timeout: 15_000 }, async t => {
    const root = await mkdtemp(path.join(tmpdir(), "oq-container-startup-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    // Exercise the actual CI shell gate: an HTTP listener can be healthy while
    // the upstream loader is still starting plugins and has not printed a URL.
    await writeFile(path.join(root, "docker"), `#!/bin/bash
case "$1" in
  build|run|rm) exit 0 ;;
  inspect)
    if [[ "$3" == *Health* ]]; then echo healthy
    elif [[ "$SCENARIO" == exited ]]; then echo false
    else echo true; fi ;;
  logs)
    count=$(cat "$STATE" 2>/dev/null || echo 0)
    count=$((count + 1)); echo "$count" > "$STATE"
    if [[ "$SCENARIO" == delayed && "$count" -ge 3 ]]; then
      echo 'dsh web: http://127.0.0.1:3000/?token=fixture-not-a-secret'
    else echo 'Host listener started'; fi ;;
  exec)
    input=$(cat)
    [[ "$input" == *'?token=fixture-not-a-secret'* ]] || exit 42
    echo 'authenticated host verified' ;;
  *) exit 43 ;;
esac
`, { mode: 0o700 });
    await writeFile(path.join(root, "sleep"), "#!/bin/bash\nexit 0\n", { mode: 0o700 });
    const options = { env: { ...process.env, PATH: `${root}${path.delimiter}${process.env.PATH}`, STATE: path.join(root, "count"), SCENARIO: scenario } };
    if (scenario === "delayed") {
      const { stdout } = await exec("bash", ["-c", smoke], options);
      assert.match(stdout, /authenticated host verified/);
      assert.doesNotMatch(stdout, /fixture-not-a-secret/, "cleanup must redact the launch token");
    } else {
      await assert.rejects(exec("bash", ["-c", smoke], options), error => {
        assert.match(error.stderr, scenario === "exited" ? /container exited/ : /did not become ready/);
        assert.doesNotMatch(error.stdout, /authenticated host verified/);
        return true;
      });
    }
  });
}
