"""Small independently checkable Chromobius API example, not a color-code benchmark."""
import argparse
import importlib.metadata
import json
from pathlib import Path

import chromobius
import numpy as np
import stim

# Independent error channels: only the event detected at D0 flips L0.
# Each syndrome has a unique logical prediction, so the exact answer is D0.
DEM_TEXT = """error(0.01) D0 L0
error(0.02) D1
error(0.03) D2
detector(0, 0, 0, 0) D0
detector(1, 0, 0, 1) D1
detector(2, 0, 0, 2) D2
"""


def run_example(shots=1024, seed=20261026):
    if not isinstance(shots, int) or isinstance(shots, bool) or not 1 <= shots <= 100000:
        raise ValueError("shots must be an integer in [1, 100000]")
    dem = stim.DetectorErrorModel(DEM_TEXT)
    decoder = chromobius.compile_decoder_for_dem(dem)
    # Enumerate all 2**3 syndromes; uint8 bit zero corresponds to detector D0.
    syndromes = np.arange(8, dtype=np.uint8).reshape(8, 1)
    expected = (syndromes & 1).astype(np.uint8)
    predicted = decoder.predict_obs_flips_from_dets_bit_packed(syndromes)
    if predicted.shape != expected.shape or not np.array_equal(predicted, expected):
        raise AssertionError("Chromobius disagrees with the exact independent-error fixture")

    dets, actual, _ = dem.compile_sampler(seed=seed).sample(shots, bit_packed=True)
    decoded = decoder.predict_obs_flips_from_dets_bit_packed(dets)
    if decoded.shape != actual.shape:
        raise AssertionError("Observable sample shapes differ")
    errors = int(np.count_nonzero(np.any(decoded != actual, axis=1)))
    if errors:
        raise AssertionError("Unexpected logical prediction in the unambiguous fixture")

    rejected_missing_coordinates = False
    try:
        chromobius.compile_decoder_for_dem(stim.DetectorErrorModel("error(0.01) D0 L0"))
    except (ValueError, RuntimeError):
        rejected_missing_coordinates = True
    if not rejected_missing_coordinates:
        raise AssertionError("A detector without basis/color coordinates was accepted")

    return {
        "fixture": "three-independent-detectors-one-observable",
        "scope": "API and bit-order regression; not a complete color-code memory experiment",
        "dem": DEM_TEXT,
        "versions": {name: importlib.metadata.version(name) for name in ("chromobius", "stim", "numpy")},
        "seed": seed,
        "shots": shots,
        "exactSyndromesChecked": len(syndromes),
        "zeroSyndromePrediction": int(predicted[0, 0]),
        "logicalErrors": errors,
        "missingCoordinatesRejected": rejected_missing_coordinates,
        "scientificValidation": "not_evaluated",
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--shots", type=int, default=1024)
    parser.add_argument("--seed", type=int, default=20261026)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = json.dumps(run_example(args.shots, args.seed), ensure_ascii=False, indent=2) + "\n"
    if args.output:
        # Do not overwrite an earlier experiment.
        with args.output.open("x", encoding="utf-8") as output:
            output.write(result)
    else:
        print(result, end="")
