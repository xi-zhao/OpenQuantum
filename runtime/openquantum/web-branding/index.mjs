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
  return titled.replace("</head>", `${BRAND_STYLES}\n</head>`);
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
}
