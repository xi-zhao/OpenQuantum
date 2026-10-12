import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { describeSdk } from "../src/lib/sdk-access.mjs";
import { circuitSdkCases } from "./fixtures/sdk-native-circuits.mjs";
import { physicsSdkCases } from "./fixtures/sdk-native-physics.mjs";
import { serviceSdkCases } from "./fixtures/sdk-native-services.mjs";
import { offlineProcess, isolatedEnvironment } from "./fixtures/sdk-engineering-process.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const run = promisify(execFile);
const enabled = process.env.OPENQUANTUM_NATIVE_SDK_CHECKS === "1";
const selected = process.env.OPENQUANTUM_SDK_IDS?.split(",");
export const remainingSdkCases = [...circuitSdkCases, ...physicsSdkCases, ...serviceSdkCases];
if (selected) for (const id of selected) {
  if (!remainingSdkCases.some(fixture => fixture.id === id)) throw new Error(`Unknown native SDK check id: ${id}`);
}

for (const fixture of remainingSdkCases) test(`native SDK remaining: ${fixture.id}`, {
  skip: !enabled || (selected && !selected.includes(fixture.id)), timeout: 340000,
}, async t => {
  const sdk = await describeSdk(root, fixture.id);
  const parent = process.env.OPENQUANTUM_SDK_CHECK_OUTPUT;
  if (parent) await fs.mkdir(path.resolve(parent), { recursive: true });
  const output = await fs.mkdtemp(path.join(parent ? path.resolve(parent) : os.tmpdir(), `${fixture.id}-`));
  if (!parent) t.after(() => fs.rm(output, { recursive: true, force: true }));
  await fs.writeFile(path.join(output, "attempt.json"), JSON.stringify({ id: fixture.id, startedAt: new Date().toISOString(),
    fixtureSha256: createHash("sha256").update(fixture.code).digest("hex"), dependencyLockSha256: sdk.lock.sha256 }), { flag: "wx" });
  assert.equal(sdk.environmentState, "prepared", `Explicitly prepare ${fixture.id} first`);
  const home = path.join(output, "home");
  await fs.mkdir(home);
  await fs.writeFile(path.join(output, "input.json"), JSON.stringify({ sizes: [3, 7] }));
  await fs.writeFile(path.join(output, "sdk.json"), JSON.stringify(sdk, null, 2));
  const program = path.join(output, "custom program.py");
  const evidence = path.join(root, ".agents/skills/quantum-sdk-workbench/references/evidence.py");
  const bootstrap = sdk.bootstrap ? `spec = importlib.util.spec_from_file_location('sdk_bootstrap', ${JSON.stringify(sdk.bootstrap.path)})\nloader = importlib.util.module_from_spec(spec)\nspec.loader.exec_module(loader)\nloader.prepare_sdk(${JSON.stringify(fixture.id)})\n` : "";
  const prelude = `import array, faulthandler, importlib, importlib.util, importlib.metadata, json, os, pathlib, sys
faulthandler.dump_traceback_later(90, repeat=True)
root = pathlib.Path(sys.argv[1])
output = pathlib.Path.cwd()
sizes = json.loads((output / 'input.json').read_text())['sizes']
models = []
network_attempts = []
def offline(event, args):
    if event in ('socket.connect', 'socket.getaddrinfo'):
        network_attempts.append(event)
        raise RuntimeError('This engineering fixture prohibits network access')
sys.addaudithook(offline)
`;
  const postlude = `
public_modules = json.loads((output / 'sdk.json').read_text())['modules']
for module_name in public_modules:
    importlib.import_module(module_name)
assert models and operations
assert not network_attempts, 'Import or construction attempted network access'
details = {'models': models, 'operations': operations, 'publicModules': public_modules, 'networkAttempts': network_attempts}
(output / 'api-objects.json').write_text(json.dumps(details))
with (output / 'full-array.bin').open('wb') as stream:
    array.array('d', range(393216)).tofile(stream)
spec = importlib.util.spec_from_file_location('evidence', sys.argv[2])
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
packages = sorted({d.metadata['Name'] for d in importlib.metadata.distributions() if d.metadata['Name']})
helper.write_evidence(output / 'execution.json', files=[f for f in output.iterdir() if f.is_file()], distributions=packages, argv=[sys.executable, *sys.argv], cwd=output, lock_sha256=sys.argv[3], execution_status='completed', backend='native public API engineering fixture; offline, no research task')
print(json.dumps({'status': 'completed', 'scientificValidation': 'not_evaluated'}))
faulthandler.cancel_dump_traceback_later()
`;
  await fs.writeFile(program, prelude + bootstrap + fixture.code + postlude);
  const environment = isolatedEnvironment(output, path);
  const launch = offlineProcess(sdk.run.command, ["-B", program, root, evidence, sdk.lock.sha256]);
  const checks = {};
  try {
    const result = await run(launch.command, launch.args, {
      cwd: output, timeout: 300000, maxBuffer: 2 * 1024 * 1024,
      env: environment,
    });
    await fs.writeFile(path.join(output, "stdout.log"), result.stdout);
    await fs.writeFile(path.join(output, "stderr.log"), result.stderr);
    assert.equal(JSON.parse(result.stdout.trim().split("\n").at(-1)).status, "completed");
    checks.programCompleted = true;
    const objects = JSON.parse(await fs.readFile(path.join(output, "api-objects.json")));
    assert.deepEqual(objects.publicModules, sdk.modules);
    checks.publicModules = true;
    const bytes = await fs.readFile(path.join(output, "execution.json"));
    const record = JSON.parse(bytes);
    assert.equal(record.dependencyLockSha256, sdk.lock.sha256);
    assert.equal(record.scientificValidation, "not_evaluated");
    checks.lockAndScienceBoundary = true;
    assert.ok((await fs.stat(path.join(output, "full-array.bin"))).size > 3_000_000);
    checks.completeArtifact = true;
    const failed = path.join(output, "failure.py");
    await fs.writeFile(failed, "from pathlib import Path\nPath('partial.txt').write_text('retained')\nraise ValueError('custom-program-error')\n");
    const failureLaunch = offlineProcess(sdk.run.command, ["-B", failed]);
    await assert.rejects(run(failureLaunch.command, failureLaunch.args, { cwd: output, env: environment, timeout: 10000 }), error => error.code === 1 && error.stderr.includes("custom-program-error"));
    checks.failureDiagnostic = true;
    assert.equal(await fs.readFile(path.join(output, "partial.txt"), "utf8"), "retained");
    checks.partialOutputRetained = true;
    await fs.writeFile(path.join(output, "verification.json"), JSON.stringify({ id: fixture.id, status: "passed", checks,
      fixtureSha256: createHash("sha256").update(fixture.code).digest("hex"),
      dependencyLockSha256: sdk.lock.sha256, executionRecordSha256: createHash("sha256").update(bytes).digest("hex"),
      networkIsolation: "macOS sandbox-exec deny network*; Python socket audit additionally detects attempted connections",
      scientificValidation: "not_evaluated" }, null, 2));
    t.diagnostic(`Evidence: ${output}`);
  } catch (error) {
    await fs.writeFile(path.join(output, "failure.json"), JSON.stringify({ code: error.code, signal: error.signal, killed: error.killed, message: error.message }, null, 2));
    if (error.stdout !== undefined) await fs.writeFile(path.join(output, "stdout.log"), error.stdout);
    if (error.stderr !== undefined) await fs.writeFile(path.join(output, "stderr.log"), error.stderr);
    await fs.writeFile(path.join(output, "verification.json"), JSON.stringify({ id: fixture.id, status: "failed", checks,
      dependencyLockSha256: sdk.lock.sha256, scientificValidation: "not_evaluated", error: error.message }, null, 2));
    t.diagnostic(`Failure evidence: ${output}`);
    throw error;
  }
});

test("native SDK network isolation covers TCP, UDP and child processes", { skip: !enabled, timeout: 20000 }, async () => {
  const sdk = await describeSdk(root, "quantum-algorithms");
  const source = "import socket,errno,subprocess,sys\nassert socket.socket().connect_ex(('127.0.0.1',9))==errno.EPERM\ns=socket.socket(socket.AF_INET,socket.SOCK_DGRAM)\ntry:\n s.sendto(b'probe',('127.0.0.1',9))\n raise AssertionError('UDP permitted')\nexcept PermissionError: pass\nsubprocess.run([sys.executable,'-c',\"import socket,errno; assert socket.socket().connect_ex(('127.0.0.1',9))==errno.EPERM\"],check=True)\n";
  const launch = offlineProcess(sdk.run.command, ["-B", "-c", source]);
  await run(launch.command, launch.args, { env: { PATH: process.env.PATH }, timeout: 10000 });
});
