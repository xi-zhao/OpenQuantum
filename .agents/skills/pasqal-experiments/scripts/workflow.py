"""File-based experiment helpers, not an agent runtime or scientific Validator.

Derived workflow contract: pasqal-io/agent-marketplace, Apache-2.0;
see ../NOTICE.md. User sequence files execute through the host's code Tool.
"""
import ast
import contextlib
import hashlib
import json
import math
import os
from pathlib import Path
import tempfile
from datetime import datetime, timezone
from importlib.metadata import version
from types import ModuleType
from uuid import uuid4

import numpy as np
from pulser import Sequence
from pulser.devices import Device
from pulser.json.abstract_repr.deserializer import deserialize_device
from pulser.noise_model import NoiseModel

from cloud import client


def encoded(value):
    return json.dumps(value, sort_keys=True, allow_nan=False, ensure_ascii=False).encode()


def digest(value):
    return hashlib.sha256(encoded(value)).hexdigest()


def file_digest(file):
    return hashlib.sha256(Path(file).read_bytes()).hexdigest()


def read(file):
    return json.loads(Path(file).read_text(), parse_constant=lambda _: (_ for _ in ()).throw(ValueError("Non-finite JSON")))


def write(file, data, *, new=False):
    """Atomic artifacts; exclusive creation for plans/receipts, durable before POST."""
    path = Path(file)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(encoded(data) + b"\n")
            stream.flush()
            os.fsync(stream.fileno())
        if new:
            os.link(temporary, path)  # fail if a concurrent call already reserved it
        else:
            os.replace(temporary, path)
        if os.name != "nt":
            directory = os.open(path.parent, os.O_RDONLY)
            try:
                os.fsync(directory)
            finally:
                os.close(directory)
    finally:
        Path(temporary).unlink(missing_ok=True)


def state_path(plan, kind, identity):
    # Durable submission artifacts, not Session/Job execution state. Shared by
    # Desktop and Codex so copying a plan/receipt cannot buy the same shots twice.
    root = Path(os.environ.get("OPENQUANTUM_PASQAL_STATE_ROOT", Path.home() / ".openquantum/pasqal-cloud"))
    key = digest([plan["region"], plan["project_id"], identity])
    return root / kind / (key + ".json")


@contextlib.contextmanager
def mutation_lock(plan, identity):
    lock = state_path(plan, "locks", identity)
    write(lock, {"pid": os.getpid(), "meaning": "exclusive cloud mutation; inspect before removing a stale lock"}, new=True)
    try:
        yield
    finally:
        lock.unlink()


def provenance():
    return {"packages": {p: version(p) for p in ("pulser-core", "pulser-simulation", "pasqal-cloud", "numpy", "scipy", "qutip")},
            "dependencyLockSha256": file_digest(Path(__file__).resolve().parents[2] / "pulser-dynamics/uv.lock"),
            "scientificValidation": "not_evaluated"}


def module(file, *, expected_sha256=None):
    """Load the convenience runner's single-file contract, not a Python sandbox.

    Helper functions/constants belong in this file. Multi-file research projects
    use the full native SDK through the host code Tool instead of this runner.
    """
    source = Path(file).read_bytes()
    source_sha256 = hashlib.sha256(source).hexdigest()
    if expected_sha256 is not None and source_sha256 != expected_sha256:
        raise ValueError("Observable code changed since preparation")
    tree = ast.parse(source, filename=str(file))
    # Bundled research examples also have a stand-alone CLI. This branch never
    # runs under our fixed module name and is not part of the loaded experiment.
    main_guard = ast.dump(ast.parse('__name__ == "__main__"', mode="eval").body)
    tree.body = [part for node in tree.body for part in
                 (node.orelse if isinstance(node, ast.If) and ast.dump(node.test) == main_guard else [node])]
    allowed_imports = {"__future__", "numpy", "scipy", "qutip", "pulser", "math", "cmath", "statistics",
                       "collections", "itertools", "functools", "operator", "typing"}
    dynamic_names = {"__import__", "__builtins__", "eval", "exec", "compile"}
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            names = [alias.name for alias in node.names] if isinstance(node, ast.Import) else [node.module or ""]
            if (isinstance(node, ast.ImportFrom) and node.level) or any(name.split(".")[0] not in allowed_imports for name in names):
                raise ValueError("Sequence must be self-contained: put local helpers and constants in the sequence file; only declared numerical imports are supported")
        if isinstance(node, ast.Name) and node.id in dynamic_names:
            raise ValueError("Sequence must be self-contained: dynamic code loading is unsupported")
    loaded = ModuleType("experiment_sequence")
    loaded.__file__ = str(file)
    # Compile the bytes we hashed, without a timestamp-based bytecode cache.
    exec(compile(tree, str(file), "exec"), loaded.__dict__)
    for name in ("build_sequence", "compute_observable"):
        function = getattr(loaded, name, None)
        if not callable(function) or getattr(function, "__globals__", None) is not loaded.__dict__:
            raise ValueError(f"Sequence must define its own {name} function")
    loaded.source_sha256 = source_sha256
    return loaded


