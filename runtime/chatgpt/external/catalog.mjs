import fs from "node:fs/promises";
import path from "node:path";

// Fixed upstream MCPs, not a second capability registry. The shared policy
// remains authoritative for ownership, operation names and maximum effects.
export const EXTERNAL_MCP = [
  ["qiskit", "qiskit-circuit-workbench", "run_qiskit_circuit", "Qiskit 电路", "qiskit_mcp_server.server"],
  ["qiskit_docs", "qiskit-circuit-workbench", "read_qiskit_documentation", "Qiskit 文档", "qiskit_docs_mcp_server.server"],
  ["qiskit_ibm_runtime", "quantum-sdk-workbench", "run_ibm_quantum", "IBM Quantum Runtime", "qiskit_ibm_runtime_mcp_server.server"],
  ["qiskit_ibm_transpiler", "quantum-sdk-workbench", "run_ibm_transpiler", "IBM Quantum Transpiler", "qiskit_ibm_transpiler_mcp_server.server"],
  ["qiskit_gym", "quantum-sdk-workbench", "run_qiskit_gym", "Qiskit Gym", "qiskit_gym_mcp_server.server"],
  ["quantum_hardware", "quantum-sdk-workbench", "run_quantum_hardware", "Quantum Hardware", null],
  ["qpanda_runtime", "quantum-sdk-workbench", "run_qpanda_runtime", "QPanda3 Runtime", "qpanda3_runtime_mcp_server.server"],
].map(([id, skillId, toolName, title, module]) => ({ id, skillId, toolName, title, module,
  environmentId: `mcp-${id.replaceAll("_", "-")}`, persistent: ["qiskit_gym", "qpanda_runtime"].includes(id) }));
export const externalMcp = id => EXTERNAL_MCP.find(item => [item.id, item.environmentId, item.toolName].includes(id));
export const externalProject = (root, id) => path.join(root, "runtime/chatgpt/external/environments", externalMcp(id).id);
export const externalEnvironmentIds = () => EXTERNAL_MCP.map(item => item.environmentId);

// Account setup/readback is owned by settings; the model never handles a key.
export const ACCOUNT_OPERATIONS = new Set(["setup_ibm_quantum_account_tool", "setup_origin_quantum_account_tool", "delete_saved_account_tool", "list_saved_accounts_tool", "active_account_info_tool"]);
export async function externalContract(root, id) {
  return JSON.parse(await fs.readFile(path.join(externalProject(root, id), "tools.json"), "utf8"));
}
export function operationLimitation(entry, name) {
  return entry.id === "qpanda_runtime" && name === "cancel_task_tool"
    ? "固定版 QPanda3 Runtime 没有云端任务取消接口；任务尚未取消。请在本源量子账户中处理。关闭本地会话不会取消已提交的云端任务。"
    : null;
}
export function operationPresentation(entry, operation) {
  const description = operationLimitation(entry, operation.name) ?? (entry.id === "qiskit_gym" && operation.name === "stop_training_tool"
    ? "停止此 MCP 会话内的全部训练并关闭会话。未保存的模型和环境状态会丢失；需要保留的模型请先保存。"
    : entry.id === "qpanda_runtime" && operation.name === "list_my_tasks_tool"
      ? "列出本次 MCP 会话已提交并记录的任务 ID；不查询账户历史任务。"
      : entry.id === "qpanda_runtime" && ["estimate_tool", "batch_estimate_tool", "create_circuit_observable_binding_tool"].includes(operation.name)
        ? `${operation.description}\nObservable 使用带比特索引的格式，如 {"Z0 Z1": 0.5, "X0": -0.3} 或 "Z0 Z1"；不使用无索引的 "IIXY"。每个 observable 的最大比特索引须与电路一致。`
      : operation.description);
  return { ...operation, description };
}
export function externalTool(entry, operations, upstream) {
  const allowed = operations.filter(item => !ACCOUNT_OPERATIONS.has(item.name));
  const write = allowed.some(item => item.effect !== "read-only");
  return { name: entry.toolName, title: entry.title,
    description: `${entry.title}：选择一个 operation 执行。先使用 find_openquantum_skills 查看该 operation 的参数合同，并用 prepare_openquantum_skill 准备。凭据只在设置页填写。${entry.persistent ? "首次调用返回 sessionId，后续调用传回同一个 sessionId；结束时 close_session。会话闲置 30 分钟后回收，长任务须持续检查进度。" : "只在本次调用期间启动服务。"}${entry.id === "qiskit_gym" ? "stop_training_tool 会关闭整个会话并终止全部训练，请先保存需保留的模型。" : ""}${entry.id === "qpanda_runtime" ? "固定版本没有云端任务取消接口，close_session 只关闭本地连接，不取消已提交的任务。" : ""} 写操作可能提交云端任务或消耗资源，必须按用户请求执行，不自动重试。`,
    inputSchema: { type: "object", properties: {
      operation: { type: "string", enum: [...allowed.map(item => item.name), ...(entry.persistent ? ["close_session"] : [])] },
      arguments: { type: "object", maxProperties: 64, description: "Exact operation arguments from find_openquantum_skills. Validated against the pinned upstream JSON Schema before execution; never include secrets." },
      ...(entry.persistent ? { sessionId: { type: "string", pattern: "^[a-f0-9-]{36}$", description: "Use the sessionId returned by the first call for every following operation." } } : {}),
    }, required: ["operation", "arguments"], additionalProperties: false },
    annotations: { readOnlyHint: !write, destructiveHint: write, idempotentHint: false, openWorldHint: !["qiskit", "qiskit_gym"].includes(entry.id) },
    _meta: { openquantumExternal: { server: entry.id, operationCount: allowed.length, contractVersion: upstream.schemaVersion } },
  };
}

