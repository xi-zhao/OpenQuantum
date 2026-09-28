import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "tests/fixtures"))
from sdk_gaps_domestic_science import main

if __name__ == "__main__":
    main("pychemiq-chemistry", Path(__file__).resolve().parents[1] / "mcp/bridge.py")