def positive_int(value, name):
    if type(value) is not int or value <= 0:
        raise ValueError(f"{name} must be a positive integer")
    return value


def validate_spec(spec):
    for field in ("experiment_name", "device", "register", "scan", "observable", "shots_per_point"):
        if field not in spec:
            raise ValueError(f"Missing {field}")
    for field in ("experiment_name", "device"):
        if not isinstance(spec[field], str) or not spec[field].strip():
            raise ValueError(f"{field} must be a nonempty string")
    positive_int(spec["register"]["N_atoms"], "register.N_atoms")
    positive_int(spec["shots_per_point"], "shots_per_point")
    scan = spec["scan"]
    if not isinstance(scan["variable"], str) or not scan["variable"].isidentifier():
        raise ValueError("scan.variable must name a builder parameter")
    values = scan["values"]
    if not isinstance(values, list) or not values or any(type(v) not in (int, float) or not math.isfinite(v) for v in values):
        raise ValueError("scan.values must contain finite numbers")
    if len(set(values)) != len(values):
        raise ValueError("Duplicate scan values are ambiguous; use separate run artifacts for replicates")
    if not isinstance(scan.get("fixed_params", {}), dict):
        raise ValueError("scan.fixed_params must be an object")
    if scan["variable"] in scan.get("fixed_params", {}) or "device" in scan.get("fixed_params", {}):
        raise ValueError("fixed_params cannot override device or the scan variable")
    encoded(spec)
    return spec


def device_snapshot(project_id, region, device_name, output, *, sdk=None):
    sdk = sdk or client(project_id, region)
    specs = sdk.get_device_specs_dict()
    if device_name not in specs:
        raise ValueError("Selected device is absent from the project's device catalog")
    data = {"schemaVersion": 1, "project_id": project_id, "region": region,
            "name": device_name, "device": specs[device_name],
            "fetched_at": datetime.now(timezone.utc).isoformat(), "source": "pasqal-cloud-device-specs"}
    deserialize_device(data["device"])
    write(output, data, new=True)
    return data


