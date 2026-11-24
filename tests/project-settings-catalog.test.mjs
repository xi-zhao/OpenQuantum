import assert from "node:assert/strict";
import test from "node:test";

import { MCP_CREDENTIAL_CATALOG } from "../src/settings/server/catalog/credentials.mjs";
import { PLATFORM_AND_QISKIT_MCP_CATALOG } from "../src/settings/server/catalog/platform-and-qiskit.mjs";
import { RESEARCH_METHODS_MCP_CATALOG } from "../src/settings/server/catalog/research-methods.mjs";
import { VENDOR_ECOSYSTEM_MCP_CATALOG } from "../src/settings/server/catalog/vendor-ecosystem.mjs";
import {
  mcpCatalogEntry,
  mcpCredentialCatalogEntry,
} from "../src/settings/server/project-settings-catalog.mjs";

test("split MCP catalog segments have no duplicate server names and freeze every entry", () => {
  const segments = [
    VENDOR_ECOSYSTEM_MCP_CATALOG,
    RESEARCH_METHODS_MCP_CATALOG,
    PLATFORM_AND_QISKIT_MCP_CATALOG,
  ];
  const seen = new Set();
  for (const segment of segments) {
    assert.ok(Object.isFrozen(segment));
    for (const [name, entry] of Object.entries(segment)) {
      assert.ok(!seen.has(name), `Duplicate MCP catalog entry: ${name}`);
      seen.add(name);
      assert.ok(Object.isFrozen(entry), `${name} must be frozen`);
      assert.equal(mcpCatalogEntry(name), entry);
    }
  }
  assert.equal(seen.size, 91);
});

test("MCP catalog and credential catalog preserve fallback projections and pinned setups", () => {
  assert.ok(Object.isFrozen(MCP_CREDENTIAL_CATALOG));
  assert.equal(Object.keys(MCP_CREDENTIAL_CATALOG).length, 23);
  for (const [ref, entry] of Object.entries(MCP_CREDENTIAL_CATALOG)) {
    assert.ok(Object.isFrozen(entry), `${ref} must be frozen`);
    assert.equal(mcpCredentialCatalogEntry(ref), entry);
  }

  const hardware = mcpCatalogEntry("quantum_hardware");
  assert.ok(hardware.setup && Object.isFrozen(hardware.setup));
  assert.equal(hardware.packageName, "quantum-hardware-mcp");

  const qpanda = mcpCatalogEntry("qpanda_runtime");
  assert.ok(qpanda.setup && Object.isFrozen(qpanda.setup));
  assert.equal(qpanda.packageName, "qpanda3-runtime-mcp-server");

  const fallbackServer = mcpCatalogEntry("custom_unknown_server");
  assert.equal(fallbackServer.displayName, "custom_unknown_server");
  assert.equal(fallbackServer.provider, "Project");
  assert.equal(fallbackServer.setup, null);

  const fallbackCred = mcpCredentialCatalogEntry("CUSTOM_API_TOKEN");
  assert.equal(fallbackCred.displayName, "CUSTOM_API_TOKEN");
  assert.equal(fallbackCred.documentationUrl, null);
});
