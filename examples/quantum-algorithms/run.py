"""Run a documented open SDK example through the existing Harness shell Tool.

This CLI is a repository resource. It does not register a new Tool or manage
sessions, permissions, dependencies, jobs, or scientific Acceptance.
"""
import argparse
import importlib
from importlib.metadata import PackageNotFoundError, version
import inspect
import json
import math
from pathlib import Path
import sys
import tomllib


DIRECTORY = Path(__file__).parent
CATALOG = {row["algorithm"]: row for row in json.loads((DIRECTORY / "coverage.json").read_text())["guides"] if row["algorithm"]}
DEPENDENCIES = tomllib.loads((DIRECTORY / "pyproject.toml").read_text())


def setup_hint(algorithm):
  groups = CATALOG[algorithm]["dependencyGroups"]
  options = " ".join("--group " + group for group in groups) if groups else "--minimal"
  return "npm run capability:algorithms:setup -- " + options


def load_algorithm(name):
  if name not in CATALOG:
    raise ValueError(f"Unknown algorithm {name}; use --list")
  try:
    module = Path(CATALOG[name]["exampleFile"]).stem
    return importlib.import_module(module).ALGORITHMS[name]
  except ModuleNotFoundError as error:
    raise ValueError(f"Missing dependency {error.name} for {name}; run {setup_hint(name)}") from error


def dependency_versions(name):
  def group_packages(group):
    for item in DEPENDENCIES["dependency-groups"][group]:
      if isinstance(item, str):
        yield item
      else:
        yield from group_packages(item["include-group"])
  packages = list(DEPENDENCIES["project"]["dependencies"])
  for group in CATALOG[name]["dependencyGroups"]:
    packages.extend(group_packages(group))
  return {package: version(package) for package in sorted({spec.split("==")[0] for spec in packages})}


def registry():
  # Names are discoverable even when optional SDKs are not installed.
  def lazy(name):
    def invoke(*args, **kwargs):
      return load_algorithm(name)(*args, **kwargs)
    return invoke
  return {name: lazy(name) for name in CATALOG}


def run_algorithm(algorithm, parameters):
  if algorithm not in CATALOG:
    raise ValueError(f"Unknown algorithm {algorithm}; use --list")
  if not isinstance(parameters, dict):
    raise ValueError("Input JSON must be an object of named parameters")
  def require_finite(value):
    if isinstance(value, float) and not math.isfinite(value):
      raise ValueError("Input numbers must be finite")
    if isinstance(value, dict):
      for item in value.values():
        require_finite(item)
    elif isinstance(value, list):
      for item in value:
        require_finite(item)
  require_finite(parameters)
  function = load_algorithm(algorithm)
  inspect.signature(function).bind(**parameters)  # Reject ignored/misspelled parameters.
  try:
    result = function(**parameters)
    dependencies = dependency_versions(algorithm)
  except (ModuleNotFoundError, PackageNotFoundError) as error:
    raise ValueError(f"Missing dependency for {algorithm}: {error}; run {setup_hint(algorithm)}") from error
  return {"algorithm": algorithm, "parameters": parameters,
          "scientificValidation": "not_evaluated", "execution": "local-open-source-sdk",
          "basisConvention": "Qiskit little endian: displayed bit string q[n-1]...q[0]",
          "dependencies": dependencies,
          "result": result}


def main():
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument("--list", action="store_true")
  parser.add_argument("--describe", metavar="ALGORITHM")
  parser.add_argument("--algorithm")
  parser.add_argument("--input", type=Path, help="JSON object; omit to run the documented example")
  parser.add_argument("--output", type=Path, help="Save JSON to this new or explicitly selected file")
  args = parser.parse_args()
  if args.list:
    print(json.dumps(sorted(CATALOG)))
    return
  if args.describe:
    if args.describe not in CATALOG:
      parser.error("Unknown algorithm")
    print(args.describe + CATALOG[args.describe]["signature"])
    return
  if not args.algorithm:
    parser.error("--algorithm is required unless --list or --describe is used")
  try:
    parameters = json.loads(args.input.read_text()) if args.input else {}
    result = run_algorithm(args.algorithm, parameters)
    from common import serializable
    rendered = json.dumps(serializable(result), indent=2, allow_nan=False) + "\n"
    if args.output:
      args.output.write_text(rendered)
    else:
      print(rendered, end="")
  except (ValueError, TypeError, OSError) as error:
    print(json.dumps({"status": "error", "error": str(error)}), file=sys.stderr)
    raise SystemExit(2) from error


if __name__ == "__main__":
  main()