def prepare(spec_file, sequence_file, output, *, target="local", project_id=None,
            region="fr", device_file=None, local_device=None, noise=None,
            backend_configuration=None, open_batch=False):
    spec = validate_spec(read(spec_file))
    if target not in ("local", "QPU", "EMU_MPS", "EMU_SV"):
        raise ValueError("Unsupported convenience target; use the full native SDK for additional backends")
    if target != "local" and (not project_id or region not in ("fr", "sa")):
        raise ValueError("Cloud preparation requires an explicit project and region")
    if target == "local" and backend_configuration is not None:
        raise ValueError("Local runs use explicit noise and solver options, not a cloud backend_configuration")
    if target == "QPU" and spec.get("open_questions"):
        raise ValueError("Resolve spec.open_questions before preparing a QPU plan")
    if device_file:
        snapshot = read(device_file)
        if target != "local" and (snapshot["project_id"] != project_id or snapshot["region"] != region):
            raise ValueError("Device snapshot belongs to another project or region")
        if snapshot["name"] != spec["device"]:
            raise ValueError("Device snapshot does not match the experiment spec")
        device = deserialize_device(snapshot["device"])
    else:
        if target != "local":
            raise ValueError("Cloud plans require a saved project device snapshot")
        import pulser.devices
        device = getattr(pulser.devices, local_device or spec["device"], None)
        if device is None or isinstance(device, type):
            raise ValueError("Unknown bundled device; use an explicit local stand-in or a cloud snapshot")
        snapshot = {"name": device.name, "device": device.to_abstract_repr(), "source": "pulser-bundled-stand-in"}
    if target == "QPU" and not isinstance(device, Device):
        raise ValueError("A virtual device cannot be submitted to a QPU")
    if target == "QPU" and device.max_runs is not None and spec["shots_per_point"] > device.max_runs:
        raise ValueError("shots_per_point exceeds the selected device's max_runs")
    if noise is not None:
        if not isinstance(noise, dict) or not noise.get("source") or not isinstance(noise.get("params"), dict):
            raise ValueError("Noise requires explicit source and Pulser NoiseModel params")
        NoiseModel(**noise["params"])  # Unknown or unsupported fields must fail.
    if target == "QPU" and (noise is not None or backend_configuration is not None):
        raise ValueError("Simulation configuration is not a hardware calibration")
    if target.startswith("EMU_"):
        from pulser.backend import BitStrings, EmulationConfig
        if noise is not None and backend_configuration is not None:
            raise ValueError("Choose a noise model or a full backend configuration, not both")
        if backend_configuration is None:
            backend_configuration = EmulationConfig(
                noise_model=NoiseModel(**noise["params"]) if noise else NoiseModel(),
                observables=[BitStrings(evaluation_times=[1.0], num_shots=spec["shots_per_point"])],
            ).to_abstract_repr()
        else:
            EmulationConfig.from_abstract_repr(backend_configuration)
    mod = module(sequence_file)
    if not callable(getattr(mod, "compute_observable", None)):
        raise ValueError("Sequence module must define compute_observable(counts)")
    rows = []
    for value in spec["scan"]["values"]:
        sequence = mod.build_sequence(device=device, **spec["scan"].get("fixed_params", {}), **{spec["scan"]["variable"]: value})
        if not isinstance(sequence, Sequence) or sequence.is_parametrized() or sequence.is_register_mappable():
            raise ValueError("build_sequence must return a concrete Pulser Sequence")
        if sequence.device != device:
            raise ValueError("Builder ignored the selected device")
        if target == "QPU":
            from pulser.backend import QPUBackend
            QPUBackend.validate_sequence(sequence, mimic_qpu=True)
        ids = list(sequence.register.qubit_ids)
        if len(ids) != spec["register"]["N_atoms"]:
            raise ValueError("Register size differs from the spec; record reduced-size experiments in a separate spec")
        if "atom_ids" in spec["register"] and ids != spec["register"]["atom_ids"]:
            raise ValueError("Register order differs from spec.register.atom_ids")
        serialized = sequence.to_abstract_repr()
        Sequence.from_abstract_repr(serialized)
        rows.append({"scan_value": value, "atom_ids": ids,
                     "job": {"runs": spec["shots_per_point"], "serialized_sequence": serialized}})
    fingerprints = [(digest(json.loads(r["job"]["serialized_sequence"])), r["job"]["runs"]) for r in rows]
    if len(set(fingerprints)) != len(fingerprints):
        raise ValueError("Different scan values produce identical jobs; check builder parameters and pulse quantization before submission")
    plan = {"schemaVersion": 1, "request_id": str(uuid4()), "target": target,
            "project_id": project_id, "region": region, "open": bool(open_batch),
            "spec": spec, "specSha256": file_digest(spec_file),
            "sequenceSha256": mod.source_sha256, "device": snapshot,
            "noise": noise, "backend_configuration": backend_configuration,
            "total_shots": sum(r["job"]["runs"] for r in rows), "rows": rows,
            **provenance()}
    plan["planSha256"] = digest(plan)
    write(output, plan, new=True)
    return plan


