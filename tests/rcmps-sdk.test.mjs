import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describeSdk } from "../src/lib/sdk-access.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

test("RcmpsCore discovery exposes the fixed CPU environment and an editable user program", async () => {
  const sdk = await describeSdk(root, "rcmps-field-theory");
  assert.equal(sdk.environmentState, "requires_julia_check");
  assert.equal(sdk.setup.effect, "workspace-write-and-download");
  assert.equal(sdk.run.args.at(-1), "<absolute-script.jl>");
  assert.ok(sdk.run.args.includes(`--project=${path.join(root, ".agents", "skills", "rcmps-field-theory")}`));
  assert.equal(sdk.scientificValidation, "not_evaluated");
  assert.ok(sdk.lockedPackages.some(pkg => pkg.name === "RcmpsCore" && pkg.version === "0.2.1"));
});
