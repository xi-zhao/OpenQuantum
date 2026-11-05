"""Version-specific SDK loader compatibility, not a program executor.

Call prepare_sdk before importing the affected SDK in a host-owned script.
No installation, remote access, model restrictions or numerical substitutes.
"""
import ctypes
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import platform
import sys
import sysconfig


def prepare_sdk(capability_id, *, data_directory=None):
    if capability_id == "qcover-optimization":
        import collections
        import collections.abc
        if not hasattr(collections, "Callable"):
            collections.Callable = collections.abc.Callable
    elif capability_id == "spinqit-simulation" and sys.platform == "darwin":
        arch = "arm_64" if platform.machine() == "arm64" else "x86_64"
        library = Path(sysconfig.get_path("purelib")) / "spinqit" / f"libSpinQInterface_darwin_{arch}.dylib"
        if not library.is_file():
            raise RuntimeError("SpinQit wheel lacks its bundled macOS interface library")
        ctypes.CDLL(str(library), mode=ctypes.RTLD_GLOBAL)
    elif capability_id == "vqnet-learning" and sys.platform == "darwin":
        spec = importlib.util.find_spec("pyvqnet")
        if spec is None:
            raise ModuleNotFoundError("Explicitly prepare the VQNet environment first")
        libraries = str(Path(spec.origin).parent / "libs") + os.pathsep + str(sysconfig.get_config_var("LIBDIR"))
        if os.environ.get("DYLD_LIBRARY_PATH") != libraries:
            if not sys.argv or not Path(sys.argv[0]).is_file():
                raise RuntimeError("VQNet macOS loader requires a saved script, not stdin or -c")
            os.execve(sys.executable, [sys.executable, "-B", *sys.argv], {**os.environ, "DYLD_LIBRARY_PATH": libraries})
    elif capability_id in ("flow-vqe", "slowquant-response"):
        root = Path(__file__).resolve().parents[2]
        source = root / os.environ.get("OPENQUANTUM_SDK_SOURCE_ROOT", ".openquantum/sdk-sources") / capability_id
        record = json.loads((source / "openquantum-source.json").read_text(encoding="utf-8"))
        libraries = json.loads((root / ".agents/sdk-libraries.json").read_text(encoding="utf-8"))["libraries"]
        expected = next(entry["sourceProject"] for entry in libraries if entry["id"] == capability_id)
        if any(record.get(key) != expected[key] for key in ("revision", "repository")):
            raise RuntimeError(f"{capability_id} source differs from the reviewed snapshot")
        if not isinstance(record.get("files"), dict) or not record["files"]:
            raise RuntimeError(f"{capability_id} source manifest is empty")
        links = record.get("symlinks", {})
        recorded = set(record["files"]) | set(links)
        ignored = {".git", "openquantum-source.json"}
        ignored.update(f"{name}/.git" for name in record.get("submodulePaths", []))
        found = set()
        for directory, directories, names in os.walk(source):
            for name in directories[:]:
                file = Path(directory) / name
                relative = file.relative_to(source).as_posix()
                if relative in ignored:
                    directories.remove(name)
                elif file.is_symlink():
                    directories.remove(name)
                    names.append(name)
                elif not any(item.startswith(relative + "/") for item in recorded):
                    raise RuntimeError(f"{capability_id} source has an unrecorded directory")
            found.update((Path(directory) / name).relative_to(source).as_posix() for name in names
                         if (Path(directory) / name).relative_to(source).as_posix() not in ignored)
        if found != recorded:
            raise RuntimeError(f"{capability_id} source files changed")
        for name, digest in record["files"].items():
            file = (source / name).resolve()
            if (source / name).is_symlink() or source.resolve() not in file.parents or hashlib.sha256(file.read_bytes()).hexdigest() != digest:
                raise RuntimeError(f"{capability_id} source changed; use an explicitly recorded task environment")
        for name, target in links.items():
            file = source / name
            if not file.is_symlink() or os.readlink(file) != target or source.resolve() not in file.resolve().parents:
                raise RuntimeError(f"{capability_id} source link changed")
        if capability_id == "slowquant-response":
            # Numba writes compiled kernels even with Python's -B option.
            cache = Path(os.environ.setdefault("NUMBA_CACHE_DIR", str(source.parent / ".numba-cache" / capability_id))).resolve()
            if cache == source.resolve() or source.resolve() in cache.parents:
                raise ValueError("SlowQuant JIT cache must be outside the fixed source checkout")
        sys.path.insert(0, str(source))
    elif capability_id == "qpanda-qubo" and sys.platform == "darwin":
        root = Path(__file__).resolve().parents[2]
        directory = Path(os.environ.get("OPENQUANTUM_NATIVE_SDK_ROOT", root / ".openquantum/sdk-native")) / "qpanda-qubo"
        record = json.loads((directory / "native.json").read_text())
        library = directory / "fmt/lib/libfmt.11.dylib"
        if record["revision"] != "40626af88bd7df9a5fb80be7b25ac85b122d6c21" or hashlib.sha256(library.read_bytes()).hexdigest() != record["sha256"]:
            raise RuntimeError("QPanda fmt ABI changed; rerun explicit SDK setup")
        libraries = str(library.parent)
        if os.environ.get("DYLD_LIBRARY_PATH", "").split(os.pathsep)[0] != libraries:
            if not sys.argv or not Path(sys.argv[0]).is_file():
                raise RuntimeError("QPanda macOS loader requires a saved script, not stdin or -c")
            previous = os.environ.get("DYLD_LIBRARY_PATH")
            value = libraries + (os.pathsep + previous if previous else "")
            os.execve(sys.executable, [sys.executable, "-B", *sys.argv], {**os.environ, "DYLD_LIBRARY_PATH": value})
    elif capability_id == "classiq-synthesis":
        os.environ["OTEL_SDK_DISABLED"] = "true"
        os.environ["CLASSIQ_TELEMETRY_MODE"] = "disabled"
    elif capability_id == "qctrl-workbench":
        import qctrlworkflowclient.utils
        # Do not run the import-time PyPI upgrade advisory in a locked environment.
        qctrlworkflowclient.utils.check_package_version = lambda _package: None
        os.environ["FIRE_OPAL_CLIENT_DISABLE_TRACKING"] = "True"
    elif capability_id == "pairinteraction-rydberg":
        root = Path(__file__).resolve().parents[2]
        spec = importlib.util.spec_from_file_location("oq_pair_database", root / ".agents/skills/pairinteraction-rydberg/mcp/database.py")
        database = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(database)
        if data_directory is None:
            database.verify_database()
            data_directory = database.database_directory()
        else:
            data_directory = Path(data_directory).resolve(strict=True)
            if not data_directory.is_dir():
                raise ValueError("PairInteraction data_directory must be a prepared directory")
        import pairinteraction.real as pi
        pi.Database.initialize_global_database(download_missing=False, database_dir=data_directory)
