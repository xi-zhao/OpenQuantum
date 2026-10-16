import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import assert from "node:assert/strict";
import { desktopPreset } from "./lib/desktop-profile-config.mjs";
import { prepareOpenQuantumHarnessHome } from "./lib/prepare-harness-home.mjs";
import { harnessHttpCookie, harnessSessionSnapshot } from "./lib/harness-http-auth.mjs";

// Explicit local acceptance harness. It uses the unchanged configured model
// route. Its test-only answerer authorizes exactly the local Qiskit setup; no
// general approval, cloud submission, real hardware or credential is granted.
const root = fileURLToPath(new URL("..", import.meta.url));
const output = path.join(root, ".openquantum/desktop-native-acceptance");
const home = path.join(output, "host");
if (process.env.OPENQUANTUM_PROBE_ENV_FILE) process.loadEnvFile(process.env.OPENQUANTUM_PROBE_ENV_FILE);
await fs.mkdir(output, { recursive: true });
await prepareOpenQuantumHarnessHome({ projectRoot: root, harnessHome: home, profileName: "web" });
// Electron owns its reserved desktop profile. Exercise the identical native
// capability plugins in an isolated supported Web Host; keep the Electron
// composition and native-window acceptance as distinct evidence.
await fs.writeFile(path.join(home, ".agent-presets/openquantum/agent.cordis.yml"), desktopPreset(await fs.readFile(path.join(root, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml"), "utf8"), root, process.execPath, { onDemand: true }));
await fs.appendFile(path.join(home, "cordis.patch.yml"), "\n- insert:\n    - id: openquantum-capability-host\n      name: '@openquantum/harness-capability-host'\n      inject: [credentials, webServer]\n- id: openquantum-web-capabilities\n  config:\n    channels: false\n    adaptive: true\n");
const temporaryServer = createServer(); temporaryServer.listen(0, "127.0.0.1"); await once(temporaryServer, "listening");
const port = temporaryServer.address().port; await new Promise(resolve => temporaryServer.close(resolve));
const base = `http://127.0.0.1:${port}`;
const testPlugin = path.join(output, "approval-fixture.mjs");
await fs.writeFile(testPlugin, `export const name='openquantum-local-probe-approval';\nexport function apply(ctx) { ctx.on('approval/request', async (request, next) => {\n if (request.toolName !== 'prepare_openquantum_skill') return next();\n const calls = request.agent.session.snapshotEvents().filter(e => e.type === 'tool/call');\n const text = JSON.stringify(calls.findLast(e => JSON.stringify(e).includes(request.callId)) ?? {});\n return text.includes('qiskit-circuit-workbench') && text.includes('run_qiskit_circuit') ? 'allowed-once' : 'rejected';\n }); }\n`);
const patch = path.join(output, "probe.patch.yml");
await fs.writeFile(patch, `- insert:\n    - id: openquantum-local-probe-approval\n      name: ${JSON.stringify(testPlugin)}\n`);
await fs.appendFile(path.join(home, "cordis.patch.yml"), await fs.readFile(patch, "utf8"));
let logs = "", cookie, child;
async function rpc(method, payload = {}) {
  cookie ??= await harnessHttpCookie(base, logs);
  if (method === "session/prompt") payload = { requestId: crypto.randomUUID(), ...payload };
  const rpcId = crypto.randomUUID();
  const response = await fetch(`${base}/api/${method}`, { method: "POST", headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ type: "client-request", rpcId, method, payload: { args: ["session/modelCatalog", "agentPresets/list"].includes(method) ? {} : { request: payload } } }), signal: AbortSignal.timeout(30000) });
  const result = (await response.json()).result;
  if (!result?.ok) throw new Error(`Native RPC ${method} failed: ${JSON.stringify(result?.error)}`);
  return result.value;
}
async function waitFor(read, milliseconds = 180000) {
  const until = Date.now() + milliseconds;
  while (Date.now() < until) { const value = await read(); if (value) return value; await new Promise(resolve => setTimeout(resolve, 1000)); }
  throw new Error("Native acceptance timed out");
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM"); const force = setTimeout(() => child.kill("SIGKILL"), 10000);
  try { await once(child, "exit"); } finally { clearTimeout(force); }
}
process.once("SIGTERM", () => void stop()); process.once("SIGINT", () => void stop());
try {
  child = spawn(process.execPath, [path.join(root, "node_modules/@deepseek-ai/dsh/lib/bin.js"), "web", "--no-open", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: root, env: { ...process.env, DSH_HOME: home, DSH_TELEMETRY_DISABLED: "1", DSH_TELEMETRY_MODE: "DISABLED" }, stdio: ["ignore", "pipe", "pipe"],
  });
  for (const pipe of [child.stdout, child.stderr]) pipe.on("data", chunk => { logs = (logs + chunk.toString()).slice(-50000); });
  await waitFor(async () => { if (child.exitCode !== null) throw new Error("Native Host exited before readiness"); try { return await rpc("session/modelCatalog"); } catch { return null; } }, 60000);
  console.log(JSON.stringify({ nativeHost: base, home, mode: "DSH native plugins, isolated Web Host" }));
  const launchUrl = logs.match(/https?:\/\/[^\s]+\/\?token=[A-Za-z0-9_-]+/g)?.findLast(value => new URL(value).origin === base);
  await fs.writeFile(path.join(output, "browser-auth.json"), JSON.stringify({ base, launchUrl }), { mode: 0o600 });
  if (process.argv.includes("--serve")) { await once(child, "exit"); process.exitCode = child.exitCode; }
  else {
    const sessionId = `desktop-preparation-${crypto.randomUUID()}`;
    await rpc("session/create", { sessionId, cwd: output, agentPreset: "openquantum" });
    const skills = await rpc("skills/list", { sessionId });
    const prompt = "请执行本地验收：用 find_openquantum_skills 选择 qiskit-circuit-workbench，读取该 Skill。通过 find_openquantum_skills 查 run_qiskit_circuit 的操作和精确参数，然后用 prepare_openquantum_skill 准备所选本地 Tool；如果正在安装，用 find_openquantum_skills 查询至 ready。准备完成后用 run_qiskit_circuit 运行 Bell 电路的本地分析。只使用上述 Tool 和 skill，不用 bash、代码或云服务替代。最后明确报告实际结果。";
    await rpc("session/prompt", { sessionId, mode: "queue", content: [{ type: "text", text: prompt }], clientTimeZone: "Asia/Shanghai" });
    const snapshot = async () => (await harnessSessionSnapshot(base, cookie, sessionId, 500)).records.filter(record => record.type === "event").map(record => record.event);
    const first = await waitFor(async () => { const events = await snapshot(); return events.some(e => e.type === "turn/end") ? events : null; }, 300000);
    const results = first.filter(event => event.type === "tool/result");
    if (!results.length) {
      await fs.writeFile(path.join(output, "report.json"), JSON.stringify({ sessionId, status: "blocked", reason: "The configured model completed without any Tool result; inspect the redacted host failure log.", electronWindow: "not_checked" }, null, 2));
      throw new Error("Configured model did not execute any Tool; native Agent acceptance is blocked");
    }
    await rpc("session/prompt", { sessionId, mode: "queue", content: [{ type: "text", text: "保持当前聊天，用刚才已准备的 run_qiskit_circuit 再做一次本地 Bell 电路分析。不要安装、不要改配置、不要使用代码或云服务。" }], clientTimeZone: "Asia/Shanghai" });
    const events = await waitFor(async () => { const events = await snapshot(); return events.filter(e => e.type === "turn/end").length >= 2 ? events : null; }, 180000);
    // Persist the actual audit trail only after removing secrets and auth data.
    const secretValues = Object.entries(process.env).filter(([key]) => /KEY|TOKEN|PASSWORD|SECRET/.test(key)).map(([, value]) => value).filter(value => value.length > 4);
    let serialized = JSON.stringify(events, null, 2); for (const value of secretValues) serialized = serialized.split(value).join("[REDACTED]");
    await fs.writeFile(path.join(output, "session-events.json"), serialized, { mode: 0o600 });
    const report = { sessionId, nativeHost: "DSH 0.1.5-rc.1 native plugins on isolated Web Host", electronWindow: "not_checked", skills: skills.skills.length,
      firstTurnEvents: first.length, events: events.length, toolCalls: events.filter(e => e.type === "tool/call").map(e => e.data),
      approvals: events.filter(e => e.type === "approval/decided").map(e => e.data.outcome), scientificAcceptance: "not_evaluated" };
    await fs.writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
    assert.ok(report.toolCalls.some(call => call.name === "find_openquantum_skills"), "Agent must discover its Skill");
    assert.ok(report.toolCalls.some(call => call.name === "prepare_openquantum_skill"), "Agent must prepare its selection");
    assert.ok(report.toolCalls.filter(call => call.name === "run_qiskit_circuit").length >= 2, "Agent must execute in both turns of the same chat");
    assert.ok(!events.filter(event => event.type === "tool/result").some(event => event.data.isError), "Native Tool results must succeed");
    console.log(JSON.stringify({ sessionId, events: events.length, report: path.join(output, "report.json") }));
  }
} catch (error) {
  let safe = logs.replace(/([?&]token=)[A-Za-z0-9_-]+/g, "$1[REDACTED]");
  for (const [name, value] of Object.entries(process.env)) if (/KEY|TOKEN|PASSWORD|SECRET/.test(name) && value.length > 4) safe = safe.split(value).join("[REDACTED]");
  await fs.writeFile(path.join(output, "host-failure.log"), safe, { mode: 0o600 });
  throw error;
} finally { await stop(); await fs.rm(path.join(output, "browser-auth.json"), { force: true }); }
