import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { loadProjectEnv } from "../scripts/lib/load-project-env.mjs";

test("source launchers load optional .env without replacing shell values", async (t) => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "openquantum-env-"));
  const loadedName = "OPENQUANTUM_TEST_ENV_FILE_VALUE";
  const preservedName = "OPENQUANTUM_TEST_ENV_SHELL_VALUE";
  const previousLoaded = process.env[loadedName];
  const previousPreserved = process.env[preservedName];

  t.after(async () => {
    if (previousLoaded === undefined) delete process.env[loadedName];
    else process.env[loadedName] = previousLoaded;
    if (previousPreserved === undefined) delete process.env[preservedName];
    else process.env[preservedName] = previousPreserved;
    await rm(projectRoot, { recursive: true, force: true });
  });

  delete process.env[loadedName];
  process.env[preservedName] = "from-shell";
  await writeFile(
    path.join(projectRoot, ".env"),
    `${loadedName}=from-file\n${preservedName}=from-file\n`,
  );

  assert.equal(loadProjectEnv(projectRoot), true);
  assert.equal(process.env[loadedName], "from-file");
  assert.equal(process.env[preservedName], "from-shell");
});

test("source launchers do not require an .env file", async (t) => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "openquantum-no-env-"));
  t.after(() => rm(projectRoot, { recursive: true, force: true }));

  assert.equal(loadProjectEnv(projectRoot), false);
});