def verify_plan(plan):
    content = {k: v for k, v in plan.items() if k != "planSha256"}
    if plan.get("planSha256") != digest(content):
        raise ValueError("Plan changed; prepare and review a new plan")
    return plan


def verify_environment(plan):
    """Bind new execution to the reviewed environment; keep recovery available."""
    current = provenance()
    for field in ("packages", "dependencyLockSha256"):
        if plan.get(field) != current[field]:
            raise ValueError(f"Execution environment differs from the plan: {field}; restore the reviewed environment or prepare and review a new plan")
    return current


def counts_checked(counts, n):
    if not isinstance(counts, dict) or not counts:
        raise ValueError("No sampled counts")
    if any(not isinstance(s, str) or len(s) != n or set(s) - {"0", "1"} or type(c) is not int or c < 0 for s, c in counts.items()):
        raise ValueError("Invalid bitstrings or counts")
    if sum(counts.values()) <= 0:
        raise ValueError("Empty sampling distribution")
    return counts


def local_run(plan_file, output, *, seed=42, max_atoms=12, solver=None):
    from pulser_simulation import QutipEmulator
    plan = verify_plan(read(plan_file))
    current = verify_environment(plan)
    if plan["target"] != "local":
        raise ValueError("local-run requires a local plan")
    positive_int(max_atoms, "max_atoms")
    if any(len(row["atom_ids"]) > max_atoms for row in plan["rows"]):
        raise ValueError("Register exceeds the explicit local resource budget; no automatic size reduction")
    output_data = {"schemaVersion": 1, "plan": plan, "networkUsed": False,
                   "seed": seed, "solver": solver or {}, "rows": [], **current}
    write(output, output_data, new=True)
    state = np.random.get_state()
    try:
        np.random.seed(seed)
        for row in plan["rows"]:
            sequence = Sequence.from_abstract_repr(row["job"]["serialized_sequence"])
            emulator = QutipEmulator.from_sequence(sequence, noise_model=NoiseModel(**plan["noise"]["params"]) if plan["noise"] else None)
            result = emulator.run(**(solver or {}))
            counts = dict(result.sample_final_state(N_samples=row["job"]["runs"]))
            output_data["rows"].append({"scan_value": row["scan_value"], "atom_ids": row["atom_ids"],
                                        "status": "DONE", "counts": counts})
            write(output, output_data)
    finally:
        np.random.set_state(state)
    return output_data


def batch_summary(batch):
    return {"batch_id": str(batch.id), "project_id": str(batch.project_id),
            "status": batch.status, "open": batch.open}


def match_jobs(batch, plan, previous_ids=(), recorded=None):
    """Never infer scan values by returned job order; match serialized programs."""
    recorded_ids = {r["job_id"] for r in recorded} if recorded else None
    jobs = [job for job in batch.ordered_jobs if (str(job.id) in recorded_ids if recorded_ids else str(job.id) not in previous_ids)]
    if len(jobs) != len(plan["rows"]):
        raise ValueError("Job count differs from plan; reconcile the batch before analysis")
    matched = []
    for row in plan["rows"]:
        candidates = [job for job in jobs if job.runs == row["job"]["runs"]
                      and not job.variables and job.sequence is not None
                      and digest(json.loads(job.sequence)) == digest(json.loads(row["job"]["serialized_sequence"]))]
        if len(candidates) != 1:
            raise ValueError("Job-to-scan mapping is ambiguous or differs from the submitted program")
        job = candidates[0]
        jobs.remove(job)
        matched.append({"job_id": str(job.id), "scan_value": row["scan_value"], "atom_ids": row["atom_ids"]})
    return matched


def claim_for(record, receipt_file):
    plan = record["plan"]
    return {"request_id": plan["request_id"], "planSha256": plan["planSha256"],
            "recovery_record": record, "receipt": str(Path(receipt_file).resolve())}


def save_receipt(receipt_file, record):
    """Persist the latest recovery snapshot before the user-facing copy."""
    plan = verify_plan(record["plan"])
    index = state_path(plan, "requests", plan["request_id"])
    claim = read(index)
    if claim["planSha256"] != plan["planSha256"]:
        raise ValueError("Submission claim differs from the receipt plan")
    claim["recovery_record"] = record
    write(index, claim)
    write(receipt_file, record)


