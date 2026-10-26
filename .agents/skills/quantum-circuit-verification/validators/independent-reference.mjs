import path from "node:path";
import { fileURLToPath } from "node:url";
import { runLocalJsonProcess } from "../../../../src/lib/local-json-process.mjs";
import { preparedPythonLaunch } from "../../../../src/lib/prepared-python.mjs";
import { normalizeAuditRequest } from "../core/request-contract.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const projectRoot = path.resolve(root, "../../..");
const allowedEnvironment = [
  "HOME", "PATH", "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "REQUESTS_CA_BUNDLE",
  "SSL_CERT_DIR", "SSL_CERT_FILE", "SYSTEMROOT", "TEMP", "TMP", "TMPDIR",
  "UV_CACHE_DIR", "UV_PYTHON_INSTALL_DIR", "WINDIR",
];

export function independentReference(request, signal) {
  signal?.throwIfAborted();
  normalizeAuditRequest(request);
  return preparedPythonLaunch({ skillRoot: root, args: [path.join(root, "validators/reference.py")] })
    .then(launch => runLocalJsonProcess({
      ...launch, cwd: projectRoot,
      env: Object.fromEntries(allowedEnvironment.filter(name => process.env[name]).map(name => [name, process.env[name]])),
      input: request, signal, timeoutMs: 30000, maxOutputBytes: 65536,
      label: "independent Qiskit unitary reference",
    }));
}
