"""Q-CTRL graph preparation and existing-job inspection using official SDKs."""
import contextlib
import json
import os
import sys

ENDPOINT = "https://federation-service.q-ctrl.com"


def sdk_modules():
    # The SDK's import-time package upgrade check contacts PyPI. Our environment
    # is explicitly locked, so suppress only that advisory, not SDK computation.
    import qctrlworkflowclient.utils
    qctrlworkflowclient.utils.check_package_version = lambda _package: None
    os.environ["FIRE_OPAL_CLIENT_DISABLE_TRACKING"] = "True"
    import boulderopal
    import fireopal
    return boulderopal, fireopal


def remote_router(product, api_key, timeout, organization_slug=""):
    import httpx
    from qctrlclient import ApiKeyAuth, GraphQLClient
    from qctrlworkflowclient import ApiRouter
    import boulderopal._configuration.configuration as bo_config
    import fireopal.config as fo_config

    def reject_redirect(response):
        if 300 <= response.status_code < 400:
            raise ValueError("Q-CTRL redirects are disabled")

    class SingleAttemptClient(GraphQLClient):
        def execute(self, query, variable_values=None, **_kwargs):
            return self.execute_once(query, variable_values)

    def make_client(auth=None):
        client = SingleAttemptClient(ENDPOINT, auth=auth, timeout=httpx.Timeout(timeout),
                                     fetch_schema_from_transport=False,
                                     transport_options={"follow_redirects": False})
        client._transport_args["event_hooks"].setdefault("response", []).append(reject_redirect)
        return client
    auth = ApiKeyAuth(ENDPOINT, api_key)
    # SDK ApiKeyAuth owns the key-to-token exchange; use the same no-retry,
    # bounded transport for its GraphQL query as for the read-only job query.
    auth.__dict__["_graphql_client"] = make_client()
    settings = bo_config.get_configuration() if product == "boulder-opal" else fo_config.get_config()
    settings.update(organization=organization_slug or None)
    router = ApiRouter(make_client(auth), settings)
    if product == "boulder-opal":
        bo_config.configure(router=router)
    else:
        fo_config.configure(router=router)
    return router


def compute(v, tool_name):
    if tool_name == "get_qctrl_job_status":
        key = os.environ.get("QCTRL_API_KEY")
        if not key:
            raise ValueError("QCTRL_API_KEY is not configured; no network request was made")
    bo, fo = sdk_modules()
    if tool_name == "prepare_boulder_opal_control":
        import numpy as np
        from qctrlcommons.serializers import DataTypeEncoder
        graph = bo.Graph()
        matrices = [np.array([[0, 1], [1, 0]]), np.array([[0, -1j], [1j, 0]]), np.diag([1, -1])]
        fields = ["omegaX", "omegaY", "detuning"]
        operators = [graph.pwc_operator(signal=graph.pwc_signal(values=np.array([p[field] for p in v["segments"]]), duration=v["durationSeconds"]), operator=matrix / 2) for field, matrix in zip(fields, matrices)]
        hamiltonian = graph.pwc_sum(operators)
        unitary = graph.time_evolution_operators_pwc(hamiltonian, sample_times=[v["durationSeconds"]], name="unitaries")
        return {"graphJson": json.dumps(graph, cls=DataTypeEncoder, allow_nan=False), "nodeCount": len(graph.operations),
                "segmentCount": len(v["segments"]), "outputNode": "unitaries", "outputShape": list(unitary.shape),
                "networkUsed": False, "evaluated": False}, [
            "Boulder Opal constructs and serializes the computational graph; no graph evaluation, optimization, cloud computation or hardware execution occurs.",
            "The graph uses H/hbar = (omegaX X + omegaY Y + detuning Z)/2 with equal-duration segments, angular frequencies in rad/s and total duration in seconds.",
            "The proprietary SDK and cloud products remain subject to the user's Q-CTRL license and service access. Package upgrade checks and Fire Opal telemetry are disabled by this adapter.",
        ]
    if tool_name != "get_qctrl_job_status":
        raise ValueError("Unknown Q-CTRL action")
    try:
        remote_router(v["product"], key, v["requestTimeoutSeconds"], v.get("organizationSlug", ""))
        if v["product"] == "boulder-opal":
            status = bo.cloud.get_job(v["jobId"]).get_status()
        else:
            status = fo.FireOpalJob(v["jobId"]).status()["action_status"]
    except Exception as error:
        # SDK exceptions can contain freshly derived access tokens, which are
        # not among the injected env secrets. Never echo service error bodies.
        raise ValueError(f"Q-CTRL status request failed ({type(error).__name__}); check account access, organizationSlug, job ID and service availability. No job was submitted") from None
    return {"product": v["product"], "jobId": v["jobId"], "status": status,
            "networkUsed": True, "hardwareExecuted": False, "endpoint": ENDPOINT}, [
        "The Q-CTRL SDK performs authentication-token exchange, organization/product-access discovery and one existing-job status query; it does not submit, cancel or poll a calculation.",
        "Returned status is service-reported. Local transport tests do not establish live account access, subscription entitlement or service availability.",
        "Credentials are taken only from QCTRL_API_KEY. Interactive login, package upgrade checks, Fire Opal telemetry, redirects and automatic request retries are disabled.",
    ]


if __name__ == "__main__":
    request = json.load(sys.stdin)
    with contextlib.redirect_stdout(sys.stderr):
        result, limitations = compute(request["input"], request["toolName"])
    request.pop("toolName", None)
    json.dump({**request, "schemaVersion": "1.0", "result": result, "scientificValidation": "not_evaluated", "limitations": limitations}, sys.stdout, allow_nan=False)