def load_receipt(receipt_file):
    record = read(receipt_file)
    plan = verify_plan(record["plan"])
    claim = read(state_path(plan, "requests", plan["request_id"]))
    if claim["planSha256"] != plan["planSha256"]:
        raise ValueError("Submission claim differs from the receipt plan")
    # A copied/older receipt is a locator, never an authority for stale job IDs.
    return claim["recovery_record"]


def clear_pending(plan, batch_id):
    pending = state_path(plan, "pending-batches", batch_id)
    if pending.exists() and read(pending)["request_id"] == plan["request_id"]:
        pending.unlink()


def submit(plan_file, receipt_file, approve_plan, *, parent_receipt=None, sdk=None):
    plan = verify_plan(read(plan_file))
    verify_environment(plan)
    if plan["target"] == "local" or approve_plan != plan["planSha256"]:
        raise ValueError("Review the cloud plan and pass its exact --approve-plan digest under host authorization")
    if Path(receipt_file).exists():
        raise ValueError("Receipt already exists; recover or harvest, never resubmit blindly")
    sdk = sdk or client(plan["project_id"], plan["region"])
    if sdk.project_id != plan["project_id"]:
        raise ValueError("SDK project differs from the approved plan")
    live = sdk.get_device_specs_dict().get(plan["device"]["name"])
    if live is None or digest(json.loads(live)) != digest(json.loads(plan["device"]["device"])):
        raise ValueError("Device specification changed; prepare a new plan")
    parent = load_receipt(parent_receipt) if parent_receipt else None
    # Lock order is always request, then batch. Recovery cannot overlap create
    # before its response provides a batch ID; control waits for batch mapping.
    with contextlib.ExitStack() as locks:
        locks.enter_context(mutation_lock(plan, plan["request_id"]))
        claim_file = state_path(plan, "requests", plan["request_id"])
        if claim_file.exists():
            raise FileExistsError("This plan already has a submission claim; recover its original receipt")
        if parent:
            locks.enter_context(mutation_lock(plan, parent["batch_id"]))
        previous = []
        pending_file = state_path(plan, "pending-batches", parent["batch_id"]) if parent else None
        if parent:
            parent = load_receipt(parent_receipt)
            if pending_file.exists():
                raise ValueError("This batch has an unresolved submission; recover its receipt before adding jobs")
            if parent["state"] != "submitted" or len(parent["jobs"]) != len(parent["plan"]["rows"]):
                raise ValueError("Recover the parent receipt before adding jobs")
            original = verify_plan(parent["plan"])
            for key in ("project_id", "region", "target", "device", "backend_configuration"):
                if original[key] != plan[key]:
                    raise ValueError(f"Open batch differs from plan: {key}")
            batch = sdk.get_batch(parent["batch_id"])
            if batch.project_id != plan["project_id"] or not batch.open:
                raise ValueError("Batch is closed or belongs to another project")
            previous = [str(job.id) for job in batch.ordered_jobs]
        record = {"schemaVersion": 1, "state": "prepared", "send_attempted": False, "plan": plan,
                  "previous_job_ids": previous, "jobs": [],
                  "batch_id": parent["batch_id"] if parent else None,
                  "operation": "add_jobs" if parent else "create_batch"}
        # A permanent per-request claim also covers another receipt pathname or
        # a copy of this plan. An uncertain outcome must never remove the claim.
        # Reserve the batch first. A crash during claim/receipt creation must
        # block another append and retain proof that this request was unsent.
        if pending_file:
            write(pending_file, claim_for(record, receipt_file), new=True)
        write(claim_file, claim_for(record, receipt_file), new=True)
        write(receipt_file, record, new=True)
        try:
            # This is dispatch intent: failure after this durable marker is
            # conservatively unknown, even if the process dies before HTTP.
            record.update(state="submitting", send_attempted=True)
            save_receipt(receipt_file, record)
            payload = [r["job"] for r in plan["rows"]]
            if parent:
                batch = sdk.add_jobs(record["batch_id"], payload, wait=False)
            else:
                from pasqal_cloud.device import DeviceTypeName
                batch = sdk.create_batch(None, payload, open=plan["open"], wait=False,
                                         device_type=None if plan["target"] == "QPU" else DeviceTypeName(plan["target"]),
                                         backend_configuration=plan["backend_configuration"],
                                         tags=["openquantum", "oq-request:" + plan["request_id"], plan["spec"]["experiment_name"]])
            if not parent:
                locks.enter_context(mutation_lock(plan, str(batch.id)))
            record.update(batch_summary(batch), state="mapping_required")
            if pending_file is None:
                pending_file = state_path(plan, "pending-batches", record["batch_id"])
                write(pending_file, claim_for(record, receipt_file), new=True)
            save_receipt(receipt_file, record)  # batch ID before any lazy job fetch
            record["jobs"] = match_jobs(batch, plan, previous)
            record["state"] = "submitted"
            save_receipt(receipt_file, record)
            clear_pending(plan, record["batch_id"])
        except BaseException:
            record["state"] = "outcome_unknown" if not record["batch_id"] or parent else "mapping_required"
            save_receipt(receipt_file, record)
            raise
    return record


