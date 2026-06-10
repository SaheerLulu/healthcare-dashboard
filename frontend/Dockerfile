# Frontend container — DASH-E20-F03 (Deployment).
#
# Multi-stage: vite build in node, then static serve via nginx with a
# proxy_pass for /api/ that points at the backend container.
#
# Build context is the REPO ROOT (not frontend/): some committed pages
# still import the legacy mock-data module at <root>/src/app/data, so
# the build needs both frontend/ and src/ present.
#   docker build -f frontend/Dockerfile .
FROM node:20-alpine AS builder

WORKDIR /app/frontend

# Install deps from the lockfile so the build is reproducible.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY frontend/ ./
# Legacy root-level data module still referenced from
# frontend/src/app/pages via ../../../../src/app/data.
COPY src/ /app/src/
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine AS runtime

# nginx config: SPA fallback to index.html + proxy /api/ to the
# DASH backend service in compose. The backend service name is
# expected to be reachable as `backend` on the same docker network.
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost/ > /dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