export function operationCredential(entry, operation, args = {}) {
  if (["qiskit", "qiskit_docs", "qiskit_gym"].includes(entry.id) || operation === "close_session") return null;
  if (entry.id === "qiskit_ibm_runtime" && operation === "get_coupling_map_tool" && args.backend_name?.startsWith("fake_")) return null;
  if (entry.id === "quantum_hardware") {
    if (["device_history", "device_profile", "device_on_date", "get_alerts", "job_analytics", "check_routing_overhead", "encode_search_problem", "estimate_hardware_gates", "discover_collision_candidates", "encode_collision_problem", "find_collision_candidates", "sieve_singmaster_space", "certify_ising_gate_optimality", "verify_stabilizer_circuit", "verify_stabilizer_hardware_result", "analyze_molecule", "plan_quantum_chemistry_run", "recommend_error_mitigation", "estimate_circuit_error_ceiling", "build_forged_circuits"].includes(operation)) return null;
    if (["ionq_devices", "ionq_submit_job", "ionq_job_status", "ionq_job_results", "estimate_ionq_gates", "estimate_ionq_cost"].includes(operation)) return "IONQ_API_KEY";
    if (operation === "get_amplification") return args.provider === "ionq" ? "IONQ_API_KEY" : "QISKIT_IBM_TOKEN";
    if (operation === "run_vqe") return (args.backend_name ?? "simulator") === "simulator" ? null : "QISKIT_IBM_TOKEN";
    if (operation === "debug_circuit") return args.device_name ? "QISKIT_IBM_TOKEN" : null;
    if (["run_search_experiment", "encode_4way_collision", "equality_oracle_search", "run_parallel_collision_search"].includes(operation)) return args.simulate_only === false ? "QISKIT_IBM_TOKEN" : null;
    if (["list_devices", "get_device_details", "best_qubits", "compare_devices", "queue_status", "submit_job", "job_status", "job_results", "cancel_job", "list_jobs", "run_grover", "estimate_expectation", "circuit_report", "check_chip_identity", "start_repro_experiment", "repro_score", "estimate_runtime", "route_job", "run_forged_energy", "collect_forged_energy"].includes(operation)) return "QISKIT_IBM_TOKEN";
    throw new Error("未知 Quantum Hardware 操作");
  }
  if (entry.id === "qpanda_runtime" && ["list_my_tasks_tool", "list_bindings_tool", "create_circuit_observable_binding_tool", "add_product_rule_tool", "add_zip_rule_tool", "delete_binding_tool"].includes(operation)) return null;
  return entry.id === "qpanda_runtime" ? "QPANDA3_API_KEY" : "QISKIT_IBM_TOKEN";
}