def recover(receipt_file, batch_id=None, *, plan_file=None, sdk=None):
    plan = verify_plan(read(receipt_file)["plan"] if Path(receipt_file).exists() else read(plan_file))
    with contextlib.ExitStack() as locks:
        locks.enter_context(mutation_lock(plan, plan["request_id"]))
        if not Path(receipt_file).exists():
            index = state_path(plan, "requests", plan["request_id"])
            # An append can be interrupted between reserving its batch and
            # creating its request index. The reservation contains all inputs.
            claim = read(index if index.exists() else state_path(plan, "pending-batches", batch_id))
            if claim["planSha256"] != plan["planSha256"] or claim["receipt"] != str(Path(receipt_file).resolve()):
                raise ValueError("Submission claim does not match this plan and receipt")
            if not index.exists():
                write(index, claim, new=True)
            write(receipt_file, claim["recovery_record"], new=True)
        record = load_receipt(receipt_file)
        chosen = batch_id or record["batch_id"]
        if record["batch_id"] and chosen != record["batch_id"]:
            raise ValueError("Cannot replace a recorded batch ID")
        if chosen:
            locks.enter_context(mutation_lock(plan, chosen))
            record = load_receipt(receipt_file)
        if not record["send_attempted"]:
            # Do not match some later request's identical programs to this one.
            record["state"] = "not_submitted"
            save_receipt(receipt_file, record)
            if chosen:
                clear_pending(plan, chosen)
            return record
        if not chosen:
            raise ValueError("Find oq-request:<request_id> with SDK get_batches; pass its batch ID; do not create a replacement")
        sdk = sdk or client(plan["project_id"], plan["region"])
        batch = sdk.get_batch(chosen)
        if batch.project_id != plan["project_id"] or sdk.project_id != plan["project_id"]:
            raise ValueError("Batch belongs to another project")
        if record["operation"] == "create_batch" and "oq-request:" + plan["request_id"] not in (batch.tags or []):
            raise ValueError("Batch does not carry the request identity")
        mapping = match_jobs(batch, plan, record["previous_job_ids"], record["jobs"])
        if record["jobs"] and mapping != record["jobs"]:
            raise ValueError("Recorded job identity changed")
        record.update(batch_summary(batch), state="submitted", jobs=mapping)
        save_receipt(receipt_file, record)
        clear_pending(plan, chosen)
    return record


