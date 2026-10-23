"""Real SDK serialization through upstream functions; cloud service is a fixture."""
import asyncio
import json
from pathlib import Path
import sys
from types import SimpleNamespace

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / "runtime/chatgpt/external"))
from qpanda_compat import install_runtime_adapters
from qpanda3_runtime_mcp_server import server, runtime
from qpanda3_runtime.utils.union_type import get_observable
from qpanda3_runtime.task.qtask_manager import QTaskManager

captured = []


class LocalService:
    def device(self, device_id):
        assert device_id == "fixture-only"
        return device_id

    def estimate(self, pair, device):
        # Execute the exact fixed SDK serializer which rejects raw dicts.
        encoded = get_observable(pair[1], "str")
        captured.append(encoded)
        return SimpleNamespace(task_id=f"fixture-{len(captured)}")


class QueryService:
    def __init__(self, states): self.states = states
    def _start_tracking(self, *args, **kwargs): pass
    def _end_tracking(self, *args, **kwargs): pass
    def query_task(self, channel, ids, *args, **kwargs):
        if "exception" in self.states.values(): raise RuntimeError("fixture query unavailable")
        return [{"task_status": self.states[task_id], "taskType": "estimate", "taskResult": ["0.5"]} for task_id in ids]


async def main():
    runtime._service = LocalService()
    install_runtime_adapters(server, runtime)
    circuit = "QINIT 2\nCREG 2\nH q[0]\nCNOT q[0],q[1]"
    for operation in [server.estimate, server.batch_estimate]:
        value = circuit if operation is server.estimate else [circuit, circuit]
        for observable in [{"Z0 Z1": 0.5, "X0": -0.3}, "Z1"]:
            result = await operation(value, observable, "fixture-only")
            assert result["status"] == "success", result
    # Compare against independently constructed native PauliOperator inputs.
    from pyqpanda3.hamiltonian import PauliOperator
    expected = [get_observable(PauliOperator({"Z0 Z1": 0.5, "X0": -0.3}), "str"),
                get_observable(PauliOperator({"Z1": 1.0}), "str")]
    assert captured == expected * 2, captured
    assert len(runtime._task_managers) == 4

    created = await server.create_circuit_observable_binding([circuit], [{"Z0 Z1": 0.5}, "Z1"])
    assert created["status"] == "success", created
    binding_id = created["binding_id"]
    binding = runtime._circuit_observable_bindings[binding_id]
    before = binding.to_json_dict()
    for operation in [server.add_product_rule, server.add_zip_rule]:
        for circuits, observables in [([99], [0]), ([-1], [0]), ([0], [-1]), ([0], [2]), ([], [0]), ([True], [0])]:
            result = await operation(binding_id, circuits, observables)
            assert result["status"] == "error", result
            assert binding.to_json_dict() == before
    assert (await server.add_zip_rule(binding_id, [0], [0, 1]))["status"] == "error"
    assert binding.to_json_dict() == before
    assert (await server.add_product_rule(binding_id, [0], [0, 1]))["status"] == "success"

    for state, expected in [("failed", "FAILED"), ("canceled", "CANCELLED"), ("running", "RUNNING"), ("finished", "DONE"), ("exception", "UNKNOWN")]:
        task_id = f"state-{state}"
        runtime._task_managers[task_id] = QTaskManager(QueryService({task_id: state}), {"task_id": [task_id], "channel": "fixture"})
        for operation in [server.get_task_status, server.get_task_results]:
            result = await operation(task_id)
            assert result["task_status"] == expected, result
            if state in ("failed", "canceled", "exception"):
                assert result["status"] == "error" and "results" not in result, result
        if state == "finished": assert result["results"] == [[0.5]], result
        if state == "running": assert result["status"] == "pending" and "results" not in result
    runtime._task_managers["mixed"] = QTaskManager(QueryService({"a": "failed", "b": "running"}), {"task_id": ["a", "b"], "channel": "fixture"})
    mixed = await server.get_task_results("mixed")
    assert mixed["task_status"] == "FAILED" and not mixed["all_subtasks_finished"] and "results" not in mixed
    print(json.dumps({"estimate": True, "batch_estimate": True,
                      "signed_coefficients": True, "invalid_rules_unchanged": True,
                      "terminal_states": True, "partial_failure": True, "cloud_requests": 0}))


asyncio.run(main())
