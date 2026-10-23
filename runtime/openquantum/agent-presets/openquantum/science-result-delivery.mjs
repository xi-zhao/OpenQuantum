import { projectRoot as openQuantumProjectRoot } from "../../project-root.mjs";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { parseDocument } from "yaml";

// Presets are copied into DSH_HOME; shared implementation stays in the project.
const { scienceResultSummary } = await import(
  pathToFileURL(path.join(openQuantumProjectRoot, "src/lib/science-result-summary.mjs")).href
);

export const name = "openquantum-science-result-delivery";
export const inject = ["tools", "fs", "sandboxPolicy"];
const sha256 = value => createHash("sha256").update(value).digest("hex");

// Use the existing declaration as the authority; this does not register Tools.
const policy = parseDocument(await readFile(path.join(openQuantumProjectRoot, ".agents/capability-packages.yml"), "utf8"), { uniqueKeys: true });
if (policy.errors.length) throw policy.errors[0];
const eligibleTools = new Set(policy.toJS({ maxAliasCount: 20 }).packages.flatMap(capability =>
  (capability.execution?.mcpServers ?? []).filter(server => server.source === "package").flatMap(server =>
    server.tools.filter(tool => ["workspace-write", "external-write"].includes(tool.effect))
      .flatMap(tool => [`mcp__${server.name}__${tool.name}`, tool.name]))));

async function saveResult(ctx, exec, value) {
  const session = exec.agent.session;
  const sandboxPolicy = ctx.sandboxPolicy.resolve({ session });
  if (sandboxPolicy.mode === "read-only") throw new Error("Session is read-only");
  const cwd = session.header.cwd;
  if (typeof cwd !== "string" || !path.isAbsolute(cwd)) throw new Error("A session workspace is required");
  const call = session.snapshotEvents().findLast(event => event.type === "tool/call"
    && event.data.callId === exec.callId && event.data.name === exec.name);
  if (!call) throw new Error("A recorded tool call is required");
  const args = typeof call.data.arguments === "string" ? JSON.parse(call.data.arguments) : call.data.arguments;
  if (!isDeepStrictEqual(args, exec.arguments)) throw new Error("Recorded arguments differ");
  const directory = `results/openquantum/tool-results/${sha256(session.id)}/${sha256(JSON.stringify({ callId: exec.callId, seq: call.seq }))}`;
  const relativePath = `${directory}/result.json`;
  const root = await ctx.fs.resolve(".", { cwd, signal: exec.signal });
  const target = await ctx.fs.resolve(relativePath, { cwd, signal: exec.signal });
  if (!ctx.fs.contains(root, target)) throw new Error("Result path escapes the workspace");
  const content = `${JSON.stringify(value, null, 2)}\n`;
  exec.signal?.throwIfAborted();
  let existing;
  try { existing = await readFile(ctx.fs.processPath(target), { encoding: "utf8", signal: exec.signal }); } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (existing === undefined) {
    await ctx.fs.writeText(target, content, { kind: "createIfAbsent" }, exec.signal,
      sandboxPolicy);
  } else if (existing !== content) throw new Error("Existing result content differs");
  const saved = await readFile(ctx.fs.processPath(target), { encoding: "utf8", signal: exec.signal });
  if (saved !== content) throw new Error("Result readback differs");
  exec.signal?.throwIfAborted();
  return { path: relativePath, mediaType: "application/json", bytes: Buffer.byteLength(saved), sha256: sha256(saved) };
}

export function apply(ctx) {
  ctx.on("tools/post-execute", async (exec, result, next) => {
    const downstream = await next();
    const response = result.value;
    if (downstream.kind !== "accept" || Object.hasOwn(downstream, "value") || result.isError
      || !exec.agent || exec.parent !== undefined || !eligibleTools.has(exec.name)) return downstream;
    const value = response?.structuredContent;
    const original = downstream.content ?? result.content;
    // Do not replace error explanations, mixed media or another hook's content.
    if (value?.schemaVersion !== "1.0" || value.scientificValidation !== "not_evaluated"
      || !value.source || !value.input || !value.result || !Array.isArray(value.limitations)
      || !/^[a-f0-9]{64}$/.test(value.dependencyLockSha256)
      || value.inputSha256 !== sha256(JSON.stringify(value.input))
      || !isDeepStrictEqual(original, response.content)
      || original?.length !== 1 || original[0].type !== "text"
      || original[0].text !== JSON.stringify(value)) return downstream;
    try {
      const summary = scienceResultSummary(value, original[0].text);
      if (!summary) return downstream;
      const fullResult = await saveResult(ctx, exec, value);
      return { ...downstream, content: [{ type: "text", text: JSON.stringify({
        kind: "openquantum-science-summary", summary, fullResult,
        retrieval: "Full result saved in the session workspace. Use the existing file or shell tools to read or analyze fullResult.path; jsonPointer identifies omitted fields. Omitted data are not zero or absent. This delivery does not establish scientific acceptance.",
      }) }] };
    } catch {
      ctx.logger?.warn?.("Scientific result delivery failed; complete tool output retained");
      return { ...downstream, content: [...original, { type: "text", text: "完整结果未能保存并校验，原始输出已保留。不要宣称文件已交付或科学验收通过。" }] };
    }
  }, { prepend: true });
}
