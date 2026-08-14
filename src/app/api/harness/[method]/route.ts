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
  "llm.models",
]);

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
