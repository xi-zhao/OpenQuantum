"""PennyLane adapters and a matched Python bit-mask control, with no truncation."""
import numbers

import numpy as np
from pennylane.pauli import PauliSentence, PauliWord


def wires_for(left, right):
    return tuple(dict.fromkeys(wire for sentence in (left, right) for word in sentence for wire in word))


def encode(sentence, wires):
    if len(wires) > 64 or len(set(wires)) != len(wires):
        raise ValueError("this fixed-coefficient prototype requires at most 64 unique wires")
    indices = {wire: index for index, wire in enumerate(wires)}
    result = []
    for word, coefficient in sentence.items():
        if not isinstance(coefficient, numbers.Complex) or getattr(coefficient, "requires_grad", False):
            raise TypeError("only fixed scalar numerical coefficients are supported")
        if isinstance(coefficient, np.generic):
            dtype = coefficient.dtype
            if (dtype.kind == "f" and dtype.itemsize > 8) or (dtype.kind == "c" and dtype.itemsize > 16):
                raise TypeError("coefficients above binary64 precision are not supported")
        if isinstance(coefficient, numbers.Integral) and abs(int(coefficient)) > 2**53:
            raise ValueError("integer coefficient is outside exact binary64 range")
        coefficient = complex(coefficient)
        if not np.isfinite(coefficient):
            raise ValueError("coefficients must be finite")
        x = z = 0
        for wire, axis in word.items():
            bit = 1 << indices[wire]
            if axis in ("X", "Y"):
                x |= bit
            if axis in ("Z", "Y"):
                z |= bit
        result.append((x, z, coefficient.real, coefficient.imag))
    return result


def decode(rows, wires):
    result = PauliSentence()
    for x, z, real, imag in rows:
        if not np.isfinite(complex(real, imag)):
            raise ValueError("non-finite result: binary64 arithmetic overflow")
        word = {}
        occupied = x | z
        while occupied:
            bit = occupied & -occupied
            index = bit.bit_length() - 1
            word[wires[index]] = "Y" if x & bit and z & bit else "X" if x & bit else "Z"
            occupied ^= bit
        result[PauliWord(word)] = complex(real, imag)
    return result


def prepare_python(rows):
    return [(x, z, (x & z).bit_count(), real, imag) for x, z, real, imag in rows]


def python_kernel(left, right):
    """Same masks, skip rule, signed phase and accumulation order as Rust."""
    result = {}
    for ax, az, ay, ar, ai in left:
        for bx, bz, by, br, bi in right:
            if ((ax & bz) ^ (az & bx)).bit_count() % 2 == 0:
                continue
            x, z = ax ^ bx, az ^ bz
            phase = (ay + by - (x & z).bit_count()
                     + 2 * (az & bx).bit_count()) % 4
            real = 2.0 * (ar * br - ai * bi)
            imag = 2.0 * (ar * bi + ai * br)
            if phase == 1:
                real, imag = -imag, real
            elif phase == 2:
                real, imag = -real, -imag
            elif phase == 3:
                real, imag = imag, -real
            old_real, old_imag = result.get((x, z), (0.0, 0.0))
            result[(x, z)] = old_real + real, old_imag + imag
    return [(x, z, real, imag) for (x, z), (real, imag) in result.items() if real != 0.0 or imag != 0.0]


def rust_commutator(left, right):
    from pauli_rust import Operator
    wires = wires_for(left, right)
    a, b = Operator(encode(left, wires)), Operator(encode(right, wires))
    return decode(a.commutator(b).rows(), wires)


def python_commutator(left, right):
    wires = wires_for(left, right)
    return decode(python_kernel(prepare_python(encode(left, wires)), prepare_python(encode(right, wires))), wires)


def canonical(sentence, wires):
    return {(x, z): complex(real, imag) for x, z, real, imag in encode(sentence, wires) if real != 0.0 or imag != 0.0}


def compare(actual, expected, atol=1e-11, rtol=1e-12):
    keys = actual.keys() | expected.keys()
    errors = [abs(actual.get(key, 0) - expected.get(key, 0)) for key in keys]
    violations = sum(not np.isfinite(actual.get(key, 0)) or not np.isfinite(expected.get(key, 0))
                     or not np.isfinite(error) or error > atol + rtol * abs(expected.get(key, 0))
                     for key, error in zip(keys, errors))
    return {"passed": violations == 0, "keys_compared": len(keys), "violations": violations,
            "max_absolute_error": max(errors, default=0.0), "atol": atol, "rtol": rtol}
