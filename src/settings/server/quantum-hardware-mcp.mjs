export const quantumHardwareMcpIntegration = Object.freeze({
  sourceUrl: "https://github.com/Lokesh-2025/quantum-hardware-mcp",
  revision: "55dd9a7bcee32a2a99654db6816dad705c0b6f62",
  relativeRoot: ".openquantum/external/quantum-hardware-mcp",
  requiredFiles: Object.freeze(["server.py", "requirements.txt", "mcp_app.py", "turso_db.py"]),
  entry: ".openquantum/external/quantum-hardware-mcp/server.py",
  marker:
    ".openquantum/external/quantum-hardware-mcp/.openquantum-source.json",
  setupCommand: "npm run mcp:quantum-hardware:setup",
});
