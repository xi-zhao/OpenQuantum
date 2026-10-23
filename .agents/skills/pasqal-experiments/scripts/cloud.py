"""Pasqal 0.24 transport and credential boundary for the experiment helpers.

The public SDK remains available in full. This reviewed adapter deliberately
uses one HTTP attempt: retrying a POST after a 5xx can purchase the same shots
twice. No user credentials or server error bodies are written to artifacts.
"""
import os
from urllib.parse import urlparse

import requests
from pasqal_cloud.authentication import TokenProvider
from pasqal_cloud.http_client import HTTPClient
from pasqal_cloud.pasqal_cloud_client import PasqalCloudClient


class CloudError(RuntimeError):
    pass


class EnvironmentToken(TokenProvider):
    def get_token(self):
        value = os.environ.get("PASQAL_AUTH_TOKEN")
        if not value:
            raise CloudError("Missing PASQAL_AUTH_TOKEN; configure it outside the conversation")
        return value


class SingleAttemptHTTPClient(HTTPClient):
    """Version-pinned HTTPClient extension; covered at the requests boundary."""

    def _authenticated_request(self, method, url, payload=None, params=None, gziped=False):
        if self.authenticator is None:
            raise CloudError("Pasqal authentication is required")
        return self._json_request(method, url, auth=self.authenticator,
                                  json=payload, params=params)

    def _json_request(self, method, url, **kwargs):
        # Results can be hosted on signed storage URLs. Never attach Pasqal
        # credentials to them, follow redirects, or print their query strings.
        if urlparse(url).scheme != "https":
            raise CloudError("Pasqal requests require HTTPS")
        try:
            response = self.session.request(
                method, url, timeout=30, allow_redirects=False, verify=True,
                headers={"User-Agent": self.user_agent}, **kwargs)
            if not 200 <= response.status_code < 300:
                raise CloudError(f"Pasqal HTTP {response.status_code}; no automatic retry")
            return response.json()
        except requests.RequestException:
            raise CloudError("Pasqal transport failed; remote outcome may be unknown; no automatic retry") from None
        except ValueError:
            raise CloudError("Pasqal returned invalid JSON; remote outcome may be unknown") from None

    def _download_results(self, results_link):
        return self._json_request("GET", results_link)


def client(project_id, region="fr"):
    """Explicit billing project; secrets only from the launching host's env.

    The host may inject these named references from its protected credential
    store. We do not inspect ~/.pasqal_credentials.json or export plugin secrets.
    Token and username/password are both official SDK authentication paths.
    """
    if not isinstance(project_id, str) or not project_id.strip():
        raise ValueError("An explicit project_id is required")
    if region not in ("fr", "sa"):
        raise ValueError("region must be fr or sa")
    if os.environ.get("PASQAL_SKIP_SSL_VERIFY"):
        raise CloudError("PASQAL_SKIP_SSL_VERIFY is incompatible with this workflow")
    args = {"project_id": project_id, "region": region,
            "client_class": SingleAttemptHTTPClient}
    if os.environ.get("PASQAL_AUTH_TOKEN"):
        args["token_provider"] = EnvironmentToken()
    else:
        username = os.environ.get("PASQAL_USERNAME")
        password = os.environ.get("PASQAL_PASSWORD")
        if not username or not password:
            raise CloudError("Configure PASQAL_AUTH_TOKEN or PASQAL_USERNAME and PASQAL_PASSWORD through the host credential environment")
        args.update(username=username, password=password)
    try:
        return PasqalCloudClient(**args)
    except Exception:
        # An authentication exception may embed an HTTP response or token.
        raise CloudError("Pasqal client initialization failed; check authentication privately") from None
