import { defineScienceTool, objectSchema as obj, arraySchema as arr } from "../../../../src/lib/bounded-science-mcp.mjs";
import { countSchema as count, finiteSchema as finite } from "../../../../src/lib/science-execution.mjs";

const text = { type: "string", minLength: 1 };
const source = { name: "boulder-opal / fire-opal", version: "6.1.0 / 12.3.0", repository: "https://docs.q-ctrl.com/" };
export const definition = defineScienceTool({
  name: "prepare_boulder_opal_control",
  description: "Construct Q-CTRL Boulder Opal's computational graph for a single-qubit piecewise-constant Hamiltonian H/hbar = (omegaX X + omegaY Y + detuning Z)/2. Segment angular frequencies are rad/s, duration is seconds; segments have equal duration. Returns actual SDK graph serialization ready for evaluation, without cloud execution or credentials. It does not compute the unitary.",
  source, inputSchema: obj({ durationSeconds: { ...finite(0, 1e-6), exclusiveMinimum: 0 }, segments: { ...arr(obj({ omegaX: finite(), omegaY: finite(), detuning: finite() }), 1), default: [{ omegaX: 3141592.653589793, omegaY: 0, detuning: 0 }] } }),
  resultSchema: obj({ graphJson: text, nodeCount: count(), segmentCount: count(), outputNode: { const: "unitaries" }, outputShape: arr(count(), 3, 3), networkUsed: { const: false }, evaluated: { const: false } }),
});
export const statusDefinition = defineScienceTool({
  name: "get_qctrl_job_status",
  description: "Read the current status of an existing Boulder Opal or Fire Opal job using the official SDK and configured QCTRL_API_KEY. The fixed Q-CTRL HTTPS endpoint is contacted only when this action is called. Does not submit, cancel, poll until completion, or execute any job. Missing credentials fail before importing the cloud client or sending requests.",
  source, inputSchema: obj({ product: { enum: ["boulder-opal", "fire-opal"] }, jobId: { type: "string", pattern: "^[0-9]+$" }, organizationSlug: { type: "string", pattern: "^[a-zA-Z0-9_-]*$", default: "" }, requestTimeoutSeconds: { ...finite(0, 60), exclusiveMinimum: 0 } }),
  resultSchema: obj({ product: { enum: ["boulder-opal", "fire-opal"] }, jobId: text, status: { enum: ["SUCCESS", "REVOKED", "FAILURE", "PENDING", "RECEIVED", "RETRY", "STARTED"] }, networkUsed: { const: true }, hardwareExecuted: { const: false }, endpoint: { const: "https://federation-service.q-ctrl.com" } }),
});
export const definitions = [definition, statusDefinition];
