import { approvalResponsePayloadSchema } from "@deepseek-ai/dsh-host-apiproxy/api/approvals.schema";
import { questionResponsePayloadSchema } from "@deepseek-ai/dsh-host-apiproxy/api/questions.schema";
import type { ClientResponse } from "@deepseek-ai/dsh-host-apiproxy/api";
import {
  clientResponseSchema,
  rpcReceiptSchema,
} from "@deepseek-ai/dsh-host-apiproxy/api/rpc.schema";

import {
  harnessBaseUrl,
  parseHarnessRequest,
} from "../../../../harness/server/browser-boundary.mjs";

function isAllowedInteractionResponse(
  response: ClientResponse,
): boolean {
  if (!response.result.ok) {
    return response.result.error.code === "cancelled";
  }

  return approvalResponsePayloadSchema.safeParse(response.result.value).success ||
    questionResponsePayloadSchema.safeParse(response.result.value).success;
}

/**
 * Narrow response carrier for answerable Harness frames.
 *
 * The browser may answer only approval/question requests. Credentials,
 * settings and arbitrary Host requests cannot reuse this generic carrier.
 */
export async function POST(request: Request): Promise<Response> {
  const { body, error } = await parseHarnessRequest(request);
  if (error) {
    return error;
  }

  const parsed = clientResponseSchema.safeParse(body);
  if (
    !parsed.success ||
    !isAllowedInteractionResponse(parsed.data)
  ) {
    return Response.json(
      { error: "Invalid Harness interaction response" },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(`${harnessBaseUrl()}/api/respond`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
      signal: request.signal,
    });

    if (!upstream.ok) {
      return Response.json(
        { error: "Harness rejected the interaction response carrier" },
        { status: 502 },
      );
    }

    const receipt = rpcReceiptSchema.safeParse(await upstream.json());
    if (!receipt.success) {
      return Response.json(
        { error: "Harness returned an invalid interaction receipt" },
        { status: 502 },
      );
    }

    return Response.json(receipt.data, {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Harness Runtime is unavailable" },
      { status: 503 },
    );
  }
}
