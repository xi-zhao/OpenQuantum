import assert from "node:assert/strict";
import test from "node:test";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { ExternalSessions } from "../runtime/chatgpt/external/client.mjs";
import { externalMcp } from "../runtime/chatgpt/external/catalog.mjs";
import { externalPaths } from "../runtime/chatgpt/external/setup.mjs";

// Explicit opt-in: uses already prepared fixed environments; never installs,
// reads host credentials or submits a cloud quantum job.
const live = process.env.OPENQUANTUM_EXTERNAL_LIVE === "1";
const root = fileURLToPath(new URL("../", import.meta.url));
const execute = promisify(execFile);

function realSession(t, id) {
  const entry = externalMcp(id), pool = new ExternalSessions({ root });
  t.after(() => pool.close());
  const options = { authorize: async () => true,
    values: async () => ({ OPENQUANTUM_PYTHON_ENV_ROOT: process.env.OPENQUANTUM_PYTHON_ENV_ROOT }),
    acquire: async () => ({ release: async () => {} }) };
  let sessionId;
  return { pool, entry, call: async (operation, args = {}) => {
    const result = await pool.call(entry, { operation, arguments: args, ...(sessionId ? { sessionId } : {}) }, options);
    assert.ok(!result.isError, JSON.stringify(result));
    const metadata = JSON.parse(result.content.at(-1).text);
    sessionId = metadata.sessionId ?? sessionId;
    const value = result.structuredContent ?? JSON.parse(result.content[0].text);
    return { value, metadata };
  } };
}

test("real Origin JSON observables create continuous bindings and closing invalidates them", { skip: !live, timeout: 120000 }, async t => {
  const session = realSession(t, "qpanda_runtime");
  const created = await session.call("create_circuit_observable_binding_tool", {
    circuits: ["QINIT 2\nCREG 2\nH q[0]\nCNOT q[0],q[1]"],
    observables: [{ "Z0 Z1": 0.5, X0: -0.3 }, "Z1"],
  });
  assert.equal(created.value.num_observables, 2);
  const bindingId = created.value.binding_id;
  const rule = await session.call("add_product_rule_tool", { binding_id: bindingId, circuit_indices: [0], observable_indices: [0, 1] });
  assert.equal(rule.value.combinations_added, 2);
  assert.ok((await session.call("list_bindings_tool")).value.bindings.some(item => item.binding_id === bindingId));
  await session.pool.close();
  await assert.rejects(session.call("list_bindings_tool"), /连接已关闭/);
});

async function unusedPort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test("real Gym TensorBoard stop preserves state and training cancellation reaps its process", { skip: !live, timeout: 120000 }, async t => {
  const session = realSession(t, "qiskit_gym");
  const created = await session.call("create_permutation_env_tool", { coupling_map: [[0, 1], [1, 0]] });
  const port = await unusedPort();
  await session.call("start_tensorboard_tool", { port });
  assert.equal((await session.call("get_tensorboard_status_tool")).value.running, true);
  await session.call("stop_tensorboard_tool");
  assert.equal((await session.call("get_tensorboard_status_tool")).value.running, false);
  assert.ok(JSON.stringify((await session.call("list_environments_tool")).value).includes(created.value.env_id));
  const training = await session.call("start_training_tool", { env_id: created.value.env_id, num_iterations: 10000, background: true });
  let current;
  const deadline = Date.now() + 30000;
  do {
    current = await session.call("get_training_status_tool", { session_id: training.value.session_id });
    if (current.value.training_status !== "pending") break;
    await delay(100);
  } while (Date.now() < deadline);
  assert.equal(current.value.training_status, "running");
  let pid;
  if (process.platform !== "win32") {
    const directory = externalPaths(root, session.entry.id).directory;
    const { stdout } = await execute("ps", ["-axo", "pid=,command="]);
    const owned = stdout.split("\n").filter(line => line.includes("launch.py qiskit_gym ") && line.includes(directory) && !line.includes("process.mjs"));
    assert.equal(owned.length, 1, "identify only this test's scientific process");
    pid = Number(owned[0].trim().split(/\s+/)[0]);
  }
  assert.equal((await session.call("stop_training_tool", { session_id: training.value.session_id })).metadata.sessionClosed, true);
  assert.equal(session.pool.sessions.size, 0);
  if (pid) {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      try { process.kill(pid, 0); } catch (error) { if (error.code === "ESRCH") return; throw error; }
      await delay(50);
    }
    assert.fail("Gym process survived cancellation");
  }
});

test("real Origin transport validates TLS identity and refuses redirects and HTTP", { skip: !live, timeout: 30000 }, async () => {
  const { python } = externalPaths(root, "qpanda_runtime");
  const { stdout } = await execute(python, ["-B", path.join(root, "tests/helpers/qpanda-tls-check.py")]);
  assert.deepEqual(JSON.parse(stdout), { untrusted_rejected: true, hostname_mismatch_rejected: true, trusted_ca_passed: true, redirect_rejected: true, http_rejected: true });
});

test("real Origin SDK preserves observables, rejects invalid rules and reports task failures", { skip: !live, timeout: 30000 }, async () => {
  const { python } = externalPaths(root, "qpanda_runtime");
  const { stdout } = await execute(python, ["-B", path.join(root, "tests/helpers/qpanda-observables-check.py")]);
  assert.deepEqual(JSON.parse(stdout), { estimate: true, batch_estimate: true, signed_coefficients: true,
    invalid_rules_unchanged: true, terminal_states: true, partial_failure: true, cloud_requests: 0 });
});
