"""An isolated EOF parser check; never allow malformed tags to run unbounded."""
import json
import select
import subprocess
import sys
from importlib.metadata import version
import stim
import pymatching

rows = []
for constructor, value in (("Circuit", "X[unfinished"), ("DetectorErrorModel", "error[unfinished")):
    code = ("import stim\nprint('ready', flush=True)\ntry:\n"
            f"    stim.{constructor}({value!r})\n    print('accepted', flush=True)\n"
            "except ValueError as error:\n    print('rejected: ' + str(error), flush=True)\n")
    child = subprocess.Popen([sys.executable, "-u", "-c", code], text=True,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        assert select.select([child.stdout], [], [], 10)[0], "Stim import timed out"
        assert child.stdout.readline().strip() == "ready"
        output, error = child.communicate(timeout=0.05)
        assert child.returncode == 0 and output.startswith("rejected:"), (output, error)
        assert "tag" in output and "closed" in output
        rows.append({"case": constructor + "-unfinished-tag", "status": "rejected",
                     "message": output.strip()})
    finally:
        if child.poll() is None:
            child.kill()
        child.communicate()
tagged = stim.DetectorErrorModel("# comment\nerror[tag](0.1) D0 L0 # inline\ndetector[coordinates](1,2) D0 # EOF")
bare = stim.DetectorErrorModel("error(0.1) D0 L0\ndetector(1,2) D0")
assert tagged.without_tags() == bare
assert stim.DetectorErrorModel(str(tagged)) == tagged
assert pymatching.Matching.from_detector_error_model(tagged).num_detectors == 1
rows.append({"case": "tag-comment-roundtrip-and-pymatching", "status": "passed"})
print(json.dumps({"versions": {p: version(p) for p in ("stim", "pymatching")},
    "denominator": len(rows), "passed": len(rows), "cases": rows,
    "scope": "isolated development build; production Stim pin is unchanged",
    "scientificValidation": "not_evaluated"}, indent=2))
