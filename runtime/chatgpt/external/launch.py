"""Thin process boundary around fixed upstream MCPs; no scientific reimplementation."""
import importlib
import os
from pathlib import Path
import sys

# No implicit .env files, saved host accounts or telemetry. Credentials enter
# only through the reviewed parent's environment for this specific operation.
import dotenv
dotenv.load_dotenv = lambda *args, **kwargs: False
os.environ["DO_NOT_TRACK"] = "1"
server, module = sys.argv[1:3]
if server == "qpanda_runtime":
    from qpanda_tls import install_verified_transport
    install_verified_transport()
if server == "qiskit_ibm_runtime":
    runtime = importlib.import_module("qiskit_ibm_runtime_mcp_server.ibm_runtime")
    def create_service(channel, instance):
        from qiskit_ibm_runtime import QiskitRuntimeService
        token = os.environ.get("QISKIT_IBM_TOKEN")
        if not token:
            raise ValueError("IBM Quantum credentials are required in OpenQuantum settings")
        return QiskitRuntimeService(channel=channel, token=token, instance=instance)
    runtime._create_runtime_service = create_service
if server == "qiskit_ibm_transpiler":
    provider = importlib.import_module("qiskit_ibm_transpiler_mcp_server.qiskit_runtime_service_provider")
    def initialize_service(token=None, channel="ibm_quantum_platform"):
        from qiskit_ibm_runtime import QiskitRuntimeService
        value = os.environ.get("QISKIT_IBM_TOKEN")
        if not value:
            raise ValueError("IBM Quantum credentials are required in OpenQuantum settings")
        return QiskitRuntimeService(channel=channel, token=value)
    provider.QiskitRuntimeServiceProvider._initialize_service = staticmethod(initialize_service)
if server == "quantum_hardware":
    source = Path(sys.argv[3])
    sys.path.insert(0, str(source))
    upstream = importlib.import_module("server")
    upstream._snapshot._init_db()
    chemistry = importlib.import_module("tools_chemistry")
    chemistry.submit_job = upstream.submit_job
    chemistry.job_results = upstream.job_results
    upstream.mcp.run(transport="stdio")
else:
    upstream = importlib.import_module(module)
    if server == "qpanda_runtime":
        from qpanda_compat import install_runtime_adapters
        runtime = importlib.import_module("qpanda3_runtime_mcp_server.runtime")
        install_runtime_adapters(upstream, runtime)
    # Unfiltered upstream surface is verified by the parent; account operations
    # are not exposed through OpenQuantum's fixed dispatch allowlist.
    upstream.mcp.run(transport="stdio", show_banner=False)
