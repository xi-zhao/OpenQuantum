export const qpandaRuntimeMcpIntegration = Object.freeze({
  sourceUrl: "https://github.com/OriginQ/qpanda3-runtime-mcp-server",
  revision: "4a06035afa415ed8dc9d571869cb5ca60ed1bcb1",
  relativeRoot: ".openquantum/external/qpanda3-runtime-mcp",
  requiredFiles: Object.freeze([
    "pyproject.toml",
    "src/qpanda3_runtime_mcp_server/server.py",
    "src/qpanda3_runtime_mcp_server/__main__.py",
  ]),
  entry:
    ".openquantum/external/qpanda3-runtime-mcp/src/qpanda3_runtime_mcp_server/__main__.py",
  marker: ".openquantum/external/qpanda3-runtime-mcp/.openquantum-source.json",
  setupCommand: "npm run mcp:qpanda-runtime:setup",
});
