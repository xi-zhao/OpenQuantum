export const quantumHardwareMcpIntegration = Object.freeze({
  sourceUrl: "https://github.com/Lokesh-2025/quantum-hardware-mcp",
  revision: "13fbe9f13fd68c409086491b9598ce2d25f5210a",
  relativeRoot: ".openquantum/external/quantum-hardware-mcp",
  requiredFiles: Object.freeze(["server.py", "requirements.txt", "mcp_app.py"]),
  entry: ".openquantum/external/quantum-hardware-mcp/server.py",
  marker:
    ".openquantum/external/quantum-hardware-mcp/.openquantum-source.json",
  setupCommand: "npm run mcp:quantum-hardware:setup",
});
