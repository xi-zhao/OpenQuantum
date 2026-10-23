"""Read-only singlepoint queries through the real QCPortal SDK."""
import contextlib
import json
import os
import re
import sys
from urllib.parse import urlsplit


def client(timeout):
    address = os.environ.get("QCPORTAL_ADDRESS", "").strip()
    if not address:
        raise ValueError("QCPORTAL_ADDRESS is not configured; no network request was made")
    url = urlsplit(address)
    if (url.scheme != "https" and not (url.scheme == "http" and url.hostname in ("localhost", "127.0.0.1", "::1"))) or not url.hostname or url.username or url.password or url.query or url.fragment:
        raise ValueError("QCPORTAL_ADDRESS must be an HTTPS server URL without credentials, query or fragment (HTTP is allowed only for loopback)")
    username = os.environ.get("QCPORTAL_USERNAME") or None
    password = os.environ.get("QCPORTAL_PASSWORD") or None
    if bool(username) != bool(password):
        raise ValueError("Configure both QCPORTAL_USERNAME and QCPORTAL_PASSWORD, or neither for anonymous access; no network request was made")
    from qcportal import PortalClient
    import requests

    class ExplicitAuthentication(requests.auth.AuthBase):
        def __call__(self, request):
            return request  # Preserve SDK JWT headers, never load ~/.netrc.

    class ReadOnlyClient(PortalClient):
        def _send_request(self, req, allow_retries=False):
            prefix = self.address
            endpoint = req.url[len(prefix):] if req.url.startswith(prefix) else ""
            route = (req.method.upper(), endpoint)
            allowed = route in {
                ("GET", "api/v1/information"), ("POST", "auth/v1/login"), ("POST", "auth/v1/refresh"),
                ("POST", "api/v1/records/singlepoint/query"), ("POST", "api/v1/records/singlepoint/bulkGet"),
                ("POST", "api/v1/molecules/bulkGet"),
            } or (route[0] == "GET" and re.fullmatch(r"api/v1/records/singlepoint/[1-9][0-9]*/compute_history", endpoint))
            if not allowed:
                raise ValueError("QCArchive adapter rejected an operation outside its read-only query routes")
            self._req_session.auth = ExplicitAuthentication()
            self._req_session.resolve_redirects = lambda *args, **kwargs: iter(())
            prepared = self._req_session.prepare_request(req)
            settings = self._req_session.merge_environment_settings(prepared.url, {}, False, True, None)
            try:
                response = self._req_session.send(prepared, timeout=timeout, allow_redirects=False, **settings)
            except requests.RequestException:
                raise ValueError("QCArchive connection failed or timed out; check server configuration and access") from None
            if response.status_code in (401, 403):
                raise ValueError("QCArchive authentication or read access failed; configure account credentials and permissions")
            if response.status_code != 200:
                raise ValueError(f"QCArchive request failed (HTTP {response.status_code}); redirects and automatic retries are disabled")
            return response

    return ReadOnlyClient(address, username=username, password=password, verify=True, show_motd=False, cache_dir=None)


def compute(value):
    service = client(value["requestTimeoutSeconds"])
    try:
        include = ["molecule", "compute_history"]
        if "recordIds" in value:
            records = service.get_singlepoints(value["recordIds"], missing_ok=False, include=include)
        else:
            records = service.query_singlepoints(**{key: value[key] for key in ("program", "method", "basis") if key in value}, limit=value["limit"], include=include)
        result = []
        for record in records:
            molecule = record.molecule
            spec = record.specification
            # Only read already returned properties. Never fetch wavefunctions/files.
            energy = (record.properties or {}).get("return_energy")
            provenance = []
            for history in record.compute_history:
                p = history.provenance
                if p:
                    provenance.append({"creator": p.creator, "version": p.version, "routine": p.routine})
            result.append({
                "recordId": record.id, "status": record.status.value, "moleculeId": record.molecule_id,
                "program": spec.program, "driver": spec.driver.value, "method": spec.method, "basis": spec.basis,
                "energyHartree": float(energy) if energy is not None else None,
                "molecule": {"symbols": molecule.symbols.tolist(), "geometryBohr": molecule.geometry.tolist(), "charge": float(molecule.molecular_charge), "multiplicity": int(molecule.molecular_multiplicity)},
                "provenance": provenance,
            })
        return {"server": service.address, "serverVersion": service.server_info["version"], "returned": len(result), "queryLimit": value["limit"], "records": result, "networkUsed": True, "recordsModified": False}
    finally:
        service._req_session.close()


if __name__ == "__main__":
    request = json.load(sys.stdin)
    with contextlib.redirect_stdout(sys.stderr):
        result = compute(request["input"])
    json.dump({"schemaVersion": "1.0", "source": request["source"], "input": request["input"], "inputSha256": request["inputSha256"], "dependencyLockSha256": request["dependencyLockSha256"], "result": result, "scientificValidation": "not_evaluated", "limitations": [
        "These are existing server records, not a newly executed calculation or independently verified energy.",
        "Geometry is in bohr and return_energy is in hartree; a missing energy remains null. Compare geometry, charge, multiplicity, method and basis before comparing records.",
        "Query ordering is unspecified. A limit is a retrieval bound, not the total count of matching records. ID retrieval fails if a requested record is missing.",
        "Only configured server authentication and read-only data routes are allowed. No job submission, record mutation or wavefunction download is exposed.",
    ]}, sys.stdout, allow_nan=False)
