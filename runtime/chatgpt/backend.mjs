import { createToolBackend, DEFAULT_BACKEND_LIMITS, boundedSchema as projectSchema } from "../../src/lib/tool-backend.mjs";
import { PROJECT_ROOT, loadBackendCatalog } from "./catalog.mjs";
import { connectProvider } from "./provider-connection.mjs";
import { createExternalSessionAdapter, connectExternal as connectExternalProvider } from "./external/client.mjs";

// Preserve the existing build/probe and plugin entry points.
export { DEFAULT_BACKEND_LIMITS as LIMITS } from "../../src/lib/tool-backend.mjs";
export { readBundledTools } from "./catalog.mjs";
export { connectProvider } from "./provider-connection.mjs";
export const boundedSchema = schema => projectSchema(schema, DEFAULT_BACKEND_LIMITS);

export async function createBackend({ root = PROJECT_ROOT, discover = false, nodeExecutable = process.execPath,
  connect = (provider, root, values, signal) => connectProvider(provider, root, values, signal, nodeExecutable),
  connectExternal = (root, entry, values, options) => connectExternalProvider(root, entry, values, { ...options, nodeExecutable }) } = {}) {
  const limits = DEFAULT_BACKEND_LIMITS;
  const catalog = await loadBackendCatalog({ root, discover, connect, limits });
  return createToolBackend({ catalog, limits, connect,
    createExternal: () => createExternalSessionAdapter({ root, connect: connectExternal }) });
}
