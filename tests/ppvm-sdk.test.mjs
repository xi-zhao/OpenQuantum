import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { describeSdk } from "../src/lib/sdk-access.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

test("PPVM discovery exposes the fixed source SDK and explicit preparation without executing a program", async () => {
  const sdk = await describeSdk(root, "ppvm-simulation", {
    environment: { OPENQUANTUM_PYTHON_ENV_ROOT: ".openquantum/ppvm-discovery-test-unprepared" },
  });
  assert.equal(sdk.environmentState, "not_prepared");
  assert.equal(sdk.setup.effect, "workspace-write-and-download");
  assert.ok(sdk.setup.args.includes("ppvm-simulation"));
  assert.equal(sdk.apiAccess, "host-code");
  assert.deepEqual(sdk.modules, ["ppvm"]);
  assert.equal(sdk.scientificValidation, "not_evaluated");
  const locked = sdk.lockedPackages.find(pkg => pkg.name === "bloqade-ppvm");
  assert.equal(locked.version, "0.3.0");
  assert.match(locked.source.git, /3cc883fd93b2475cb10c892a8a31adcc09a7579c/);
});
