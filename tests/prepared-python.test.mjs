import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { preparedPythonLaunch, pythonEnvironmentRoot } from "../src/lib/prepared-python.mjs";
import { preparePythonFixture } from "./helpers/prepared-python.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const digest = value => createHash("sha256").update(value).digest("hex");

test("FieldQKit discovery rejects unprepared dependencies and executes prepared Python with uv disabled", {
  skip: process.platform === "win32" ? "POSIX interpreter fixture" : false,
}, async t => {
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-fieldqkit-prepared-"));
  const client = new Client({ name: "fieldqkit-preparation-fixture", version: "1" }, { capabilities: {} });
  t.after(async () => { await client.close(); await rm(sandbox, { recursive: true, force: true }); });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills/fieldqkit-hardware/mcp/server.mjs")],
    env: { ...process.env, OPENQUANTUM_PYTHON_ENV_ROOT: path.join(sandbox, "python-envs"), PATH: `${sandbox}${path.delimiter}${process.env.PATH}` } }));
  const call = () => client.callTool({ name: "discover_fieldqkit_backends", arguments: { provider: "simulator", numQubits: 2 } });
  assert.match(JSON.stringify(await call()), /setup-paper-tools.mjs fieldqkit-hardware/);
  const executable = path.join(sandbox, "uv");
  await writeFile(executable, `#!${process.execPath}\nprocess.stdout.write(JSON.stringify({provider:'simulator', requestedQubits:2, backends:[]}));\n`);
  await preparePythonFixture({ root, sandbox, id: "fieldqkit-hardware", executable });
  assert.equal((await call()).isError, undefined);
  await writeFile(path.join(sandbox, "python-envs/fieldqkit-hardware/openquantum-lock.sha256"), "old-lock");
  assert.match(JSON.stringify(await call()), /missing or stale/);
});

test("prepared launch rejects absent, legacy-unverified and stale environments without installing", async t => {
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-prepared-python-"));
  t.after(() => rm(sandbox, { recursive: true, force: true }));
  const id = "example";
  const skillRoot = path.join(sandbox, ".agents/skills", id);
  const directory = pythonEnvironmentRoot(sandbox, id, {});
  assert.equal(directory, path.join(sandbox, ".openquantum/python-envs", id));
  const python = path.join(directory, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  const marker = path.join(directory, "openquantum-lock.sha256");
  await mkdir(skillRoot, { recursive: true });
  await writeFile(path.join(skillRoot, "uv.lock"), "locked dependencies");
  const launch = () => preparedPythonLaunch({ skillRoot, environment: {} });
  await assert.rejects(launch(), /setup-paper-tools.mjs example/);
  await mkdir(path.dirname(python), { recursive: true });
  await writeFile(python, "existing environment");
  await chmod(python, 0o755);
  await assert.rejects(launch(), /missing or stale/);
  await writeFile(marker, "old-lock");
  await assert.rejects(launch(), /missing or stale/);
  await writeFile(marker, digest("locked dependencies") + "\n");
  assert.deepEqual((await launch()).args, ["-B", path.join(skillRoot, "mcp/bridge.py")]);
  assert.equal((await launch()).command, python);
  await assert.rejects(preparedPythonLaunch({ skillRoot, environment: {}, dependencyLockSha256: "old-running-server" }), /restart the connection/);
  assert.equal(await readFile(python, "utf8"), "existing environment");
  await rm(python);
  await assert.rejects(launch(), /Prepared Python missing/);
  assert.equal(pythonEnvironmentRoot(sandbox, id, { OPENQUANTUM_PYTHON_ENV_ROOT: sandbox }), path.join(sandbox, id));
});

test("explicit setup reuses an existing environment, attests its lock, invalidates failures and recovers", {
  skip: process.platform === "win32" ? "POSIX installer fixture" : false,
}, async t => {
  const sandbox = await mkdtemp(path.join(tmpdir(), "oq-prepared-setup-"));
  t.after(() => rm(sandbox, { recursive: true, force: true }));
  const id = "fieldqkit-hardware";
  const directory = path.join(sandbox, "envs", id);
  const python = path.join(directory, "bin/python");
  const marker = path.join(directory, "openquantum-lock.sha256");
  const mode = path.join(sandbox, "mode");
  const observed = path.join(sandbox, "observed.json");
  await mkdir(path.dirname(python), { recursive: true });
  await writeFile(python, "retain installed interpreter");
  await chmod(python, 0o755);
  await writeFile(mode, "success");
  await writeFile(path.join(sandbox, "uv"), `#!${process.execPath}
const fs = require('node:fs');
fs.writeFileSync(${JSON.stringify(observed)}, JSON.stringify({ args: process.argv.slice(2), environment: process.env, markerPresent: fs.existsSync(${JSON.stringify(marker)}) }));
if (fs.readFileSync(${JSON.stringify(mode)}, 'utf8') === 'fail') process.exit(2);
`);
  await chmod(path.join(sandbox, "uv"), 0o755);
  const setup = (selected = id) => spawnSync(process.execPath, ["scripts/setup-paper-tools.mjs", selected], {
    cwd: root, encoding: "utf8", env: { ...process.env, PATH: `${sandbox}${path.delimiter}${process.env.PATH}`, OPENQUANTUM_PYTHON_ENV_ROOT: path.join(sandbox, "envs"), OPENAI_API_KEY: "must-not-reach-installer" },
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = setup();
    assert.equal(result.status, 0, result.stderr);
    assert.equal((await readFile(marker, "utf8")).trim(), digest(await readFile(path.join(root, ".agents/skills", id, "uv.lock"))));
    const observation = JSON.parse(await readFile(observed, "utf8"));
    assert.equal(observation.markerPresent, false);
    assert.equal(observation.environment.OPENAI_API_KEY, undefined);
    assert.equal(observation.environment.UV_PROJECT_ENVIRONMENT, directory);
    assert.ok(observation.args.includes("--frozen"));
    assert.equal(await readFile(python, "utf8"), "retain installed interpreter");
  }
  assert.notEqual(setup("not-a-capability").status, 0);
  assert.ok(await readFile(marker));
  await writeFile(mode, "fail");
  assert.notEqual(setup().status, 0);
  await assert.rejects(readFile(marker), { code: "ENOENT" });
  await writeFile(mode, "success");
  assert.equal(setup().status, 0);
  assert.ok(await readFile(marker));
});
