"""Restore verified HTTPS for the fixed OriginQ SDK's transport boundary.

qpanda3-runtime 1.0.2 disables certificate verification in HTTPClient. Keep its
public request interface, but use Python's default CA/hostname verification and
never log request payloads or forward credential-bearing server error bodies.
"""
import ssl
from urllib.parse import urlsplit

import aiohttp


async def verified_request(self, method, endpoint, data=None, extra_headers=None):
    url = f"{self._base_url}{endpoint}"
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.username or parsed.password:
        raise ValueError("QPanda Runtime requires verified HTTPS")
    context = ssl.create_default_context()
    headers = {"Content-Type": "application/json", **(extra_headers or {})}
    connector = aiohttp.TCPConnector(ssl=context)
    async with aiohttp.ClientSession(connector=connector, timeout=aiohttp.ClientTimeout(total=150), trust_env=True) as session:
        async with session.request(method, url, json=data if data else None, headers=headers, allow_redirects=False) as response:
            if response.status not in (200, 201):
                raise RuntimeError(f"QPanda Runtime request failed (HTTP {response.status})")
            return await response.json()


def install_verified_transport():
    from importlib.metadata import version
    from qpanda3_runtime.access_service.network.http_client import HTTPClient
    if version("qpanda3-runtime") != "1.0.2":
        raise RuntimeError("QPanda Runtime transport version changed; review required")
    HTTPClient._make_request = verified_request
