// Project declared relationships. Names and shared environments are not dependencies.
export function skillRelations(capability, backend, services) {
  const toolIds = [...(capability.tools ?? [])];
  const providerIds = [...new Set([...(capability.mcp ?? []).map(item => item.name), ...toolIds.map(id => backend.providerFor(id)).filter(Boolean)])];
  const environmentIds = [...new Set([...(capability.sdkIds ?? []), ...providerIds.map(id => backend.providers?.find(item => item.key === id)?.environmentId).filter(Boolean)])];
  return { toolIds, providerIds, environmentIds, ...(capability.sdkGroups ? { dependencyGroups: capability.sdkGroups } : {}),
    environmentSelection: environmentIds.length > 1 ? "choice" : "single",
    usesHostTools: Boolean(capability.hostTools?.length || environmentIds.length),
    credentialServiceIds: services.filter(service => providerIds.includes(service.id) || service.capability === capability.id).map(service => service.id) };
}

export function toolCredential(tool, services) {
  const service = services.find(item => item.id === tool.provider);
  if (!service || service.credentialFreeTools?.includes(tool.id)) return { requirement: "none" };
  const localBranches = ["qiskit_ibm_runtime", "qpanda_runtime", "quantum_hardware"].includes(tool.provider);
  const conditional = localBranches || !service.fields.some(field => field.required);
  return { serviceId: service.id, requirement: conditional ? "conditional" : "required",
    storeRequired: !localBranches && tool.id !== "discover_fieldqkit_backends",
    state: service.configuration, missing: service.missing };
}
