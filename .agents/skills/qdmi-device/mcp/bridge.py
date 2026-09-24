"""Read-only QDMI client ABI adapter; no job functions are bound."""
import ctypes as C
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "src/lib"))
from science_bridge import execute

PTR, SIZE, INT = C.c_void_p, C.c_size_t, C.c_int
NOT_SUPPORTED = -9


def verified_file(entry):
    path = Path(entry["path"])
    if not path.is_absolute() or not path.is_file():
        raise ValueError("QDMI configured file must exist at an absolute path")
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != entry["sha256"]:
        raise ValueError("QDMI configured file digest mismatch; review and reconfigure before loading")
    return path


def compute(v):
    config_bytes = (ROOT / ".openquantum/qdmi/driver.json").read_bytes()
    config = json.loads(config_bytes)
    if config.get("interfaceVersion") != "1.3.3" or config.get("driverKind") not in ("example", "configured"):
        raise ValueError("Expected a reviewed QDMI 1.3.3 driver configuration")
    library_path = verified_file(config["driver"])
    for entry in config.get("deviceLibraries", []):
        verified_file(entry)
    if config.get("configuration"):
        os.environ["QDMI_CONF"] = str(verified_file(config["configuration"]))
    library = C.CDLL(str(library_path))
    def bind(name, args, result=INT):
        try:
            fn = getattr(library, name)
        except AttributeError:
            raise ValueError("QDMI driver lacks required symbol " + name) from None
        fn.argtypes, fn.restype = args, result
        return fn
    def checked(code, label):
        if code != 0:
            raise ValueError(f"QDMI {label} failed with status {code}")
    allocate = bind("QDMI_session_alloc", [C.POINTER(PTR)])
    initialize = bind("QDMI_session_init", [PTR])
    free = bind("QDMI_session_free", [PTR], None)
    query_session = bind("QDMI_session_query_session_property", [PTR, INT, SIZE, PTR, C.POINTER(SIZE)])
    query_device = bind("QDMI_device_query_device_property", [PTR, INT, SIZE, PTR, C.POINTER(SIZE)])
    query_site = bind("QDMI_device_query_site_property", [PTR, PTR, INT, SIZE, PTR, C.POINTER(SIZE)])
    query_operation = bind("QDMI_device_query_operation_property",
                           [PTR, PTR, SIZE, PTR, SIZE, PTR, INT, SIZE, PTR, C.POINTER(SIZE)])
    # These driver lifecycle symbols are an explicit opt-in, not part of the core QDMI client ABI.
    driver_init = bind("QDMI_driver_init", []) if config.get("exampleLifecycle", False) else None
    driver_close = bind("QDMI_driver_shutdown", []) if driver_init else None

    def query(fn, args, kind):
        required = SIZE()
        code = fn(*args, 0, None, C.byref(required))
        if code == NOT_SUPPORTED:
            return None
        checked(code, "property size query")
        n = required.value
        if n > v["maxPropertyBytes"]:
            raise ValueError("QDMI property exceeds maxPropertyBytes")
        if kind == "string":
            if n == 0:
                raise ValueError("QDMI string must include a null terminator")
            buffer = C.create_string_buffer(n)
        elif kind == "handles":
            if n % C.sizeof(PTR):
                raise ValueError("QDMI handle array has an invalid byte count")
            buffer = (PTR * (n // C.sizeof(PTR)))()
        else:
            if n != C.sizeof(SIZE):
                raise ValueError("QDMI size_t property has an invalid byte count")
            buffer = SIZE()
        if n == 0:
            return []
        actual = SIZE(n)
        checked(fn(*args, n, C.byref(buffer), C.byref(actual)), "property query")
        if actual.value != n:
            raise ValueError("QDMI property size changed during query; retry explicitly")
        if kind == "string":
            raw = bytes(buffer)
            if raw[-1] != 0:
                raise ValueError("QDMI string is not null terminated")
            return raw[:-1].decode("utf-8")
        if kind == "handles":
            values = list(buffer)
            if any(value is None for value in values):
                raise ValueError("QDMI returned a null object handle")
            return values
        if buffer.value > 2**53 - 1:
            raise ValueError("QDMI integer exceeds exact JSON representation")
        return buffer.value

    session = PTR()
    initialized_driver = False
    try:
        if driver_init:
            checked(driver_init(), "driver initialization")
            initialized_driver = True
        checked(allocate(C.byref(session)), "session allocation")
        if not session.value:
            raise ValueError("QDMI allocated a null session")
        if config.get("emptyToken", False):
            set_parameter = bind("QDMI_session_set_parameter", [PTR, INT, SIZE, PTR])
            # The official example uses an explicit empty token to request a read-only session.
            empty = C.create_string_buffer(b"")
            checked(set_parameter(session, 0, 1, empty), "read-only token")
        checked(initialize(session), "session initialization")
        devices = query(query_session, [session, 0], "handles")
        if devices is None:
            raise ValueError("QDMI driver does not support device enumeration")
        if len(devices) > v["maxDevices"]:
            raise ValueError("QDMI device count exceeds maxDevices; increase it explicitly")
        result = []
        for index, device in enumerate(devices):
            prop = lambda p, kind: query(query_device, [device, p], kind)
            sites = prop(5, "handles")
            site_indices = None if sites is None else [query(query_site, [device, site, 0], "size") for site in sites]
            if site_indices is not None and (None in site_indices or len(set(site_indices)) != len(site_indices)):
                raise ValueError("QDMI sites require distinct supported site indices")
            indices = dict(zip(sites or [], site_indices or []))
            coupling = prop(7, "handles")
            if coupling is not None:
                if len(coupling) % 2 or any(site not in indices for site in coupling):
                    raise ValueError("QDMI coupling refers to unknown sites or incomplete pairs")
                coupling = [[indices[coupling[i]], indices[coupling[i+1]]] for i in range(0, len(coupling), 2)]
            operations = prop(6, "handles")
            if operations is not None:
                operations = [{
                    "name": query(query_operation, [device, op, 0, None, 0, None, 0], "string"),
                    "numQubits": query(query_operation, [device, op, 0, None, 0, None, 1], "size"),
                    "numParameters": query(query_operation, [device, op, 0, None, 0, None, 2], "size"),
                } for op in operations]
            result.append({"index": index, "name": prop(0, "string"), "version": prop(1, "string"),
                "qdmiVersion": prop(3, "string"), "numQubits": prop(4, "size"),
                "sites": site_indices, "operations": operations, "coupling": coupling})
        return {"driverKind": config["driverKind"], "driverSha256": config["driver"]["sha256"],
            "configurationSha256": hashlib.sha256(config_bytes).hexdigest(),
            "interfaceVersion": "1.3.3", "queriedAt": datetime.now(timezone.utc).isoformat(),
            "devices": result, "hardwareVerified": False, "jobsSubmitted": 0}, [
            "Queries the explicitly configured trusted native driver; driver metadata is not a hardware calibration or scientific validation.",
            "The official example driver is simulated metadata only; configured vendor drivers require separate device verification.",
            "Unsupported properties are null, never inferred as zero or empty; coupling direction is preserved exactly as reported.",
            "No job creation, submission, cancellation or calibration API is exposed; no host credentials are forwarded."]
    finally:
        if session.value:
            free(session)
        if initialized_driver:
            checked(driver_close(), "driver shutdown")


execute(compute)
