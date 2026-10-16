import { pathToFileURL } from "node:url";
import { containedPath } from "./catalog.mjs";

// Shared pure-JS Tool adapter. Codex serves it over stdio; Desktop calls it
// in-process through its native Tool Provider and the same contract checks.
export async function nativeAdapter(provider, root) {
  const { toolDefinitions } = await import(pathToFileURL(containedPath(root, provider.entrypoint)).href);
  const definitions = toolDefinitions.filter(tool => provider.tools.some(item => item.name === tool.name));
  return {
    async listTools() { return { tools: definitions.map(tool => ({
      name: tool.name,
      description: tool.name === "solve_and_validate_ground_state"
        ? "Compute six bounded two-qubit ground-state facts and independent Validator observations. Provenance remains not_checked; this ChatGPT adapter does not materialize Harness evidence or derive final scientific Acceptance."
        : tool.description,
      inputSchema: tool.parameters,
      ...(tool.output.schema.type === "object" ? { outputSchema: tool.output.schema } : {}),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    })) }; },
    async callTool({ name, arguments: args = {} }, _schema, { signal } = {}) {
      const tool = definitions.find(item => item.name === name);
      if (!tool) throw new Error("Unknown native tool");
      signal?.throwIfAborted();
      try {
        const value = await tool.execute(args, { signal });
        signal?.throwIfAborted();
        return { content: tool.output.render(args, value), ...(tool.output.schema.type === "object" ? { structuredContent: value } : {}) };
      } catch (error) { return { isError: true, content: [{ type: "text", text: error.message }] }; }
    },
    async close() {},
  };
}
