export const CHANNEL = "openquantum.openmaic.v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** A child page gets no arbitrary Harness RPC or credential surface. */
export function acceptsMessage(event, source, origin) {
  return Boolean(source && event.source === source && event.origin === origin &&
    event.data?.channel === CHANNEL && UUID.test(event.data.requestId) &&
    event.data.type === "library");
}
