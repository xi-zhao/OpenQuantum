# Fixed cqlib-qml kernel adaptation

`provenance.json` records the original and adapted SHA-256 for each file. Five upstream files
come from the stated Apache-2.0 commit; the three minimal package initializers are OpenQuantum
integration code. The Tool exposes only classical angle encoding with statevector kernels.

`compatibility.patch` records the two public-name import aliases and modified-file notices.
It uses zero context to avoid whitespace-only lines in the stored patch. In the original source
root, check it with `git apply --check --unidiff-zero -p0 /path/to/compatibility.patch`.
The minimal package initializers are declared separately in the provenance manifest.

Amplitude, ZZ and swap-test code are retained as type/import dependencies of the unchanged
kernel classes, but are not exposed or claimed as verified by the public Tool contract.
