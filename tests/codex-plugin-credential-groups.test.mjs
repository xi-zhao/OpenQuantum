import assert from "node:assert/strict";
import test from "node:test";
import { SERVICES, missingFields } from "../src/settings/codex/service-catalog.mjs";
import { credentialEntries } from "../runtime/chatgpt/ui/credential-groups.mjs";

function snapshot(values = {}) {
  return SERVICES.map(service => {
    const saved = values[service.id] ?? {};
    return { ...service, fields: service.fields.map(field => ({ ...field, configured: Boolean(saved[field.name]) })),
      configuration: !service.supported ? "unsupported" : missingFields(service, saved).length ? "incomplete" : Object.keys(saved).length ? "configured" : "optional" };
  });
}

test("service grouping keeps every field and shared IBM consumers without duplicate inputs", () => {
  const groups = credentialEntries(snapshot());
  const names = groups.flatMap(group => group.fields.map(field => field.name));
  assert.equal(names.length, new Set(names).size);
  assert.deepEqual(new Set(names), new Set(SERVICES.flatMap(service => service.fields.map(field => field.name))));
  assert.deepEqual(groups.find(group => group.id === "qcarchive_data").fields.map(field => field.name), ["QCPORTAL_ADDRESS", "QCPORTAL_USERNAME", "QCPORTAL_PASSWORD"]);
  assert.deepEqual(groups.find(group => group.id === "oqc_cloud").fields.map(field => field.name), ["OQC_API_TOKEN", "OQC_API_ENDPOINT"]);
  const ibm = groups.find(group => group.id === "ibm_quantum");
  assert.equal(ibm.fields.length, 1);
  assert.deepEqual(ibm.serverNames, ["qiskit_ibm_runtime", "qiskit_ibm_transpiler", "quantum_hardware"]);
  assert.deepEqual(groups.find(group => group.id === "ionq").fields.map(field => field.name), ["IONQ_API_KEY"]);
  assert.equal(groups.find(group => group.id === "pasqal_cloud").supported, true);
});

test("QCArchive reports partial account configuration without requiring anonymous users to fill optional fields", () => {
  const state = saved => credentialEntries(snapshot({ qcarchive_data: saved })).find(group => group.id === "qcarchive_data");
  assert.equal(state({}).configuration, "incomplete");
  assert.equal(state({ QCPORTAL_ADDRESS: "address" }).configuration, "configured");
  assert.equal(state({ QCPORTAL_ADDRESS: "address", QCPORTAL_USERNAME: "user" }).configuration, "partial");
  assert.equal(state({ QCPORTAL_ADDRESS: "address", QCPORTAL_USERNAME: "user", QCPORTAL_PASSWORD: "password" }).configuration, "configured");
});

test("independent platform credentials are optional and a store failure cannot look configured", () => {
  const empty = credentialEntries(snapshot()).find(group => group.id === "fieldqkit");
  assert.equal(empty.configuration, "optional");
  const one = credentialEntries(snapshot({ fieldqkit: { QUAFU_API_TOKEN: "fixture" } })).find(group => group.id === "fieldqkit");
  assert.equal(one.configuration, "configured"); assert.equal(one.saved, 1);
  const services = snapshot(); services.find(service => service.id === "fieldqkit").configuration = "unavailable";
  assert.equal(credentialEntries(services).find(group => group.id === "fieldqkit").configuration, "unavailable");
});
