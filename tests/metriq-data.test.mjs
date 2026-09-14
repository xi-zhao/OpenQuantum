import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { queryMetriqData, SOURCE } from "../src/metriq-data/index.mjs";
import { toolDefinitions } from "../runtime/openquantum/agent-presets/openquantum/metriq-data-tools.mjs";
import { readDeclaredNativeToolContracts } from "../scripts/lib/capability-tool-contract.mjs";

const query = input => JSON.parse(queryMetriqData(input));
test("Metriq source inventory, attribution and identical-record deduplication remain auditable", () => {
  assert.equal(SOURCE.commit, "6730f78b135a9af67691a0ef4fbea041978056c5");
  assert.equal(SOURCE.files.length, 331);
  assert.equal(SOURCE.files.reduce((sum, file) => sum+file.recordCount, 0), 413);
  const bytes = readFileSync(new URL("../src/metriq-data/upstream/snapshot.json", import.meta.url));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), SOURCE.snapshotSha256);
  const records = JSON.parse(bytes).records;
  assert.equal(records.length, 410);
  assert.equal(records.reduce((sum, entry) => sum+entry.sources.length, 0), 413);
  const r = query({ action: "list", limit: 1 });
  assert.equal(r.source.license, "CC-BY-4.0");
  assert.equal(r.totalMatches, 410);
  assert.equal(r.nextOffset, 1);
  assert.ok(r.catalog.provider.includes("local"));
  assert.ok(r.catalog.provider.includes("origin"));
});

test("Metriq lookup preserves raw metrics, parameters, timestamps and original provider labels", () => {
  const r = query({ action: "search", provider: "ORIGIN", device: "wk_c180", benchmark: "BSEQ", limit: 2 });
  assert.ok(r.totalMatches > 0);
  const first = r.records[0];
  const detail = query({ action: "get", id: first.id }).records[0];
  assert.deepEqual(detail.metrics, detail.originalRecord.results);
  assert.deepEqual(detail.parameters, detail.originalRecord.params);
  assert.equal(detail.timestamp, detail.originalRecord.timestamp);
  assert.match(detail.sources[0].url, /\/blob\/6730f78b135a9af67691a0ef4fbea041978056c5\//);
  const local = query({ action: "search", provider: "local", limit: 1 }).records[0];
  assert.equal(local.provider, "local");
  assert.equal(query({ action: "search", query: "nonexistent-device" }).totalMatches, 0);
  const page1 = query({ action: "list", limit: 2 });
  const page2 = query({ action: "list", limit: 2, offset: 2 });
  assert.equal(new Set([...page1.records, ...page2.records].map(row => row.id)).size, 4);
});

test("Metriq errors are bounded and its registered native Tool is read-only", async () => {
  const contract = readDeclaredNativeToolContracts({ projectRoot: process.cwd(), capabilityId: "metriq-data" });
  assert.equal(contract.length, 1);
  assert.equal(contract[0].name, "metriq_benchmarks");
  assert.equal(contract[0].effect, "read-only");
  assert.equal(toolDefinitions[0].parameters.additionalProperties, false);
  const result = JSON.parse(await toolDefinitions[0].execute({ action: "list", limit: 1 }));
  assert.equal(result.scientificValidation, "not_evaluated");
  for (const input of [{ action: "get", id: "../../.env" }, { action: "get", id: "0".repeat(64) }, { action: "search" }, { action: "search", query: " " }, { action: "list", limit: 21 }, { action: "list", upload: true }, { action: "get", id: "0".repeat(64), provider: "ibm" }]) {
    assert.throws(() => query(input));
  }
});
