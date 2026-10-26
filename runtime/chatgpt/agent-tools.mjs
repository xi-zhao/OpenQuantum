// Keep the model-facing surface small. Scientific contracts stay in the
// verified catalog and are returned only for the Agent's current selection.
export const EXECUTE_TOOL = "execute_openquantum_tool";
export const executionTool = {
  name: EXECUTE_TOOL,
  title: "执行所选 OpenQuantum Tool",
  description: "Execute one catalogued scientific Tool after find_openquantum_skills returns its exact inputSchema and prepare_openquantum_skill reports ready. Pass its arguments unchanged. Does not install dependencies or change settings. Cloud/hardware operations still require the user's authorization; never replay an uncertain submission. Returns the selected Tool's actual result.",
  inputSchema: {
    type: "object",
    properties: {
      skillId: { type: "string", minLength: 1, maxLength: 128 },
      toolName: { type: "string", minLength: 1, maxLength: 128 },
      arguments: { type: "object", description: "Arguments matching the selected Tool's inputSchema returned by discovery. Never include credentials." },
    },
    required: ["skillId", "toolName", "arguments"],
    additionalProperties: false,
  },
  // One entry dispatches Tools with different effects; never promise that all
  // of them are read-only, idempotent or confined to local computation.
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
};

export async function describePreparation(settings, plan) {
  const name = plan.selection?.toolName;
  if (!name || ["blocked", "unavailable", "unsupported"].includes(plan.state) || !await settings.enabled(name)) return plan;
  const tool = settings.backend.tools.find(tool => tool.name === name);
  if (!tool) return plan;
  return {
    ...plan,
    tool: Object.fromEntries(["name", "title", "description", "inputSchema", "outputSchema", "annotations"].filter(key => tool[key] !== undefined).map(key => [key, tool[key]])),
    execution: { name: EXECUTE_TOOL, arguments: { skillId: plan.skillId, toolName: name } },
    ...(plan.state === "ready" ? { next: `Continue the original task in this conversation: call ${EXECUTE_TOOL} with execution.arguments plus arguments matching tool.inputSchema. No settings changes or reload are needed.` } : {}),
  };
}

export async function executeTool(settings, input, signal) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => !["skillId", "toolName", "arguments"].includes(key))
    || ["skillId", "toolName"].some(key => typeof input[key] !== "string" || !input[key].trim() || input[key].length > 128)
    || !input.arguments || typeof input.arguments !== "object" || Array.isArray(input.arguments)) throw new Error("执行参数无效；先发现所选 Tool 的输入合同");
  const capability = settings.backend.sourceCapabilities.find(item => item.id === input.skillId && item.status === "available");
  if (!capability?.tools.includes(input.toolName) || !settings.backend.providerFor(input.toolName)) throw new Error("此 Tool 不属于所选 Skill");
  signal?.throwIfAborted();
  const result = await settings.callBuiltin(input.toolName, input.arguments, signal, { skillId: input.skillId });
  // Preserve numerical results byte-for-byte; only enrich setup errors with the
  // same discover/prepare/execute route used by this MCP host.
  if (result.isError && result.content?.[0]?.type === "text") {
    let plan;
    try { plan = JSON.parse(result.content[0].text); } catch { return result; }
    if (plan.code === "preparation_required") return { ...result, content: [{ type: "text", text: JSON.stringify(await describePreparation(settings, plan)) }, ...result.content.slice(1)] };
  }
  return result;
}
