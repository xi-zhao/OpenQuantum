import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readSdkLibraries, describeSdk } from "../src/lib/sdk-access.mjs";
import { offlineProcess, isolatedEnvironment } from "./fixtures/sdk-engineering-process.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const libraries = (await readSdkLibraries(root)).filter(entry => entry.nativeOnly);
const enabled = process.env.OPENQUANTUM_ECOSYSTEM_CHECKS === "1";
const selected = process.env.OPENQUANTUM_SDK_IDS?.split(",");
if (selected?.some(id => !libraries.some(entry => entry.id === id))) throw new Error("Unknown ecosystem SDK check id");
const run = promisify(execFile);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");

for (const library of libraries) test(`SDK ecosystem: ${library.id}`, { skip: !enabled || (selected && !selected.includes(library.id)), timeout: 900000 }, async t => {
  const sdk = await describeSdk(root, library.id);
  assert.equal(sdk.environmentState, library.language === "julia" ? "requires_julia_check" : "prepared", "Explicit setup must succeed before API execution");
  const parent = process.env.OPENQUANTUM_SDK_CHECK_OUTPUT || os.tmpdir();
  await fs.mkdir(parent, { recursive: true });
  const output = await fs.mkdtemp(path.join(parent, `${library.id}-`));
  if (!process.env.OPENQUANTUM_SDK_CHECK_OUTPUT) t.after(() => fs.rm(output, { recursive: true, force: true }));
  const extension = { python: "py", julia: "jl", native: "qsyn" }[library.language];
  const source = await fs.readFile(path.join(sdk.project, `references/native-example.${extension}`));
  await fs.writeFile(path.join(output, `program.${extension}`), source);
  await fs.writeFile(path.join(output, "attempt.json"), JSON.stringify({ id: library.id, startedAt: new Date().toISOString(), dependencyLockSha256: sdk.lock.sha256, sourceSha256: hash(source), scientificValidation: "not_evaluated" }, null, 2));
  await fs.mkdir(path.join(output, "home"));
  const environment = { ...isolatedEnvironment(output, path), JAX_PLATFORMS: "cpu", JAX_ENABLE_X64: "true", QSHARP_PYTHON_TELEMETRY: "disabled", JULIA_NUM_PRECOMPILE_TASKS: "2", JULIA_PKG_PRECOMPILE_AUTO: "0", JULIA_PKG_OFFLINE: "true", ...(sdk.run.environment ?? {}) };
  let args;
  if (library.language === "python") {
    const runner = `import importlib, importlib.metadata, json, pathlib, runpy, sys
def offline(event, args):
    if event in ('socket.connect', 'socket.getaddrinfo'):
        raise RuntimeError('Unexpected network access in offline SDK verification')
sys.addaudithook(offline)
if __name__ == '__main__':
    runpy.run_path(sys.argv[1], run_name='__main__')
    for name in json.loads(sys.argv[2]):
        importlib.import_module(name)
    versions = {d.metadata['Name']: d.version for d in importlib.metadata.distributions() if d.metadata['Name']}
    pathlib.Path('versions.json').write_text(json.dumps(versions, sort_keys=True))
`;
    await fs.writeFile(path.join(output, "runner.py"), runner);
    args = ["-B", path.join(output, "runner.py"), path.join(output, "program.py"), JSON.stringify(sdk.modules)];
  } else if (library.language === "julia") {
    const runner = `VERSION == v"${library.juliaVersion}" || error("Wrong Julia runtime"); include(ARGS[1]); using Pkg, JSON3; write("versions.json", JSON3.write(Dict(info.name => string(info.version) for (_, info) in Pkg.dependencies() if info.version !== nothing)))`;
    args = ["--startup-file=no", `--project=${sdk.project}`, "-e", runner, path.join(output, "program.jl")];
  } else {
    await fs.copyFile(path.join(sdk.project, "references/input.qasm"), path.join(output, "input.qasm"));
    // Isolate the user's qsynrc and run only the saved native CLI program.
    await fs.writeFile(path.join(output, "empty.qsynrc"), "");
    args = ["--qsynrc-path", path.join(output, "empty.qsynrc"), path.join(output, "program.qsyn")];
  }
  const launch = offlineProcess(sdk.run.command, args);
  const verification = { id: library.id, dependencyLockSha256: sdk.lock.sha256, sourceSha256: hash(source), ...(sdk.nativeBuild ? { nativeExecutableSha256: sdk.nativeBuild.executableSha256 } : {}), networkIsolation: "macOS sandbox-exec deny network*", scientificValidation: "not_evaluated" };
  try {
    const result = await run(launch.command, launch.args, { cwd: output, env: environment, timeout: 840000, maxBuffer: 2 * 1024 * 1024 });
    await fs.writeFile(path.join(output, "stdout.log"), result.stdout);
    await fs.writeFile(path.join(output, "stderr.log"), result.stderr);
    if (library.language === "native") {
      const qasm = await fs.readFile(path.join(output, "result.qasm"), "utf8");
      assert.match(qasm, /OPENQASM 2\.0/);
      assert.match(qasm, /qreg/);
      const reference = process.env.OPENQUANTUM_QASM_REFERENCE_PYTHON;
      assert.ok(reference, "Provide an isolated Qiskit interpreter for the native compiler's independent QASM check");
      const referenceProgram = "from qiskit import qasm2; from qiskit.quantum_info import Operator; import json; a=qasm2.load('input.qasm'); b=qasm2.load('result.qasm'); assert Operator(a).equiv(Operator(b)); json.dump({'equivalence':'up_to_global_phase','reference':'Qiskit dense Operator','scientificValidation':'not_evaluated'},open('equivalence.json','w'))";
      const referenceLaunch = offlineProcess(reference, ["-B", "-c", referenceProgram]);
      await run(referenceLaunch.command, referenceLaunch.args, { cwd: output, env: environment, timeout: 60000 });
    } else {
      const value = JSON.parse(await fs.readFile(path.join(output, "result.json"), "utf8"));
      assert.equal(value.scientificValidation, "not_evaluated");
      assert.ok(Object.keys(value).length > 1);
    }
    const files = {};
    for (const item of await fs.readdir(output, { withFileTypes: true })) if (item.isFile()) files[item.name] = hash(await fs.readFile(path.join(output, item.name)));
    await fs.writeFile(path.join(output, "verification.json"), JSON.stringify({ ...verification, status: "passed", files }, null, 2));
    t.diagnostic(`Evidence: ${output}`);
  } catch (error) {
    if (error.stdout !== undefined) await fs.writeFile(path.join(output, "stdout.log"), error.stdout);
    if (error.stderr !== undefined) await fs.writeFile(path.join(output, "stderr.log"), error.stderr);
    await fs.writeFile(path.join(output, "verification.json"), JSON.stringify({ ...verification, status: "failed", error: error.message }, null, 2));
    t.diagnostic(`Failure retained: ${output}`);
    throw error;
  }
});
