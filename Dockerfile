ARG NODE_VERSION=24.14.1

FROM ghcr.io/astral-sh/uv:0.11.1 AS uv

FROM node:${NODE_VERSION}-bookworm-slim AS production-dependencies

RUN apt-get update \
  && apt-get install --yes --no-install-recommends g++ make python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund

FROM node:${NODE_VERSION}-bookworm-slim

COPY --from=uv /uv /uvx /usr/local/bin/

RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY --from=production-dependencies --chown=node:node /workspace/node_modules ./node_modules
COPY package.json package-lock.json ./

COPY --chown=node:node . .

ENV NODE_ENV=production
ENV DSH_TELEMETRY_MODE=DISABLED

RUN mkdir -p /workspace/.openquantum /workspace/results \
  && chown -R node:node /workspace/.openquantum /workspace/results

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl --fail --silent http://127.0.0.1:3000/ >/dev/null || exit 1

CMD ["npm", "start"]
