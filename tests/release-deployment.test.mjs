import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("CI builds and boots the production container before release", async () => {
  const [workflow, dockerfile, compose, manifest] = await Promise.all([
    readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"),
    readFile(new URL("../Dockerfile", import.meta.url), "utf8"),
    readFile(new URL("../docker-compose.yml", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
  ]);

  assert.match(workflow, /^ {2}container-smoke:/m);
  assert.match(workflow, /docker build --tag openquantum-ci/);
  assert.match(workflow, /docker run --detach/);
  assert.match(workflow, /--network host/);
  assert.doesNotMatch(workflow, /--publish/);
  assert.doesNotMatch(workflow, /docker run --detach --rm/);
  assert.match(workflow, /http:\/\/127\.0\.0\.1:3000\/api\/host\.describe/);
  assert.match(workflow, /docker logs openquantum-ci/);
  assert.match(workflow, /docker rm --force openquantum-ci/);
  assert.match(dockerfile, /AS production-dependencies/);
  assert.match(dockerfile, /g\+\+ make python3/);
  assert.match(dockerfile, /npm ci --omit=dev/);
  assert.match(
    dockerfile,
    /COPY --from=production-dependencies .*\/workspace\/node_modules/,
  );
  assert.doesNotMatch(dockerfile, /--host.*0\.0\.0\.0/);
  assert.match(compose, /network_mode: host/);
  assert.doesNotMatch(compose, /^\s+ports:/m);
  assert.equal(manifest.dependencies["dsh-plugin-desktop"], undefined);
  assert.equal(manifest.dependencies.electron, undefined);
});
