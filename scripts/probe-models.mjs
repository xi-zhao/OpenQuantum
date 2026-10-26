import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const envFile = path.join(projectRoot, ".env");

if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const providers = [
  {
    id: "openquantum-public",
    baseURL: process.env.OPENQUANTUM_PUBLIC_BASE_URL,
    apiKey: process.env.OPENQUANTUM_PUBLIC_API_KEY,
    models: ["kimi-k2.7-code", "glm5.2"],
  },
  {
    id: "openquantum-private",
    baseURL: process.env.OPENQUANTUM_PRIVATE_BASE_URL,
    apiKey: process.env.OPENQUANTUM_PRIVATE_API_KEY,
    models: ["kimi2.7"],
  },
];

const providerFlagIndex = process.argv.indexOf("--provider");
const selectedProvider =
  providerFlagIndex === -1 ? undefined : process.argv[providerFlagIndex + 1];
const modelFlagIndex = process.argv.indexOf("--model");
const selectedModel = modelFlagIndex === -1 ? undefined : process.argv[modelFlagIndex + 1];
const requestedProviders = selectedProvider
  ? providers.filter((provider) => provider.id === selectedProvider)
  : providers;

if (providerFlagIndex !== -1 && (!selectedProvider || requestedProviders.length === 0)) {
  console.error("Use --provider openquantum-public or openquantum-private.");
  process.exit(2);
}
if (modelFlagIndex !== -1 && (!selectedModel || !requestedProviders.some(provider => provider.models.includes(selectedModel)))) {
  console.error("Select a model declared in the requested provider catalog.");
  process.exit(2);
}
const providersToProbe = selectedModel
  ? requestedProviders.filter(provider => provider.models.includes(selectedModel))
  : requestedProviders;

// Upstream bodies and transport messages can echo credentials. Reports retain
// only finite error classes, status codes and verified protocol facts.
function httpFailure(response) {
  if (response.ok) return null;
  const category = response.status === 401 ? "unauthorized" : response.status === 403 ? "forbidden"
    : response.status === 404 ? "not-found" : response.status === 429 ? "rate-limited"
      : response.status >= 500 ? "upstream-failure" : "invalid-request";
  return `HTTP ${response.status}: ${category}`;
}

function transportFailure(error) {
  return error?.name === "TimeoutError" || error?.name === "AbortError" ? "request-timeout" : "request-failed";
}

function finishReason(choice) {
  const reason = choice?.finish_reason;
  if (reason == null) return null;
  return ["stop", "length", "tool_calls", "content_filter", "function_call"].includes(reason) ? reason : "unknown";
}

function reportEndpoint(provider) {
  const url = new URL(provider.baseURL);
  return `${url.protocol}//${url.host}${url.pathname}`.replaceAll(provider.apiKey, "[redacted]")
    .replaceAll(encodeURIComponent(provider.apiKey), "[redacted]");
}

function endpoint(baseURL, resource) {
  return `${baseURL.replace(/\/$/, "")}/${resource}`;
}

async function readJson(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function request(provider, resource, init = {}) {
  return fetch(endpoint(provider.baseURL, resource), {
    ...init,
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(60_000),
  });
}

async function postCompletion(provider, body) {
  const response = await request(provider, "chat/completions", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const responseBody = await readJson(response);

  return { response, body: responseBody };
}

async function probeTextGeneration(provider, model) {
  const { response, body } = await postCompletion(provider, {
    model,
    messages: [
      {
        role: "user",
        content: "Reply with exactly OPENQUANTUM_OK.",
      },
    ],
    max_tokens: 256,
    temperature: 0,
  });
  const choice = body.choices?.[0];

  return {
    status: response.status,
    ok: response.ok,
    finishReason: finishReason(choice),
    hasText: Boolean(choice?.message?.content),
    exactText: typeof choice?.message?.content === "string" && choice.message.content.trim() === "OPENQUANTUM_OK",
    error: httpFailure(response),
  };
}

async function probeToolCalling(provider, model) {
  const { response, body } = await postCompletion(provider, {
    model,
    messages: [
      {
        role: "user",
        content: "Call platform_health with marker OPENQUANTUM_OK. Do not answer in plain text.",
      },
    ],
    max_tokens: 256,
    temperature: 0,
    tools: [
      {
        type: "function",
        function: {
          name: "platform_health",
          description: "Return the platform health status.",
          parameters: {
            type: "object",
            properties: {
              marker: { type: "string", enum: ["OPENQUANTUM_OK"] },
            },
            required: ["marker"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: {
      type: "function",
      function: { name: "platform_health" },
    },
  });
  const choice = body.choices?.[0];
  const healthCall = choice?.message?.tool_calls?.find(
    (call) => call.function?.name === "platform_health",
  );
  let validHealthCall = false;
  try {
    const args = JSON.parse(healthCall?.function?.arguments ?? "null");
    validHealthCall = args?.marker === "OPENQUANTUM_OK" && Object.keys(args).length === 1;
  } catch { /* Invalid tool JSON is a failed probe. */ }

  return {
    status: response.status,
    ok: response.ok,
    finishReason: finishReason(choice),
    hasToolCall: validHealthCall,
    error: httpFailure(response),
  };
}

async function probeModel(provider, model) {
  const textGeneration = await probeTextGeneration(provider, model);
  const toolCalling = await probeToolCalling(provider, model);

  return {
    model,
    textGeneration,
    toolCalling,
    ok:
      textGeneration.ok &&
      textGeneration.hasText &&
      textGeneration.exactText &&
      textGeneration.finishReason === "stop" &&
      toolCalling.ok &&
      toolCalling.hasToolCall &&
      toolCalling.finishReason === "tool_calls",
  };
}

async function probeProvider(provider) {
  if (!provider.baseURL || !provider.apiKey) {
    return {
      provider: provider.id,
      error: "Missing base URL or API key",
    };
  }

  const modelsResponse = await request(provider, "models");
  const modelsBody = await readJson(modelsResponse);
  const advertised = Array.isArray(modelsBody.data)
    ? modelsBody.data.map((entry) => entry?.id).filter(id => typeof id === "string"
      && id.length <= 256 && !id.includes(provider.apiKey) && !id.includes(encodeURIComponent(provider.apiKey))
      && /^[A-Za-z0-9_.:/-]+$/.test(id))
    : [];
  const modelResults = [];

  for (const model of selectedModel ? provider.models.filter(model => model === selectedModel) : provider.models) {
    try {
      modelResults.push(await probeModel(provider, model));
    } catch (error) {
      modelResults.push({
        model,
        ok: false,
        error: transportFailure(error),
      });
    }
  }

  return {
    provider: provider.id,
    baseURL: reportEndpoint(provider),
    modelsEndpoint: {
      status: modelsResponse.status,
      ok: modelsResponse.ok,
      advertised,
      error: httpFailure(modelsResponse),
    },
    models: modelResults,
  };
}

const results = [];

for (const provider of providersToProbe) {
  try {
    results.push(await probeProvider(provider));
  } catch (error) {
    results.push({
      provider: provider.id,
      error: transportFailure(error),
    });
  }
}

console.log(JSON.stringify(results, null, 2));

if (
  results.some(
    (result) =>
      result.error ||
      result.modelsEndpoint?.ok === false ||
      result.models?.some((model) => model.ok === false),
  )
) {
  process.exitCode = 1;
}
