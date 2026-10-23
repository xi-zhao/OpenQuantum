"""Real loopback TLS acceptance for the pinned OriginQ transport adapter."""
import asyncio
from datetime import datetime, timedelta, timezone
import importlib.util
import json
import os
from pathlib import Path
import ssl
import sys
import tempfile

from aiohttp import web, ClientConnectorCertificateError
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

root = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("qpanda_tls", root / "runtime/chatgpt/external/qpanda_tls.py")
adapter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adapter)
adapter.install_verified_transport()
from qpanda3_runtime.access_service.network.http_client import HTTPClient


async def main(directory):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "localhost")])
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(x509.random_serial_number()).not_valid_before(datetime.now(timezone.utc) - timedelta(minutes=1))
            .not_valid_after(datetime.now(timezone.utc) + timedelta(days=1))
            .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
            .add_extension(x509.SubjectAlternativeName([x509.DNSName("localhost")]), critical=False).sign(key, hashes.SHA256()))
    cert_file, key_file = directory / "cert.pem", directory / "key.pem"
    cert_file.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    key_file.write_bytes(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(cert_file, key_file)
    received = []
    async def handler(request):
        received.append(request.path)
        if request.path == "/redirect": return web.Response(status=302, headers={"Location": "/forbidden"})
        return web.json_response({"ok": True})
    app = web.Application(); app.router.add_route("*", "/{path:.*}", handler)
    runner = web.AppRunner(app); await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 0, ssl_context=context); await site.start()
    port = site._server.sockets[0].getsockname()[1]
    os.environ["NO_PROXY"] = "localhost,127.0.0.1"
    os.environ.pop("SSL_CERT_FILE", None)
    try:
        try: await HTTPClient(f"https://localhost:{port}").post_request_async("/test", {"fixture": True})
        except ClientConnectorCertificateError: pass
        else: raise AssertionError("untrusted certificate accepted")
        assert not received
        os.environ["SSL_CERT_FILE"] = str(cert_file)
        try: await HTTPClient(f"https://127.0.0.1:{port}").post_request_async("/test", {})
        except ClientConnectorCertificateError: pass
        else: raise AssertionError("hostname mismatch accepted")
        assert not received
        assert await HTTPClient(f"https://localhost:{port}").post_request_async("/ok", {}) == {"ok": True}
        try: await HTTPClient(f"https://localhost:{port}").post_request_async("/redirect", {})
        except RuntimeError: pass
        else: raise AssertionError("redirect accepted")
        assert "/forbidden" not in received
        try: await HTTPClient(f"http://localhost:{port}").post_request_async("/unsafe", {})
        except ValueError: pass
        else: raise AssertionError("plaintext HTTP accepted")
        print(json.dumps({"untrusted_rejected": True, "hostname_mismatch_rejected": True, "trusted_ca_passed": True, "redirect_rejected": True, "http_rejected": True}))
    finally: await runner.cleanup()


with tempfile.TemporaryDirectory(prefix="oq-qpanda-tls-") as directory:
    asyncio.run(main(Path(directory)))
