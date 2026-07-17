#!/usr/bin/env bash
# ============================================================
# remote-deploy.sh — runs ON the target server, invoked over
# SSH by the "Build & Deploy" GitHub Actions workflow.
#
# Pulls the images built in CI, rolls this environment's
# compose stack, then refreshes the nginx vhost and TLS cert.
#
# The dashboard has no database of its own: it reads the pharmacy
# database of the SAME environment. On first deploy the .env is
# bootstrapped from the example file with DJANGO_SECRET_KEY,
# POSTGRES_PASSWORD and POSTGRES_DB derived from the pharmacy env
# (/opt/healthcare/<env>/.env) so JWT SSO and DB access stay in
# sync — the pharmacy app must therefore be deployed first.
#
# Required env:
#   ENV_NAME        biloop-dev | biloop-prod | seefmed-dev | seefmed-prod
#   DOMAIN          public hostname of this environment
#   BACKEND_IMAGE   full GHCR image ref pinned to the commit SHA
#   FRONTEND_IMAGE  full GHCR image ref pinned to the commit SHA
#   REGISTRY_USER   GHCR username (github.actor)
#   REGISTRY_TOKEN  GHCR token (the job's GITHUB_TOKEN)
# Optional env:
#   CERTBOT_EMAIL   default info@biloop.ai
#   APP_BASE        default /opt/dashboard
#   PHARMA_BASE     default /opt/healthcare
# ============================================================
set -euo pipefail

: "${ENV_NAME:?}" "${DOMAIN:?}" "${BACKEND_IMAGE:?}" "${FRONTEND_IMAGE:?}" "${REGISTRY_USER:?}" "${REGISTRY_TOKEN:?}"

APP_BASE="${APP_BASE:-/opt/dashboard}"
PHARMA_BASE="${PHARMA_BASE:-/opt/healthcare}"
REPO_DIR="${APP_BASE}/repo-${ENV_NAME}"
ENV_DIR="${APP_BASE}/${ENV_NAME}"
ENV_FILE="${ENV_DIR}/.env"
PHARMA_ENV="${PHARMA_BASE}/${ENV_NAME}/.env"
COMPOSE_FILE="${REPO_DIR}/deploy/docker-compose.app.yml"
PROJECT="dashboard-${ENV_NAME}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-info@biloop.ai}"

log() { echo "[deploy ${ENV_NAME}] $*"; }

SUDO="sudo -n"
[ "$(id -u)" = "0" ] && SUDO=""

log "=== Deployment started at $(date -u '+%Y-%m-%d %H:%M:%S UTC') ==="
log "backend image:  ${BACKEND_IMAGE}"
log "frontend image: ${FRONTEND_IMAGE}"

# ---- 1. Environment file (derived from the pharmacy env) ----
if [ ! -f "$ENV_FILE" ]; then
  log "No ${ENV_FILE} — bootstrapping from example + pharmacy env"
  if [ ! -f "$PHARMA_ENV" ]; then
    log "ERROR: ${PHARMA_ENV} not found. Deploy the pharmacy app to this"
    log "environment first — the dashboard shares its database and secret key."
    exit 1
  fi
  SECRET_KEY="$(grep -E '^DJANGO_SECRET_KEY=' "$PHARMA_ENV" | head -1 | cut -d= -f2-)"
  PHARMA_DB_URL="$(grep -E '^DATABASE_URL=' "$PHARMA_ENV" | head -1 | cut -d= -f2-)"
  PG_PASSWORD="$(grep -E '^POSTGRES_PASSWORD=' "$PHARMA_ENV" | head -1 | cut -d= -f2-)"
  if [ -z "$PG_PASSWORD" ] || [ "$PG_PASSWORD" = "change-me" ]; then
    PG_PASSWORD="$(echo "$PHARMA_DB_URL" | sed -E 's|.*://[^:]+:([^@]*)@.*|\1|')"
  fi
  PG_DB="${PHARMA_DB_URL##*/}"
  [ -n "$SECRET_KEY" ] || { log "ERROR: no DJANGO_SECRET_KEY in ${PHARMA_ENV}"; exit 1; }
  [ -n "$PG_DB" ] || { log "ERROR: no DATABASE_URL in ${PHARMA_ENV}"; exit 1; }
  mkdir -p "$ENV_DIR"
  cp "${REPO_DIR}/deploy/envs/.env.${ENV_NAME}.example" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  sed -i "s|^DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY=${SECRET_KEY}|" "$ENV_FILE"
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${PG_PASSWORD}|" "$ENV_FILE"
  sed -i "s|^POSTGRES_DB=.*|POSTGRES_DB=${PG_DB}|" "$ENV_FILE"