def control(receipt_file, action, confirmed=False, *, sdk=None):
    if action not in ("close", "cancel") or not confirmed:
        raise ValueError("close/cancel require host authorization and --confirm")
    record = load_receipt(receipt_file)
    plan = verify_plan(record["plan"])
    if not record["batch_id"]:
        raise ValueError("Recover a batch ID first")
    with mutation_lock(plan, record["batch_id"]):
        record = load_receipt(receipt_file)
        sdk = sdk or client(plan["project_id"], plan["region"])
        batch = sdk.get_batch(record["batch_id"])
        if batch.project_id != plan["project_id"] or sdk.project_id != plan["project_id"]:
            raise ValueError("Batch belongs to another project")
        record["control"] = {"action": action, "state": "requested"}
        save_receipt(receipt_file, record)
        batch = (sdk.close_batch if action == "close" else sdk.cancel_batch)(record["batch_id"])
        record.update(batch_summary(batch))
        record["control"]["state"] = "response_received"
        save_receipt(receipt_file, record)
    return record


def harvest(receipt_file, output, *, sdk=None):
    record = load_receipt(receipt_file)
    plan = verify_plan(record["plan"])
    if not record["jobs"]:
        raise ValueError("Recover the job mapping first")
    sdk = sdk or client(plan["project_id"], plan["region"])
    batch = sdk.get_batch(record["batch_id"])
    if batch.project_id != plan["project_id"] or sdk.project_id != plan["project_id"]:
        raise ValueError("Batch belongs to another project")
    jobs = {str(job.id): job for job in batch.ordered_jobs}
    data = {"schemaVersion": 1, "plan": plan, **batch_summary(batch),
            "networkUsed": True, "rows": [], **provenance()}
    write(output, data, new=True)
    for mapping in record["jobs"]:
        job = jobs.get(mapping["job_id"])
        row = {**mapping, "status": job.status if job else "MISSING", "counts": None}
        data["rows"].append(row)
        write(output, data)
        if job and job.status == "DONE":
            full_result = job.full_result
            row["raw_result"] = full_result  # preserve before validation/observables
            row["counts"] = full_result.get("counter") if full_result else None
            write(output, data)
            if full_result and full_result.get("serialised_results"):
                from pulser.backend import Results
                result = Results.from_abstract_repr(full_result["serialised_results"])
                if list(result.atom_order) != mapping["atom_ids"]:
                    row["status"] = "ATOM_ORDER_MISMATCH"
                    row["counts"] = None
                else:
                    try:
                        row["counts"] = dict(result.final_bitstrings)
                    except (ValueError, RuntimeError):
                        row["status"] = "NO_FINAL_BITSTRINGS"
                        row["counts"] = None
                write(output, data)
    return data


def summarize_counts(counts, atom_ids, observable, rng, bootstrap):
    counts_checked(counts, len(atom_ids))
    strings = list(counts)
    shots = sum(counts.values())
    probabilities = np.array(list(counts.values()), dtype=float) / shots
    mean = float(observable(counts))
    samples = [float(observable(dict(zip(strings, map(int, sample)))))
               for sample in rng.multinomial(shots, probabilities, size=bootstrap)]
    error = float(np.std(samples, ddof=1))
    if not math.isfinite(mean) or not math.isfinite(error):
        raise ValueError("Observable is undefined/non-finite for these counts")
    densities = [sum(c for s, c in counts.items() if s[i] == "1") / shots for i in range(len(atom_ids))]
    return {"observable": mean, "bootstrap_std": error, "shots": shots, "densities": densities}


