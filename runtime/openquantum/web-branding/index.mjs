const BRAND_MARKER = "data-openquantum-branding";

const OPENQUANTUM_FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#14161f"/>
  <circle cx="32" cy="32" r="6" fill="#7c6cff"/>
  <ellipse cx="32" cy="32" rx="23" ry="9" fill="none" stroke="#a99cff" stroke-width="3"/>
  <ellipse cx="32" cy="32" rx="23" ry="9" fill="none" stroke="#a99cff" stroke-width="3" transform="rotate(60 32 32)"/>
  <ellipse cx="32" cy="32" rx="23" ry="9" fill="none" stroke="#a99cff" stroke-width="3" transform="rotate(120 32 32)"/>
</svg>`;

const OPENQUANTUM_MANIFEST = JSON.stringify(
  {
    id: "/",
    name: "OpenQuantum",
    short_name: "OpenQuantum",
    start_url: "/",
    scope: "/",
    display: "fullscreen",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  },
  null,
  2,
);

const OPENQUANTUM_COPY = Object.freeze({
  "探索未至之境": "探索开放量子世界",
  "Into the Unknown": "Explore the open quantum world",
  "填入各提供方的 API 密钥即可使用其模型。":
    "配置提供方的 API 地址和凭据，即可使用对应模型。",
  "Enter your API keys to use models from the following providers.":
    "Configure each provider endpoint and credential to use its models.",
  "自定义设置": "连接与模型设置",
  "Customized settings": "Connection and model settings",
});

const OPENQUANTUM_COPY_SCRIPT = `(() => {
  const replacements = ${JSON.stringify(OPENQUANTUM_COPY)};
  const heroPreviewLabels = new Set(["预览版", "Preview"]);
  const heroHeadlines = new Set([
    "探索开放量子世界",
    "Explore the open quantum world",
  ]);
  const connectionSettingLabels = new Set([
    "自定义设置",
    "Customized settings",
    "连接与模型设置",
    "Connection and model settings",
  ]);

  function replaceText(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      const headline = parent?.previousElementSibling?.textContent?.trim();
      if (
        parent !== null &&
        heroPreviewLabels.has(node.nodeValue) &&
        heroHeadlines.has(headline)
      ) {
        parent.remove();
        return;
      }

      const replacement = replacements[node.nodeValue];
      if (replacement !== undefined) node.nodeValue = replacement;
      return;
    }

    for (const child of node.childNodes) replaceText(child);
  }

  function revealProviderConnectionSettings(node) {
    const element = node.nodeType === Node.ELEMENT_NODE
      ? node
      : node.parentElement;
    if (element === null) return;

    const candidates = [];
    if (element.matches?.("details")) candidates.push(element);
    for (const details of element.querySelectorAll?.("details") ?? []) {
      candidates.push(details);
    }
    for (const details of candidates) {
      const summary = details.querySelector(":scope > summary");
      if (connectionSettingLabels.has(summary?.textContent?.trim())) {
        details.open = true;
      }
    }
  }

  function enhance(node) {
    replaceText(node);
    revealProviderConnectionSettings(node);
  }

  enhance(document.documentElement);
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "characterData") {
        enhance(record.target);
        continue;
      }
      for (const node of record.addedNodes) enhance(node);
    }
  }).observe(document.documentElement, {
    characterData: true,
    childList: true,
    subtree: true,
  });
})();`;

const BRAND_STYLES = `
<style ${BRAND_MARKER}>
  /* Keep the native Harness layout; replace only its product wordmarks. */
  svg[viewBox="0 0 182 24"] {
    display: none;
  }

  button:has(> svg[viewBox="0 0 182 24"])::before {
    content: "OpenQuantum";
    color: inherit;
    font-size: 20px;
    font-weight: 650;
    letter-spacing: -0.04em;
    line-height: 24px;
    white-space: nowrap;
  }

  svg[viewBox="0 0 23.16 17.04"] {
    display: none;
  }

  :is(button, span):has(> svg[viewBox="0 0 23.16 17.04"])::before {
    content: "OQ";
    display: inline-grid;
    width: 24px;
    height: 24px;
    place-items: center;
    border-radius: 8px;
    background: var(--dsw-alias-brand-primary, #6f5cff);
    color: white;
    font-size: 10px;
    font-weight: 750;
    letter-spacing: -0.04em;
  }

  /* The upstream empty-state illustration is decorative brand art. */
  svg[viewBox="0 0 1051 468"] {
    display: none;
  }
</style>`;

/**
 * Apply the OpenQuantum identity to the official Harness Web shell.
 *
 * The shell, routes and client plugins remain owned by DeepSeek Harness. This
 * host-supported index transform is deliberately limited to browser metadata
 * and product wordmarks, so upgrading Harness does not require carrying a UI
 * source fork.
 */
export function brandHarnessIndex(html) {
  if (html.includes(BRAND_MARKER)) {
    return html;
  }

  if (!html.includes("</head>")) {
    throw new Error("OpenQuantum branding requires a Harness HTML head");
  }

  const titled = /<title>[^<]*<\/title>/.test(html)
    ? html.replace(/<title>[^<]*<\/title>/, "<title>OpenQuantum</title>")
    : html.replace("</head>", "<title>OpenQuantum</title></head>");
  return titled.replace(
    "</head>",
    `${BRAND_STYLES}\n<script defer src="/openquantum-branding.js" ${BRAND_MARKER}></script>\n</head>`,
  );
}

export const name = "openquantum-web-branding";
export const inject = ["webServer"];

function staticAssetHandler(contentType, body) {
  return (request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { allow: "GET, HEAD" });
      response.end();
      return;
    }

    response.writeHead(200, {
      "cache-control": "no-cache",
      "content-length": Buffer.byteLength(body),
      "content-type": contentType,
    });
    response.end(request.method === "HEAD" ? undefined : body);
  };
}

export function apply(ctx) {
  ctx.effect(
    () => ctx.webServer.tapIndex(brandHarnessIndex),
    "openquantum: native Harness Web branding",
  );
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: "exact",
        path: "/favicon.svg",
        handler: staticAssetHandler("image/svg+xml; charset=utf-8", OPENQUANTUM_FAVICON),
      }),
    "openquantum: favicon",
  );
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: "exact",
        path: "/manifest.webmanifest",
        handler: staticAssetHandler(
          "application/manifest+json; charset=utf-8",
          OPENQUANTUM_MANIFEST,
        ),
      }),
    "openquantum: web manifest",
  );
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: "exact",
        path: "/openquantum-branding.js",
        handler: staticAssetHandler(
          "text/javascript; charset=utf-8",
          OPENQUANTUM_COPY_SCRIPT,
        ),
      }),
    "openquantum: product copy",
  );
}
