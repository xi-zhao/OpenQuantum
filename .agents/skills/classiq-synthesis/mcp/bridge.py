"""Classiq structured models and explicitly authenticated remote synthesis."""
import asyncio
import contextlib
import importlib
import json
import logging
import os
import sys
from unittest.mock import patch

ENDPOINT = "https://platform.classiq.io"


def build_model(v):
    os.environ["OTEL_SDK_DISABLED"] = "true"
    os.environ["CLASSIQ_TELEMETRY_MODE"] = "disabled"
    import classiq as cq

    @cq.qfunc
    def main(q: cq.Output[cq.QArray[cq.QBit]]):
        cq.allocate(v["numQubits"], q)
        for gate in v["gates"]:
            args = ([gate["angle"]] if gate["gate"].startswith("R") else [])
            args += [q[target] for target in gate["targets"]]
            getattr(cq, gate["gate"])(*args)

    model = cq.create_model(main)
    # Parse through the SDK's own typed model, preserving the original serialized
    # form used by synthesis (including its entry-point metadata).
    from classiq.interface.model.model import Model
    Model.model_validate_json(model)
    return model


@contextlib.contextmanager
def bounded_transport(timeout):
    import httpx
    from tenacity import stop_after_attempt
    from classiq._internals.config import Configuration
    client_module = importlib.import_module("classiq._internals.client")
    api_module = importlib.import_module("classiq._internals.api_wrapper")
    original_async = httpx.AsyncClient

    class OfficialClient(original_async):
        def __init__(self, *args, **kwargs):
            kwargs["timeout"] = timeout
            kwargs["follow_redirects"] = False
            super().__init__(*args, **kwargs)

        async def send(self, request, **kwargs):
            url = request.url
            if url.scheme != "https" or url.port not in (None, 443) or url.username or url.password:
                raise ValueError("Classiq adapter requires official HTTPS destinations")
            official = url.host == "platform.classiq.io"
            # The pinned SDK uploads through service-issued signed S3 URLs.
            signed_s3 = (".s3." in url.host or ".s3-" in url.host) and url.host.endswith(".amazonaws.com") and "X-Amz-Signature" in url.params
            if not official and not signed_s3:
                raise ValueError("Classiq adapter rejected a non-official storage destination")
            if official and (request.method not in ("GET", "POST") or url.path.endswith("/cancel")):
                raise ValueError("Classiq adapter does not permit cancellation or other service writes")
            if signed_s3 and (request.method not in ("GET", "PUT") or "authorization" in request.headers):
                raise ValueError("Only signed object upload/download without account credentials is permitted")
            kwargs["follow_redirects"] = False
            response = await super().send(request, **kwargs)
            if 300 <= response.status_code < 400:
                raise ValueError("Classiq redirects are disabled")
            return response

    previous_client = client_module.DEFAULT_CLIENT
    logger = logging.getLogger("classiq")
    previous_level = logger.level
    try:
        # Vendor error bodies may contain account identifiers or tokens. Tool
        # failures use the sanitized error below instead of SDK HTTP tracebacks.
        logger.setLevel(logging.CRITICAL)
        # Explicit configuration bypasses unrelated on-disk profiles and host
        # discovery. Exchange-token authentication never opens a login browser.
        client_module.set_client(client_module.Client(Configuration(host=ENDPOINT, should_check_host=False, text_only=True)))
        with patch.object(httpx, "AsyncClient", OfficialClient), \
             patch.object(client_module, "_RETRY_COUNT", 1), \
             patch.object(api_module._presigned_url_request.retry, "stop", stop_after_attempt(1)):
            yield
    finally:
        client_module.DEFAULT_CLIENT = previous_client
        logger.setLevel(previous_level)


def compute(v, tool_name):
    if tool_name == "synthesize_classiq_circuit" and not os.environ.get("CLASSIQ_XCH_TOKEN"):
        raise ValueError("CLASSIQ_XCH_TOKEN is not configured; no network request was made")
    if tool_name not in ("prepare_classiq_model", "synthesize_classiq_circuit"):
        raise ValueError("Unknown Classiq action")
    model = build_model(v)
    if tool_name == "prepare_classiq_model":
        return {"modelJson": model, "numQubits": v["numQubits"], "gateCount": len(v["gates"]), "networkUsed": False}, [
            "This is local Classiq Qmod model construction and typed validation, not synthesis or circuit execution.",
            "Only the listed fixed unitary gates are constructed; there is no user Python, Qmod source, arbitrary expression or credential input.",
            "The proprietary Classiq SDK and cloud service remain subject to the user's license and account permissions.",
        ]
    import classiq
    from classiq._internals.authentication.exchange_token import decode_sdk_service_url
    if decode_sdk_service_url(os.environ["CLASSIQ_XCH_TOKEN"]).rstrip("/") != ENDPOINT:
        raise ValueError("CLASSIQ_XCH_TOKEN must be issued for https://platform.classiq.io")
    with bounded_transport(v["requestTimeoutSeconds"]):
        async def run():
            return await asyncio.wait_for(classiq.synthesis.synthesize_async(model), timeout=v["requestTimeoutSeconds"])
        try:
            program = asyncio.run(run())
        except TimeoutError:
            raise ValueError("Classiq synthesis timed out; the remote job may still be active. Check the user's Classiq account before resubmitting") from None
        except Exception as error:
            raise ValueError(f"Classiq synthesis failed ({type(error).__name__}); check account access and service status before resubmitting. Remote synthesis may already have started") from None
    return {"quantumProgramJson": program.model_dump_json(), "networkUsed": True,
            "hardwareExecuted": False, "endpoint": ENDPOINT}, [
        "The official SDK uploads the model to service-issued signed S3 storage and requests synthesis at the fixed Classiq platform endpoint. Account quota or charges may apply.",
        "No quantum execution, account creation, terms acceptance, interactive login, stored credential lookup or credential persistence is performed by the adapter.",
        "Automatic retries, HTTP redirects and implicit job cancellation are disabled. A timeout does not establish that the remote synthesis stopped; inspect the account before resubmission.",
        "The returned quantum program is the service's typed SDK result; local transport tests do not prove live connectivity, circuit equivalence or scientific acceptance.",
    ]


if __name__ == "__main__":
    request = json.load(sys.stdin)
    with contextlib.redirect_stdout(sys.stderr):
        result, limitations = compute(request["input"], request["toolName"])
    request.pop("toolName", None)
    json.dump({**request, "schemaVersion": "1.0", "result": result, "scientificValidation": "not_evaluated", "limitations": limitations}, sys.stdout, allow_nan=False)
