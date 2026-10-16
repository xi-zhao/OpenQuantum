import { runPasqalWorkflow, validatePasqalCommand } from "../codex/pasqal-workflow.mjs";

// The existing Pasqal workflow has a stable credential boundary. Desktop needs
// a native invocation of that boundary: arbitrary host code never receives the
// credential and no Codex CLI/keyring process is involved.
export function withDesktopWorkflow(backend, { credentials, environments, settings, execute, launch } = {}) {
  const name = "run_pasqal_workflow";
  const definition = { name, description: "执行 Pasqal 云端工作流：device、submit、recover、close、cancel、harvest。沿用领域参考的参数和收据；提交需要明确批准，结果未知不得重放。", inputSchema: {
    type: "object", properties: { args: { type: "array", minItems: 1, maxItems: 20, items: { type: "string", maxLength: 4096 } } }, required: ["args"], additionalProperties: false,
  }, annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true } };
  const validate = args => {
    if (!args || Object.keys(args).length !== 1 || !Array.isArray(args.args)) throw new Error("Pasqal 操作参数无效");
    validatePasqalCommand(args.args);
  };
  const lifetime = new AbortController(), calls = new Set();
  return { ...backend,
    sourceCapabilities: backend.sourceCapabilities.map(item => item.id === "pasqal-experiments" ? { ...item, tools: [name] } : item),
    tools: [...backend.tools, definition],
    providers: [...backend.providers, { key: "pasqal_cloud", kind: "native", title: "Pasqal Cloud", tools: [{ name, effect: "external-write", capabilityId: "pasqal-experiments" }] }],
    providerFor: tool => tool === name ? "pasqal_cloud" : backend.providerFor(tool),
    async validateCall(tool, args) { if (tool === name) validate(args); else await backend.validateCall(tool, args); },
    async call(tool, args, signal, authorize, values, lifecycle) {
      if (tool !== name) return backend.call(tool, args, signal, authorize, values, lifecycle);
      signal = AbortSignal.any([signal, lifetime.signal]);
      validate(args); signal.throwIfAborted();
      if (!await authorize()) throw new Error("用户已禁止此工作流");
      const current = settings();
      const pending = runPasqalWorkflow(args.args, { root: backend.root, settings: current, credentials, environments,
        directory: environments.directory, signal, execute, launch, authorizeOperation: authorize, cwd: lifecycle?.cwd ?? backend.root });
      calls.add(pending);
      let result;
      try { result = await pending; } finally { calls.delete(pending); }
      return { isError: result.exitCode !== 0, content: [{ type: "text", text: result.stdout || result.stderr }] };
    },
    async close() { lifetime.abort(); await backend.close(); await Promise.allSettled([...calls]); },
  };
}
