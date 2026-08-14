import { clientRequestSchema } from "@deepseek-ai/dsh-host-apiproxy/api";

import {
  harnessBaseUrl,
  harnessUnavailableResponse,
  parseHarnessRequest,
} from "../../../../harness/server/browser-boundary.mjs";

const ALLOWED_POST_METHODS = new Set([
  "session.list",
  "session.create",
  "session.history",
  "session.prompt",
  "session.cancel",
  "session.models",
  "skill.list",
  "settings.describe",
  "settings.mutate",
  "credentials.describe",
  "credentials.set",
  "credentials.unset",
  "llm.providers",
  "llm.models",
]);
const MODEL_SETTING_FIELDS = new Set(["displayName", "baseURL", "api", "models"]);
const MODEL_CREDENTIAL_REFS = new Set([
  "OPENQUANTUM_PUBLIC_API_KEY",
  "OPENQUANTUM_PRIVATE_API_KEY",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isAllowedModelSettingsPayload(method: string, payload: unknown): boolean {
  if (method === "settings.mutate") {
    if (!isRecord(payload) || payload.ns !== "llm-pi-ai" || !Array.isArray(payload.ops)) {
      return false;
    }
    return payload.ops.length > 0 && payload.ops.every((operation) => {
      if (!isRecord(operation) || operation.op !== "set" || !Array.isArray(operation.path)) {
        return false;
      }
      const [root, provider, field] = operation.path;
      return (
        operation.path.length === 3 &&
        root === "providers" &&
        typeof provider === "string" &&
        /^[a-z0-9][a-z0-9-]{0,63}$/.test(provider) &&
        typeof field === "string" &&
        MODEL_SETTING_FIELDS.has(field)
      );
    });
  }

  if (method === "credentials.describe") {
    return (
      isRecord(payload) &&
      Array.isArray(payload.refs) &&
      payload.refs.length > 0 &&
      payload.refs.every(
        (ref) => typeof ref === "string" && MODEL_CREDENTIAL_REFS.has(ref),
      )
    );
  }

  if (method === "credentials.set" || method === "credentials.unset") {
    return (
      isRecord(payload) &&
      typeof payload.ref === "string" &&
      MODEL_CREDENTIAL_REFS.has(payload.ref)
    );
  }

  return true;
}

function upstreamUrl(method: string): string {
  return `${harnessBaseUrl()}/api/${method}`;
}

function forward(upstream: Response): Response {
  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  const cacheControl = upstream.headers.get("cache-control");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (cacheControl) {
    headers.set("cache-control", cacheControl);
  } else {
    headers.set("cache-control", "no-store");
  }

  headers.set("x-accel-buffering", "no");

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}

function withDeploymentWorkspace(payload: unknown): Record<string, unknown> {
  const source =
    payload !== null && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : {};
  const safePayload = { ...source } as Record<
    string,
    unknown
  >;
  delete safePayload.cwd;
  delete safePayload.workspaceId;

  return { ...safePayload, cwd: process.cwd() };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ method: string }> },
) {
  const { method } = await params;

  if (!ALLOWED_POST_METHODS.has(method)) {
    return Response.json({ error: "Harness method is not exposed" }, { status: 403 });
  }

  const { body, error } = await parseHarnessRequest(request);
  if (error) {
    return error;
  }

  const parsed = clientRequestSchema.safeParse(body);

  if (!parsed.success || parsed.data.method !== method) {
    return Response.json({ error: "Invalid Harness RPC envelope" }, { status: 400 });
  }

  if (!isAllowedModelSettingsPayload(method, parsed.data.payload)) {
    return Response.json(
      { error: "Harness settings operation is outside the OpenQuantum model seam" },
      { status: 403 },
    );
  }

  const envelope =
    method === "session.create"
      ? {
          ...parsed.data,
          payload: withDeploymentWorkspace(parsed.data.payload),
        }
      : parsed.data;

  try {
    const upstream = await fetch(upstreamUrl(method), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(envelope),
      cache: "no-store",
      signal: request.signal,
    });

    return forward(upstream);
  } catch {
    return harnessUnavailableResponse(parsed.data.rpcId);
  }
}