def analyze(raw_file, sequence_file, output, *, bootstrap=300, seed=42,
            baseline_file=None, sigma_tolerance=3.0, readout=None):
    data = read(raw_file)
    plan = verify_plan(data["plan"])
    current = verify_environment(plan)
    if type(bootstrap) is not int or bootstrap < 2:
        raise ValueError("bootstrap must be at least 2")
    if not math.isfinite(sigma_tolerance) or sigma_tolerance <= 0:
        raise ValueError("sigma_tolerance must be positive and finite")
    observable = module(sequence_file, expected_sha256=plan["sequenceSha256"]).compute_observable
    rng = np.random.default_rng(seed)
    rows = []
    incoming = {r["scan_value"]: r for r in data["rows"]}
    if len(incoming) != len(data["rows"]):
        raise ValueError("Duplicate result scan values")
    if set(incoming) - {r["scan_value"] for r in plan["rows"]}:
        raise ValueError("Unexpected result scan values")
    for planned in plan["rows"]:
        row = incoming.get(planned["scan_value"], {})
        result = {"scan_value": planned["scan_value"], "atom_ids": planned["atom_ids"],
                  "status": row.get("status", "MISSING"), "observation": None}
        if row.get("atom_ids") != planned["atom_ids"] and row:
            raise ValueError("Result atom order differs from plan")
        if row.get("status") == "DONE":
            try:
                stats = summarize_counts(row["counts"], row["atom_ids"], observable, rng, bootstrap)
                if stats["shots"] != planned["job"]["runs"]:
                    raise ValueError("Returned shot count differs from the plan")
                result["observation"] = stats
                if readout:
                    fp, fn = readout["p_false_pos"], readout["p_false_neg"]
                    if any(type(v) not in (int, float) or not math.isfinite(v) or not 0 <= v < 1 for v in (fp, fn)) or fp + fn >= 1 or not readout.get("source"):
                        raise ValueError("Readout correction requires sourced probabilities with fp + fn < 1")
                    stats["corrected_densities"] = [(p - fp) / (1 - fp - fn) for p in stats["densities"]]
            except (ValueError, TypeError, ZeroDivisionError):
                result["status"] = "INVALID_OBSERVATION"
                result["observation"] = None
        rows.append(result)
    report = {"schemaVersion": 1, "rawSha256": file_digest(raw_file),
              "sequenceSha256": plan["sequenceSha256"], "spec": plan["spec"],
              "bootstrap": bootstrap, "seed": seed, "rows": rows,
              "complete": all(r["observation"] is not None for r in rows),
              "readout": readout, "comparison": None, **current,
              "limitations": ["Finite-shot bootstrap excludes calibration and model uncertainty; degenerate samples can give zero uncertainty.",
                              "Readout correction applies only to per-site densities; values are not clipped and arbitrary observables are not corrected.",
                              "Model agreement is diagnostic, not scientific Acceptance or a hardware go-ahead."]}
    if baseline_file:
        baseline = read(baseline_file)
        if baseline["sequenceSha256"] != report["sequenceSha256"] or baseline["spec"] != report["spec"]:
            raise ValueError("Baseline uses a different experiment or observable")
        before = {r["scan_value"]: r for r in baseline["rows"]}
        comparisons = []
        for row in rows:
            reference = before.get(row["scan_value"])
            if not reference or reference["atom_ids"] != row["atom_ids"]:
                raise ValueError("Baseline atom order or scan points differ")
            a, b = row["observation"], reference["observation"]
            if a is None or b is None:
                continue
            error = math.hypot(a["bootstrap_std"], b["bootstrap_std"])
            difference = abs(a["observable"] - b["observable"])
            comparisons.append({"scan_value": row["scan_value"], "difference": difference,
                                "combined_std": error, "within_tolerance": difference <= sigma_tolerance * error})
        complete = report["complete"] and baseline["complete"] and len(comparisons) == len(rows)
        report["comparison"] = {"baselineSha256": file_digest(baseline_file), "sigma_tolerance": sigma_tolerance,
                                "status": ("consistent" if all(c["within_tolerance"] for c in comparisons) else "inconsistent") if complete else "incomplete",
                                "points": comparisons, "scope": "pointwise; no multiple-comparison correction"}
    write(output, report, new=True)
    return report


def plot(report_file, output):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    report = read(report_file)
    rows = [r for r in report["rows"] if r["observation"] is not None]
    if not rows:
        raise ValueError("No valid observations to plot")
    if Path(output).exists():
        raise FileExistsError(output)
    fig, ax = plt.subplots()
    ax.errorbar([r["scan_value"] for r in rows], [r["observation"]["observable"] for r in rows],
                yerr=[r["observation"]["bootstrap_std"] for r in rows], fmt="o-")
    ax.set(xlabel=report["spec"]["scan"]["variable"], ylabel=report["spec"]["observable"].get("type", "observable"),
           title=report["spec"]["experiment_name"] + (" (partial data)" if not report["complete"] else ""))
    fig.tight_layout()
    fig.savefig(output)
    plt.close(fig)
