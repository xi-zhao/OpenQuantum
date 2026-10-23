import { nativeAdapter } from "./native-adapter.mjs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { providerGroups, readCapabilities } from "./catalog.mjs";

// Shared definitions have no Harness registration or model runtime dependency.
const root = process.cwd();
process.env.OPENQUANTUM_PROJECT_ROOT = root;
const provider = providerGroups(await readCapabilities(root)).find((item) => item.key === process.argv[2] && item.kind === "native");
if (!provider) throw new Error("Unknown native provider");
const adapter = await nativeAdapter(provider, root);
const server = new Server({ name: "openquantum-native-adapter", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, () => adapter.listTools());
server.setRequestHandler(CallToolRequestSchema, (request, { signal }) => adapter.callTool(request.params, undefined, { signal }));
await server.connect(new StdioServerTransport());
