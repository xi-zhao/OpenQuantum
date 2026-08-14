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
const providersToProbe = selectedProvider
  ? providers.filter((provider) => provider.id === selectedProvider)
  : providers;

if (selectedProvider && providersToProbe.length === 0) {
  console.error(`Unknown provider: ${selectedProvider}`);
  process.exit(2);
}

function endpoint(baseURL, resource) {
  return `${baseURL.replace(/\/$/, "")}/${resource}`;
}

async function readJson(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 300) };
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
    finishReason: choice?.finish_reason ?? null,
    hasText: Boolean(choice?.message?.content),
    error: response.ok ? null : (body.error?.message ?? body.raw ?? "Unknown error"),
  };
}

async function probeToolCalling(provider, model) {
  const { response, body } = await postCompletion(provider, {
    model,
    messages: [
      {
        role: "user",
        content: "Call platform_health now. Do not answer in plain text.",
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
            properties: {},
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

  return {
    status: response.status,
    ok: response.ok,
    finishReason: choice?.finish_reason ?? null,
    hasToolCall: Boolean(choice?.message?.tool_calls?.length),
    error: response.ok ? null : (body.error?.message ?? body.raw ?? "Unknown error"),
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
      toolCalling.ok &&
      toolCalling.hasToolCall,
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
    ? modelsBody.data.map((entry) => entry.id).filter(Boolean)
    : [];
  const modelResults = [];

  for (const model of provider.models) {
    try {
      modelResults.push(await probeModel(provider, model));
    } catch (error) {
      modelResults.push({
        model,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    provider: provider.id,
    baseURL: provider.baseURL,
    modelsEndpoint: {
      status: modelsResponse.status,
      ok: modelsResponse.ok,
      advertised,
      error: modelsResponse.ok
        ? null
        : (modelsBody.error?.message ?? modelsBody.raw ?? "Unknown error"),
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
      error: error instanceof Error ? error.message : String(error),
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
