import type {
  ApiProxy,
  HostFrame,
  MuxFrame,
  RequestPayload,
  ResponseValue,
  RpcId,
  RpcMessage,
  RpcRequest,
  RpcResponse,
  ServerRequest,
} from "@deepseek-ai/dsh-host-apiproxy/api";
import { serverRequestSchema } from "@deepseek-ai/dsh-host-apiproxy/api";
import {
  hostFrameSchema,
  muxFrameSchema,
} from "@deepseek-ai/dsh-host-apiproxy/api/events.schema";
import { AbstractApiClient } from "@deepseek-ai/dsh-host-apiproxy/client";

const HARNESS_PROXY_PREFIX = "/api/harness/";
const MAX_BUFFERED_FRAMES = 1_000;

interface FrameSchema<Frame> {
  parse(value: unknown): Frame;
}

export class HarnessRpcOutcomeUnknownError extends Error {
  readonly code = "unknown-after-send";

  constructor(message = "Harness RPC outcome is unknown after send") {
    super(message);
    this.name = "HarnessRpcOutcomeUnknownError";
  }
}

export class OpenQuantumWebApiClient extends AbstractApiClient {
  private promptEnvelopeCapture: ((rpcId: RpcId) => void) | undefined;

  /**
   * Starts exactly one session.prompt and exposes its correlation before fetch
   * settles. This dedicated seam cannot observe or steal unrelated envelopes.
   */
  startPrompt(
    payload: RequestPayload<"session.prompt">,
    signal?: AbortSignal,
  ): {
    readonly rpcId: RpcId;
    readonly completion: Promise<RpcResponse<ResponseValue<"session.prompt">>>;
  } {
    let captured: RpcId | undefined;
    this.promptEnvelopeCapture = (rpcId) => {
      captured = rpcId;
    };
    let completion: Promise<RpcResponse<ResponseValue<"session.prompt">>>;
    try {
      completion = this.sessions.prompt(payload, signal);
    } finally {
      this.promptEnvelopeCapture = undefined;
    }
    if (!captured) {
      throw new Error("session.prompt correlation was not captured");
    }
    return { rpcId: captured, completion };
  }

  protected override onEnvelope(message: RpcMessage): void {
    if (
      this.promptEnvelopeCapture &&
      message.type === "client-request" &&
      message.method === "session.prompt"
    ) {
      this.promptEnvelopeCapture(message.rpcId);
    }
    super.onEnvelope(message);
  }

  protected async doFetch(input: URL, init?: RequestInit): Promise<Response> {
    const target = new URL(input);
    target.pathname = `${HARNESS_PROXY_PREFIX}${target.pathname.slice("/api/".length)}`;
    const response = await fetch(target, { ...init, cache: "no-store" });
    if (
      response.headers.get("x-openquantum-rpc-outcome") ===
      "unknown-after-send"
    ) {
      throw new HarnessRpcOutcomeUnknownError();
    }
    return response;
  }

  protected openMux(
    _payload: Parameters<ApiProxy["events"]["mux"]>[0]["payload"],
    signal: AbortSignal,
    onOpen?: () => void,
  ): AsyncIterable<RpcRequest<MuxFrame>> {
    return this.readWebSocket("events.mux", signal, muxFrameSchema, onOpen);
  }

  protected openHost(
    _payload: Parameters<ApiProxy["events"]["host"]>[0]["payload"],
    signal: AbortSignal,
    onOpen?: () => void,
  ): AsyncIterable<RpcRequest<HostFrame>> {
    return this.readWebSocket("events.host", signal, hostFrameSchema, onOpen);
  }

  private async *readWebSocket<Frame extends MuxFrame | HostFrame>(
    method: "events.mux" | "events.host",
    signal: AbortSignal,
    frameSchema: FrameSchema<Frame>,
    onOpen?: () => void,
  ): AsyncIterable<RpcRequest<Frame>> {
    const url = new URL(`${HARNESS_PROXY_PREFIX}${method}`, location.origin);
    url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(url);
    const queue: Array<RpcRequest<Frame> | Error | null> = [];
    let wake: (() => void) | undefined;
    let terminated = false;

    const enqueue = (item: RpcRequest<Frame> | Error | null) => {
      queue.push(item);
      wake?.();
      wake = undefined;
    };
    const terminate = (item: Error | null) => {
      if (terminated) {
        return;
      }

      terminated = true;
      enqueue(item);
    };
    const closeSocket = (code?: number, reason?: string) => {
      if (
        socket.readyState === WebSocket.CONNECTING ||
        socket.readyState === WebSocket.OPEN
      ) {
        socket.close(code, reason);
      }
    };
    const handleOpen = () => {
      try {
        onOpen?.();
      } catch (error) {
        terminate(error instanceof Error ? error : new Error(String(error)));
        closeSocket(1011, "event consumer failed to open");
      }
    };
    const handleClose = (event: CloseEvent) => {
      if (signal.aborted) {
        terminate(null);
        return;
      }

      const detail = event.reason ? `: ${event.reason}` : "";
      terminate(
        new Error(`${method} closed with code ${event.code}${detail}`),
      );
    };
    const handleError = () => {
      terminate(new Error(`${method} WebSocket transport failed`));
    };
    const handleMessage = (event: MessageEvent) => {
      if (terminated) {
        return;
      }

      try {
        if (typeof event.data !== "string") {
          throw new Error("binary WebSocket frame is not supported");
        }

        const full = serverRequestSchema.parse(
          JSON.parse(event.data),
        ) as ServerRequest;
        const payload = frameSchema.parse(full.payload);

        if (full.method !== payload.type) {
          throw new Error(
            `event method mismatch: ${full.method} != ${payload.type}`,
          );
        }

        this.onEnvelope(full);

        if (queue.length >= MAX_BUFFERED_FRAMES) {
          throw new Error(`${method} event buffer exceeded its safe limit`);
        }

        enqueue({ rpcId: full.rpcId, payload });
      } catch (error) {
        terminate(error instanceof Error ? error : new Error(String(error)));
        closeSocket(1002, "invalid event frame");
      }
    };
    const handleAbort = () => {
      terminate(null);
      closeSocket();
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("error", handleError, { once: true });
    socket.addEventListener("close", handleClose, { once: true });
    signal.addEventListener("abort", handleAbort, { once: true });

    if (signal.aborted) {
      handleAbort();
    }

    try {
      while (true) {
        while (queue.length > 0) {
          const item = queue.shift();
          if (item === null) {
            return;
          }
          if (item instanceof Error) {
            throw item;
          }
          if (item) {
            yield item;
          }
        }

        await new Promise<void>((resolve) => {
          wake = resolve;
        });
      }
    } finally {
      signal.removeEventListener("abort", handleAbort);
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("error", handleError);
      socket.removeEventListener("close", handleClose);
      closeSocket();
    }
  }
}
