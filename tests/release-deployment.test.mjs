import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("CI builds and boots the production container before release", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/ci.yml", import.meta.url),
    "utf8",
  );

  assert.match(workflow, /^ {2}container-smoke:/m);
  assert.match(workflow, /docker build --tag openquantum-ci/);
  assert.match(workflow, /docker run --detach/);
  assert.match(workflow, /http:\/\/127\.0\.0\.1:3000\/api\/host\.describe/);
  assert.match(workflow, /docker stop openquantum-ci/);
});
