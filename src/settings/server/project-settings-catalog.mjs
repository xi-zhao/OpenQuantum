import { MCP_CREDENTIAL_CATALOG } from "./catalog/credentials.mjs";
import { PLATFORM_AND_QISKIT_MCP_CATALOG } from "./catalog/platform-and-qiskit.mjs";
import { RESEARCH_METHODS_MCP_CATALOG } from "./catalog/research-methods.mjs";
import { VENDOR_ECOSYSTEM_MCP_CATALOG } from "./catalog/vendor-ecosystem.mjs";

const MCP_CATALOG = Object.freeze({
  ...VENDOR_ECOSYSTEM_MCP_CATALOG,
  ...RESEARCH_METHODS_MCP_CATALOG,
  ...PLATFORM_AND_QISKIT_MCP_CATALOG,
});

export function mcpCatalogEntry(serverName) {
  return (
    MCP_CATALOG[serverName] ?? {
      displayName: serverName,
      description: "项目 Agent preset 声明的 Harness 原生 MCP 服务。",
      provider: "Project",
      sourceUrl: null,
      packageName: null,
      packageVersion: null,
      setup: null,
    }
  );
}

export function mcpCredentialCatalogEntry(ref) {
  return (
    MCP_CREDENTIAL_CATALOG[ref] ?? {
      displayName: ref,
      description: "供自定义 MCP 使用的 Harness 安全凭据。",
      documentationUrl: null,
    }
  );
}
