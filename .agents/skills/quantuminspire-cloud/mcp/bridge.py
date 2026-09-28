"""Read-only Quantum Inspire SDK adapter with in-memory access-token configuration."""
import asyncio
import os
import sys
from pathlib import Path
from urllib.parse import urlparse
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "src/lib"))
from science_bridge import execute

ENDPOINT = "https://api.quantum-inspire.com"


def make_manager(token, v):
    import aiohttp
    from compute_api_client import ApiClient, Configuration
    from quantuminspire.managers.resource_manager import ResourceManager

    class Transport:
        def __init__(self, session):
            self.session = session
        async def request(self, **kwargs):
            url = urlparse(kwargs["url"])
            if kwargs["method"] != "GET" or url.scheme != "https" or url.netloc != urlparse(ENDPOINT).netloc:
                raise ValueError("Quantum Inspire adapter permits only official read-only HTTPS calls")
            kwargs["allow_redirects"] = False
            response = await self.session.request(**kwargs)
            if 300 <= response.status < 400:
                response.release()
                raise ValueError("Quantum Inspire redirects are disabled")
            return response
        async def close(self):
            await self.session.close()

    class Manager(ResourceManager):
        total = None
        def _invoke(self, api_class, method_name, *args, **kwargs):
            async def run():
                config = Configuration(host=ENDPOINT, access_token=token, ignore_operation_servers=True)
                config.retries = None
                async with ApiClient(config) as client:
                    client.rest_client.pool_manager = Transport(aiohttp.ClientSession(trust_env=False))
                    method = getattr(api_class(client), method_name)
                    if method_name == "read_backend_types_backend_types_get":
                        kwargs.update(page=v["page"], size=v["pageSize"])
                    result = await method(*args, **kwargs, _request_timeout=v["requestTimeoutSeconds"])
                    if method_name == "read_backend_types_backend_types_get":
                        self.total = result.total
                    return result
            return asyncio.run(run())
    return Manager()


def compute(v):
    token = os.environ.get("QUANTUMINSPIRE_API_TOKEN")
    if not token:
        raise ValueError("QUANTUMINSPIRE_API_TOKEN is not configured; no network request was made")
    try:
        manager = make_manager(token, v)
        backends, job = [], None
        if v["action"] == "backends":
            backends = [{"id": b.id, "name": b.name, "numQubits": b.nqubits, "isHardware": b.is_hardware,
                         "status": b.status.value, "enabled": b.enabled} for b in manager.get_backend_types()]
        elif v["action"] == "job_status":
            j = manager.get_job(v["jobId"])
            job = {"id": j.id, "status": j.status.value, "shots": j.number_of_shots}
        else:
            raise ValueError("Unknown Quantum Inspire action")
    except Exception as error:
        raise ValueError(f"Quantum Inspire query failed ({type(error).__name__}); check access token, job ID and service availability. No task was submitted") from None
    return {"action": v["action"], "page": v["page"], "pageSize": v["pageSize"], "total": manager.total,
            "backends": backends, "job": job, "endpoint": ENDPOINT, "networkUsed": True}, [
        "Uses the official Quantum Inspire ResourceManager and generated API client, with bearer token only in memory; never opens browser login or reads/writes user credential files.",
        "Backend listing returns the requested page only, including the server-reported total. API page size is limited to 100 by its schema.",
        "Statuses are service-reported; no cloud execution, polling, cancellation, automatic retries or token refresh occurs.",
    ]


if __name__ == "__main__":
    execute(compute)
