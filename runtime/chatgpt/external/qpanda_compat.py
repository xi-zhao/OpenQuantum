"""JSON-to-SDK boundary for the pinned OriginQ MCP and runtime 1.0.2."""
import asyncio
from pyqpanda3.hamiltonian import PauliOperator


def to_observable(value):
    # Preserve signed coefficients; strings have the upstream default 1.0.
    return PauliOperator({value.strip(): 1.0} if isinstance(value, str) else value)


def install_runtime_adapters(upstream, runtime):
    create_binding = upstream.create_circuit_observable_binding
    estimate = upstream.estimate
    batch_estimate = upstream.batch_estimate
    product = upstream.add_product_rule
    zip_rule = upstream.add_zip_rule

    async def create_typed_binding(circuits, observables):
        return await create_binding(circuits, [to_observable(value) for value in observables])

    async def estimate_typed(circuit, observable, device_id):
        return await estimate(circuit, to_observable(observable), device_id)

    async def batch_estimate_typed(circuits, observable, device_id):
        return await batch_estimate(circuits, to_observable(observable), device_id)

    async def add_rule(binding_id, circuit_indices, observable_indices, zipped=False):
        binding = runtime._circuit_observable_bindings.get(binding_id)
        if binding is None:
            return {"status": "error", "message": "Binding not found in this MCP session."}
        data = binding.data()
        for indices, name in [(circuit_indices, "circuits"), (observable_indices, "observables")]:
            if not indices or any(type(index) is not int or not 0 <= index < len(data[name]) for index in indices):
                return {"status": "error", "message": f"Invalid {name} indices; binding unchanged."}
        if zipped and len(circuit_indices) != len(observable_indices):
            return {"status": "error", "message": "Zip index lists must have equal length; binding unchanged."}
        return await (zip_rule if zipped else product)(binding_id, circuit_indices, observable_indices)

    async def add_product(binding_id, circuit_indices, observable_indices):
        return await add_rule(binding_id, circuit_indices, observable_indices)

    async def add_zip(binding_id, circuit_indices, observable_indices):
        return await add_rule(binding_id, circuit_indices, observable_indices, zipped=True)

    async def query_task(task_id, include_results=False):
        task = runtime._task_managers.get(task_id)
        if task is None:
            return {"status": "error", "message": "Task not found in this MCP session."}
        try:
            results, finished, progress = await asyncio.to_thread(task.try_get_result, timeout=150)
        except Exception:
            return {"status": "error", "task_id": task_id, "task_status": "UNKNOWN",
                    "message": "Task query failed; the remote state is unknown. Retry the query, not the submission."}

        def markers(value):
            if isinstance(value, list):
                return {item for child in value for item in markers(child)}
            if isinstance(value, str) and value.startswith("Task Status:"):
                return {value.removeprefix("Task Status:").lower()}
            return set()

        states = markers(results)
        state = "FAILED" if "failed" in states else "CANCELLED" if "canceled" in states else "DONE" if finished else "RUNNING"
        value = {"status": "success", "task_id": task_id, "task_status": state,
                 "progress": progress, "all_subtasks_finished": finished}
        if state in ("FAILED", "CANCELLED"):
            return {**value, "status": "error", "message": "At least one subtask failed or was cancelled; no successful scientific result is asserted. Other subtasks may still be running."}
        if include_results:
            if not finished:
                return {**value, "status": "pending", "message": "Results are not complete; query again later."}
            value["results"] = results if isinstance(results, list) else [results]
        return value

    async def task_status(task_id):
        return await query_task(task_id)

    async def task_results(task_id):
        return await query_task(task_id, include_results=True)

    async def list_known_tasks(limit=10):
        if not isinstance(limit, int) or not 1 <= limit <= 100:
            raise ValueError("limit must be between 1 and 100")
        ids = list(runtime._task_managers)
        return {"status": "success", "scope": "current_session",
                "tasks": [{"task_id": value} for value in reversed(ids[-limit:])],
                "total_known_tasks": len(ids), "account_history_available": False,
                "message": "Only tasks recorded in this MCP session; not account-wide history."}

    upstream.create_circuit_observable_binding = create_typed_binding
    upstream.estimate = estimate_typed
    upstream.batch_estimate = batch_estimate_typed
    upstream.add_product_rule = add_product
    upstream.add_zip_rule = add_zip
    upstream.get_task_status = task_status
    upstream.get_task_results = task_results
    upstream.list_my_tasks = list_known_tasks
