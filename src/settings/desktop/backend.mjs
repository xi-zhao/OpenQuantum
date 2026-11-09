import { createToolBackend, DEFAULT_BACKEND_LIMITS } from "../../lib/tool-backend.mjs";
import { PROJECT_ROOT, loadBackendCatalog } from "../../../runtime/chatgpt/catalog.mjs";
import { connectProvider } from "../../../runtime/chatgpt/provider-connection.mjs";
import { nativeAdapter } from "../../../runtime/chatgpt/native-adapter.mjs";
import { createExternalSessionAdapter, connectExternal as connectExternalProvider } from "../../../runtime/chatgpt/external/client.mjs";

// Reuse the reviewed catalog and MCP adapters, without delegating execution
// policy or construction to the Codex backend. Native Tools remain in-process.
export async function createDesktopBackend({ root = PROJECT_ROOT, discover = false, nodeExecutable = process.execPath,
  connectExternal = (root, entry, values, options) => connectExternalProvider(root, entry, values, { ...options, nodeExecutable }) } = {}) {
  const limits = DEFAULT_BACKEND_LIMITS;
  const connect = (provider, root, values, signal) => provider.kind === "native"
    ? nativeAdapter(provider, root) : connectProvider(provider, root, values, signal, nodeExecutable);
  const catalog = await loadBackendCatalog({ root, discover, connect, limits });
  return createToolBackend({ catalog, limits, connect,
    createExternal: () => createExternalSessionAdapter({ root, connect: connectExternal }) });
}
