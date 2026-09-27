"""Real SDK checks against the independent dense reference suite."""
from pathlib import Path
import sys
root = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(root / "tests/fixtures"))
from sdk_differentiable_science import run_suite

if __name__ == "__main__":
    raise SystemExit(0 if run_suite(Path(__file__).resolve().parents[1]) else 1)
