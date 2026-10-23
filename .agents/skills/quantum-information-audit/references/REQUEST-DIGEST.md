# Density-matrix request digest

New Python results declare `requestDigestVersion: "binary64-v1"`. Both the Python
worker and JavaScript Validator independently hash the normalized request:

1. Preserve array order and sort the fixed ASCII request property names.
2. Replace every numeric leaf, including subsystem dimensions and indices, with
   `{"$binary64":"<16 lowercase hex digits>"}`. The hex encodes an IEEE-754
   binary64 value in big-endian byte order. Normalize either sign of zero to
   positive zero; reject non-finite values. The request schema has no string
   values or arbitrary objects, so the numeric marker cannot collide with input.
3. Encode this tree as compact JSON (no whitespace), with sorted object keys.
4. Prefix its ASCII bytes with `openquantum-density-matrix-request:binary64-v1\n`
   (a real newline), then compute SHA-256.

This matches the numerical values the Tool accepts, without depending on Python
or JavaScript's decimal/exponent spelling. It introduces no tolerance or rounding
beyond the existing binary64 input representation. The worker reports its own
digest; the host never replaces it with an expected digest.

Historical analysis artifacts without `requestDigestVersion` retain exactly the
previous JavaScript rule: SHA-256 of `JSON.stringify` on the key-sorted normalized
request. Existing valid artifacts keep their digest. Historically mismatched
Python digests remain failed; there is no fallback that accepts both encodings.
An unsupported or null digest version fails validation. No stored artifacts are
rewritten and scientific scope, numerical thresholds and Acceptance rules stay
unchanged.
