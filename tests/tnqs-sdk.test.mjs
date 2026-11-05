import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { describeSdk } from "../src/lib/sdk-access.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

test("TNQS discovery exposes the fixed Julia environment without preparing or restricting user programs", async () => {
  const sdk = await describeSdk(root, "tnqs-dynamics");
  assert.equal(sdk.environmentState, "requires_julia_check");
  assert.equal(sdk.setup.effect, "workspace-write-and-download");
  assert.equal(sdk.run.args.at(-1), "<absolute-script.jl>");
  assert.ok(sdk.run.args.some(arg => arg.endsWith(".agents/skills/tnqs-dynamics")));
  assert.equal(sdk.scientificValidation, "not_evaluated");
  assert.ok(sdk.lockedPackages.some(pkg => pkg.name === "TensorNetworkQuantumSimulator" && pkg.version === "0.5.0"));
});
