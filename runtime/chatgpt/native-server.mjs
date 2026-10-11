import { pathToFileURL } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { containedPath, providerGroups, readCapabilities } from "./catalog.mjs";

// Shared definitions have no Harness registration or model runtime dependency.
const root = process.cwd();
process.env.OPENQUANTUM_PROJECT_ROOT = root;
const provider = providerGroups(await readCapabilities(root)).find((item) => item.key === process.argv[2] && item.kind === "native");
if (!provider) throw new Error("Unknown native provider");
const module = await import(pathToFileURL(containedPath(root, provider.entrypoint)).href);
const definitions = module.toolDefinitions;
const server = new Server({ name: "openquantum-native-adapter", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: definitions.filter((tool) => provider.tools.some((item) => item.name === tool.name)).map((tool) => ({
    name: tool.name,
    description: tool.name === "solve_and_validate_ground_state"
      ? "Compute six bounded two-qubit ground-state facts and independent Validator observations. Provenance remains not_checked; this ChatGPT adapter does not materialize Harness evidence or derive final scientific Acceptance."
      : tool.description,
    inputSchema: tool.parameters,
    ...(tool.output.schema.type === "object" ? { outputSchema: tool.output.schema } : {}),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  })),
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = definitions.find((item) => item.name === request.params.name && provider.tools.some((declared) => declared.name === item.name));
  if (!tool) throw new Error("Unknown native tool");
  try {
    const args = request.params.arguments ?? {};
    const value = await tool.execute(args);
    return { content: tool.output.render(args, value), ...(tool.output.schema.type === "object" ? { structuredContent: value } : {}) };
  } catch (error) {
    return { isError: true, content: [{ type: "text", text: error.message }] };
  }
});
await server.connect(new StdioServerTransport());
