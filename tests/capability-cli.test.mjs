import assert from "node:assert/strict";
import test from "node:test";

import {
  listCapabilityGroups,
  resolveCapabilityAction,
} from "../scripts/capability-cli.mjs";

test("capability CLI discovers all declared capability groups and actions", () => {
  const groups = listCapabilityGroups();
  assert.ok(Object.keys(groups).length >= 20);
  assert.deepEqual(groups.hamiltonian, ["live", "setup", "test"]);
  assert.deepEqual(groups.algorithms, ["catalog", "live", "setup", "test"]);
  assert.deepEqual(groups["vendor-sdks"], ["live", "setup", "test"]);
});

test("capability CLI resolves valid actions and rejects unknown groups or actions", () => {
  assert.equal(
    resolveCapabilityAction({ action: "conformance" }).scriptName,
    "capability:conformance",
  );
  assert.equal(
    resolveCapabilityAction({ action: "contracts" }).scriptName,
    "capability:contracts:test",
  );
  assert.equal(
    resolveCapabilityAction({ action: "test", target: "mitiq" }).scriptName,
    "capability:mitiq:test",
  );
  assert.throws(
    () => resolveCapabilityAction({ action: "setup", target: "nonexistent-group" }),
    /Unknown capability group/,
  );
  assert.throws(
    () => resolveCapabilityAction({ action: "catalog", target: "mitiq" }),
    /does not support "catalog"/,
  );
  assert.throws(
    () => resolveCapabilityAction({ action: "test" }),
    /requires a capability group name/,
  );
});
