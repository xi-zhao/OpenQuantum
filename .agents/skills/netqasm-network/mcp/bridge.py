"""NetQASM compilation and an optional, user-installed SquidASM backend."""
import base64
import contextlib
import importlib.metadata
import json
import sys


def prepare(value):
    from netqasm.sdk.connection import DebugConnection
    from netqasm.sdk.epr_socket import EPRSocket
    from netqasm.backend.messages import deserialize_host_msg, SubroutineMessage
    from netqasm.lang.parsing import deserialize
    DebugConnection.node_ids = {"Alice": 0, "Bob": 1}
    programs = []
    for node, peer, basis in [("Alice", "Bob", value["aliceBasis"]), ("Bob", "Alice", value["bobBasis"])]:
        socket = EPRSocket(peer)
        with DebugConnection(node, epr_sockets=[socket], max_qubits=1) as connection:
            qubit = (socket.create_keep() if node == "Alice" else socket.recv_keep())[0]
            if basis == "X":
                qubit.H()
            qubit.measure()
        messages = [deserialize_host_msg(raw) for raw in connection.storage]
        compiled = [message for message in messages if isinstance(message, SubroutineMessage)]
        if len(compiled) != 1:
            raise ValueError("Expected one compiled subroutine per network node")
        binary = compiled[0].subroutine
        subroutine = deserialize(binary)
        if bytes(subroutine) != binary:
            raise ValueError("NetQASM binary round-trip failed")
        programs.append({"node": node, "basis": basis, "subroutineText": str(subroutine), "subroutineBase64": base64.b64encode(binary).decode(), "instructions": len(subroutine.instructions)})
    return {"programs": programs, "backend": "NetQASM DebugConnection compiler", "simulated": False, "networkUsed": False}


def simulate(value):
    packages = ["squidasm", "netsquid", "netqasm", "netsquid-netbuilder", "netsquid-magic", "pydynaa"]
    versions = []
    try:
        for package in packages:
            versions.append({"package": package, "version": importlib.metadata.version(package)})
    except importlib.metadata.PackageNotFoundError:
        raise ValueError("SquidASM/NetSquid simulation dependencies are not configured. Install the optional licensed simulation stack in the prepared environment using your own NetSquid access; no installation or network request was attempted") from None
    if versions[0]["version"] != "0.13.6":
        raise ValueError("This adapter requires SquidASM 0.13.6; prepare the documented optional simulation environment")
    import netsquid as ns
    from squidasm.sim.stack.program import Program, ProgramMeta
    from squidasm.run.stack.run import run
    from squidasm.util.util import create_two_node_network

    class BellProgram(Program):
        def __init__(self, name, peer, basis):
            self.name, self.peer, self.basis = name, peer, basis

        @property
        def meta(self):
            return ProgramMeta(name=self.name + "Bell", csockets=[], epr_sockets=[self.peer], max_qubits=1)

        def run(self, context):
            socket = context.epr_sockets[self.peer]
            qubit = (socket.create_keep() if self.name == "Alice" else socket.recv_keep())[0]
            if self.basis == "X":
                qubit.H()
            measurement = qubit.measure()
            yield from context.connection.flush()
            return {"node": self.name, "measurement": int(measurement)}

    ns.set_random_state(seed=value["seed"])
    config = create_two_node_network(node_names=["Alice", "Bob"], link_noise=value["linkNoise"], link_delay=value["linkDelayNs"])
    results = run(config=config, programs={"Alice": BellProgram("Alice", "Bob", value["aliceBasis"]), "Bob": BellProgram("Bob", "Alice", value["bobBasis"])}, num_times=value["shots"])
    if len(results) != 2 or any(len(rows) != value["shots"] for rows in results):
        raise ValueError("SquidASM returned an incomplete two-node experiment")
    by_node = {rows[0]["node"]: rows for rows in results}
    counts = dict.fromkeys(["00", "01", "10", "11"], 0)
    for alice, bob in zip(by_node["Alice"], by_node["Bob"]):
        bits = f"{alice['measurement']}{bob['measurement']}"
        if bits not in counts:
            raise ValueError("SquidASM returned a nonbinary measurement")
        counts[bits] += 1
    return {"shots": value["shots"], "counts": [{"bits": bits, "count": count} for bits, count in counts.items()], "agreementFraction": (counts["00"] + counts["11"]) / value["shots"], "bitOrder": "Alice,Bob from left to right", "simulationVersions": versions, "simulationDependenciesLocked": False, "networkUsed": False}


def compute(value, tool_name):
    if tool_name == "prepare_netqasm_bell_program":
        return prepare(value)
    if tool_name == "simulate_squidasm_bell_pairs":
        return simulate(value)
    raise ValueError("Unknown NetQASM action")


if __name__ == "__main__":
    request = json.load(sys.stdin)
    with contextlib.redirect_stdout(sys.stderr):
        result = compute(request["input"], request["toolName"])
    json.dump({"schemaVersion": "1.0", "source": request["source"], "input": request["input"], "inputSha256": request["inputSha256"], "dependencyLockSha256": request["dependencyLockSha256"], "result": result, "scientificValidation": "not_evaluated", "limitations": [
        "Compilation only prepares NetQASM EPR create/receive and measurement instructions. It neither generates entanglement nor simulates a network.",
        "The optional simulation requires a user-installed licensed NetSquid stack. The public dependency lock covers NetQASM compilation only; optional runtime versions are reported separately.",
        "Simulation counts concern the configured two-node depolarizing link model, not a physical network. Observed agreement is not an entanglement witness or QKD security proof.",
        "Upstream NetQASM includes a patent/commercial-use notice; NetSquid access and any necessary rights are supplied by the user.",
    ]}, sys.stdout, allow_nan=False)
