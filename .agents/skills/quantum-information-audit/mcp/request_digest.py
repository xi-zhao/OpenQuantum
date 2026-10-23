"""Versioned request hashing without language-specific decimal formatting.

The input is the normalized density-matrix request (only objects, arrays and
finite numbers). Numeric leaves are tagged IEEE-754 binary64 big-endian hex.
See references/REQUEST-DIGEST.md for the wire format and legacy handling.
"""

import hashlib
import json
import math
import struct

REQUEST_DIGEST_VERSION = "binary64-v1"
_DOMAIN = b"openquantum-density-matrix-request:binary64-v1\n"


def _encode(value):
    if isinstance(value, dict):
        return {key: _encode(item) for key, item in sorted(value.items())}
    if isinstance(value, list):
        return [_encode(item) for item in value]
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("Request digest accepts only normalized numeric request values")
    number = float(value)
    if not math.isfinite(number):
        raise ValueError("Request digest requires finite binary64 numbers")
    # Both signs of zero represent the same normalized request value.
    encoded = struct.pack(">d", 0.0 if number == 0 else number).hex()
    return {"$binary64": encoded}


def canonical_digest(request):
    encoded = json.dumps(_encode(request), sort_keys=True, separators=(",", ":")).encode("ascii")
    return hashlib.sha256(_DOMAIN + encoded).hexdigest()