fi

FRONTEND_PORT="$(grep -E '^FRONTEND_PORT=' "$ENV_FILE" | tail -1 | cut -d= -f2 | tr -d '[:space:]')"
[ -n "$FRONTEND_PORT" ] || { log "ERROR: FRONTEND_PORT missing from ${ENV_FILE}"; exit 1; }

# ---- 2. Pull images and roll the stack ---------------------
echo "$REGISTRY_TOKEN" | docker login ghcr.io -u "$REGISTRY_USER" --password-stdin

export BACKEND_IMAGE FRONTEND_IMAGE
compose() { docker compose -p "$PROJECT" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

log "Pulling images"
compose pull --quiet
log "Rolling stack ${PROJECT}"
compose up -d --remove-orphans

# ---- 3. Nginx vhost + TLS ----------------------------------
render_vhost() {
  DOMAIN="$DOMAIN" FRONTEND_PORT="$FRONTEND_PORT" \
    envsubst '${DOMAIN} ${FRONTEND_PORT}' <"${REPO_DIR}/deploy/nginx/$1" >"/tmp/${DOMAIN}.conf"
  $SUDO mv "/tmp/${DOMAIN}.conf" "/etc/nginx/sites-available/${DOMAIN}.conf"
  $SUDO ln -sf "/etc/nginx/sites-available/${DOMAIN}.conf" "/etc/nginx/sites-enabled/${DOMAIN}.conf"
}

reload_nginx() {
  if $SUDO nginx -t 2>&1; then
    $SUDO systemctl reload nginx
    return 0
  fi
  log "WARNING: nginx config test failed — reload skipped"
  return 1
}

if command -v nginx >/dev/null 2>&1; then
  command -v envsubst >/dev/null 2>&1 || { $SUDO apt-get update -qq; $SUDO apt-get install -y -qq gettext-base; }
  $SUDO mkdir -p /var/www/certbot
  $SUDO rm -f /etc/nginx/sites-enabled/default
  if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    render_vhost site.conf.template
    reload_nginx || true
  else
    log "No certificate for ${DOMAIN} yet — installing HTTP bootstrap vhost"
    render_vhost site.bootstrap.conf.template
    if reload_nginx && command -v certbot >/dev/null 2>&1; then
      log "Requesting Let's Encrypt certificate for ${DOMAIN}"
      if $SUDO certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" \
           --non-interactive --agree-tos -m "$CERTBOT_EMAIL"; then
        render_vhost site.conf.template
        reload_nginx || true
        log "HTTPS enabled for ${DOMAIN}"
      else
        log "WARNING: certbot failed (is DNS for ${DOMAIN} pointing at this server?) — staying on HTTP"
      fi
    fi
  fi
else
  log "WARNING: nginx not installed — skipped vhost setup"
fi

# ---- 4. Health check ---------------------------------------
sleep 10
compose ps || true
if curl -fsS -o /dev/null --max-time 10 "http://127.0.0.1:${FRONTEND_PORT}/"; then
  log "Frontend responding on port ${FRONTEND_PORT}"
else
  log "WARNING: frontend not responding on port ${FRONTEND_PORT}"
  compose logs --tail=40 || true
fi
compose logs --tail=15 backend || true

# ---- 5. Cleanup old images ---------------------------------
docker image prune -af --filter "until=168h" >/dev/null 2>&1 || true

log "=== Deployment finished at $(date -u '+%Y-%m-%d %H:%M:%S UTC') ==="
