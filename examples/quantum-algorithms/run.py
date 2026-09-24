"""Run a documented open SDK example through the existing Harness shell Tool.

This CLI is a repository resource. It does not register a new Tool or manage
sessions, permissions, dependencies, jobs, or scientific Acceptance.
"""
import argparse
import importlib
from importlib.metadata import version
import inspect
import json
import math
from pathlib import Path
import sys
from common import serializable


MODULES = ["fundamentals", "linear", "simulation", "search", "state_preparation",
           "variational", "gradients", "error_correction", "dynamics", "chemistry", "cv"]


def registry():
  algorithms = {}
  for name in MODULES:
    for key, function in importlib.import_module(name).ALGORITHMS.items():
      if key in algorithms:
        raise RuntimeError(f"Duplicate algorithm: {key}")
      algorithms[key] = function
  return algorithms


def run_algorithm(algorithm, parameters):
  functions = registry()
  if algorithm not in functions:
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
  function = functions[algorithm]
  inspect.signature(function).bind(**parameters)  # Reject ignored/misspelled parameters.
  result = function(**parameters)
  return {"algorithm": algorithm, "parameters": parameters,
          "scientificValidation": "not_evaluated", "execution": "local-open-source-sdk",
          "basisConvention": "Qiskit little endian: displayed bit string q[n-1]...q[0]",
          "dependencies": {p: version(p) for p in ["numpy", "scipy", "qiskit", "qiskit-algorithms", "pennylane", "quimb", "pyscf"]},
          "result": result}


def main():
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument("--list", action="store_true")
  parser.add_argument("--describe", metavar="ALGORITHM")
  parser.add_argument("--algorithm")
  parser.add_argument("--input", type=Path, help="JSON object; omit to run the documented example")
  parser.add_argument("--output", type=Path, help="Save JSON to this new or explicitly selected file")
  args = parser.parse_args()
  functions = registry()
  if args.list:
    print(json.dumps(sorted(functions)))
    return
  if args.describe:
    if args.describe not in functions:
      parser.error("Unknown algorithm")
    print(f"{args.describe}{inspect.signature(functions[args.describe])}")
    return
  if not args.algorithm:
    parser.error("--algorithm is required unless --list or --describe is used")
  try:
    parameters = json.loads(args.input.read_text()) if args.input else {}
    result = run_algorithm(args.algorithm, parameters)
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
