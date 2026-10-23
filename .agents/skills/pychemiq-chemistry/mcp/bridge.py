"""Native pyChemiQ JW/Pauli algebra without its default numerical pruning."""
import math
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute


def coalesce(rows):
    """Merge SDK Pauli data with stable summation and exact-zero removal only."""
    buckets = {}
    for (factors, _label), coefficient in rows:
        value = complex(coefficient)
        if not math.isfinite(value.real) or not math.isfinite(value.imag):
            raise ValueError("pyChemiQ Pauli coefficients exceed finite floating-point representation")
        key = tuple(sorted((int(mode), letter) for mode, letter in factors.items()))
        buckets.setdefault(key, []).append(value)
    result = {}
    for key, values in buckets.items():
        value = complex(math.fsum(v.real for v in values), math.fsum(v.imag for v in values))
        if value != 0:
            result[key] = value
    return result


def compute(v):
    from pychemiq import FermionOperator, PauliOperator
    from pychemiq.Transform.Mapping import jordan_wigner

    def native_pauli(terms):
        result = PauliOperator({" ".join(f"{letter}{mode}" for mode, letter in key): value for key, value in terms.items()})
        result.set_error_threshold(0)
        return result

    identity = coalesce(jordan_wigner(FermionOperator("", 1)).data())
    ladders = {}
    contributions = []
    for term in v["terms"]:
        coefficient = complex(term["coefficient"]["real"], term["coefficient"]["imaginary"])
        if coefficient == 0:
            continue
        current = identity
        for item in term["operators"]:
            if not current:
                break
            # Single unit ladders have exactly representable +/-1/2 coefficients.
            # Mapping an entire weighted word with the SDK default would silently
            # prune small terms at 1e-6, even if the input threshold is set to zero.
            key = (item["mode"], item["action"])
            if key not in ladders:
                word = str(item["mode"]) + ("+" if item["action"] == "create" else "")
                mapped = jordan_wigner(FermionOperator(word, 1))
                mapped.set_error_threshold(0)
                ladders[key] = mapped
            for value in current.values():
                if any(component != 0 and component * 0.5 == 0 for component in (value.real, value.imag)):
                    raise ValueError("Nonzero intermediate Pauli coefficient is below floating-point representation")
            product = native_pauli(current) * ladders[key]
            # Every upstream arithmetic operation returns a fresh default
            # threshold. Reset it before reading/reusing the native result.
            product.set_error_threshold(0)
            current = coalesce(product.data())
        for key, value in current.items():
            weighted = value * coefficient
            # Unit-word coefficients are dyadic real or imaginary values. Do
            # not silently erase a nonzero component at IEEE double underflow.
            if ((value.real != 0 and any(c != 0 and c * value.real == 0 for c in (coefficient.real, coefficient.imag)))
                    or (value.imag != 0 and any(c != 0 and c * value.imag == 0 for c in (coefficient.real, coefficient.imag)))):
                raise ValueError("Requested nonzero Pauli coefficient is below floating-point representation")
            contributions.append(((dict(key), ""), weighted))
    combined = coalesce(contributions)
    terms = []
    for key, value in combined.items():
        pauli = ["I"] * v["numModes"]
        for mode, letter in key:
            pauli[mode] = letter
        terms.append({"pauli": "".join(pauli), "coefficient": {"real": float(value.real), "imaginary": float(value.imag)}})
    terms.sort(key=lambda term: term["pauli"])
    return {"numModes": v["numModes"], "mapping": "Jordan-Wigner", "terms": terms, "pauliConvention": "leftmost letter is mode/qubit 0"}, [
        "Operators retain their supplied left-to-right multiplication order; Hermiticity and electron-number conservation are not assumed.",
        "Identity operators use an empty operators list. Unused modes are padded by identity factors; no active-space selection or molecular integral calculation is performed.",
        "Each unit ladder is mapped by native pyChemiQ and composed with its zero-threshold Pauli arithmetic; duplicate terms use stable summation. Original coefficients are applied after mapping to avoid SDK default 1e-6 pruning.",
        "No numerical pruning tolerance is applied. Coefficients remain floating-point values; unrepresentable nonzero underflow or overflow fails explicitly. This is not a VQE energy or scientific acceptance.",
    ]


if __name__ == "__main__":
    execute(compute)
