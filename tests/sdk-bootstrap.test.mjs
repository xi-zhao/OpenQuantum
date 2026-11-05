import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = fileURLToPath(new URL("../", import.meta.url));
const python = process.platform === "win32" ? "python" : "python3";

async function sourceFixture(t, id = "slowquant-response") {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "oq-source-fixture-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const source = path.join(directory, id);
  await fs.mkdir(source);
  const catalog = JSON.parse(await fs.readFile(path.join(root, ".agents/sdk-libraries.json")));
  const record = { ...catalog.libraries.find(entry => entry.id === id).sourceProject, files: {} };
  const save = () => fs.writeFile(path.join(source, "openquantum-source.json"), JSON.stringify(record));
  const launch = code => execFileSync(python, ["-B", "-c", `
import sys
sys.path.insert(0, ${JSON.stringify(path.join(root, "src/lib"))})
from sdk_bootstrap import prepare_sdk
${code}
`], { encoding: "utf8", env: { ...process.env, OPENQUANTUM_SDK_SOURCE_ROOT: directory } });
  return { source, record, save, launch };
}

test("source SDK bootstrap refuses an unprepared SlowQuant source without installing it", async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "oq-sdk-loader-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const output = execFileSync(python, ["-B", "-c", `
import sys
sys.path.insert(0, ${JSON.stringify(path.join(root, "src/lib"))})
from sdk_bootstrap import prepare_sdk
try:
    prepare_sdk("slowquant-response")
except FileNotFoundError:
    print("source_not_prepared")
else:
    raise AssertionError("missing source was silently accepted")
`], { encoding: "utf8", env: { ...process.env, OPENQUANTUM_SDK_SOURCE_ROOT: directory } });
  assert.equal(output.trim(), "source_not_prepared");
  assert.deepEqual(await fs.readdir(directory), []);
});

test("source SDK bootstrap rejects an empty manifest instead of trusting its revision", async t => {
  const fixture = await sourceFixture(t);
  await fixture.save();
  const output = fixture.launch(`
try:
    prepare_sdk("slowquant-response")
except RuntimeError:
    print("source_not_prepared")
else:
    raise AssertionError("empty source manifest was accepted")
`);
  assert.equal(output.trim(), "source_not_prepared");
});

test("source SDK bootstrap refuses additional unrecorded Python input", async t => {
  const fixture = await sourceFixture(t);
  const text = "VALUE = 42\n";
  await fs.writeFile(path.join(fixture.source, "recorded.py"), text);
  fixture.record.files["recorded.py"] = createHash("sha256").update(text).digest("hex");
  await fs.writeFile(path.join(fixture.source, "unexpected.py"), "raise RuntimeError('must not be loaded')\n");
  await fixture.save();
  const output = fixture.launch(`
try:
    prepare_sdk("slowquant-response")
except RuntimeError:
    print("source_changed")
else:
    raise AssertionError("unrecorded source was accepted")
`);
  assert.equal(output.trim(), "source_changed");
});

for (const id of ["flow-vqe", "slowquant-response"]) {
  test(`${id} imports recorded source and refuses changed bytes or revision`, async t => {
    const fixture = await sourceFixture(t, id);
    const text = "def identity(value):\n    return value\n";
    const file = path.join(fixture.source, "snapshot_module.py");
    await fs.writeFile(file, text);
    fixture.record.files["snapshot_module.py"] = createHash("sha256").update(text).digest("hex");
    await fixture.save();
    const program = `prepare_sdk(${JSON.stringify(id)})\nimport snapshot_module\nprint(snapshot_module.__file__)`;
    assert.equal(fixture.launch(program).trim(), file);
    await fs.writeFile(file, text + "# changed\n");
    assert.throws(() => fixture.launch(program), /source changed/);
    await fs.writeFile(file, text);
    fixture.record.revision = "0".repeat(40);
    await fixture.save();
    assert.throws(() => fixture.launch(program), /reviewed snapshot/);
  });
}
