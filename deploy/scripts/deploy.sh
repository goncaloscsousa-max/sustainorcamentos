#!/usr/bin/env bash
#
# Deploy conservador da Sustain Orçamentos.
#
# O QUE FAZ (por esta ordem, parando se algum passo falhar):
#   1. Cria nova release em /srv/sustain-orcamentos/releases/<timestamp>
#   2. Faz git clone do repo na release nova
#   3. Cria symlink .env para a partilhada
#   4. npm ci
#   5. npm run preflight  (lint + tsc + build)
#   6. npm run db:migrate
#   7. SÓ AGORA troca o symlink `current` para a release nova (atomicamente)
#   8. systemctl restart sustain-orcamentos
#   9. Healthcheck — se falhar, mostra como fazer rollback manual
#
# O QUE NÃO FAZ:
#   - Não apaga releases antigas (rollback continua possível).
#   - Não toca em backups.
#   - Não muda nada se algum passo antes do symlink falhar.
#
# Uso:
#   ./deploy.sh [git-ref]
#
#   git-ref opcional. Default: main.
#
# Variáveis:
#   APP_ROOT       (default: /srv/sustain-orcamentos)
#   REPO_URL       (default: __REPO_URL__ — substitui antes de usar)
#   SERVICE_NAME   (default: sustain-orcamentos)
#
# Pré-requisitos no servidor:
#   - Utilizador `sustain` com sudo NOPASSWD para `systemctl restart sustain-orcamentos`
#     ou correr este script como root.
#   - /srv/sustain-orcamentos/shared/.env existe e está preenchido.

set -euo pipefail

APP_ROOT="${APP_ROOT:-/srv/sustain-orcamentos}"
REPO_URL="${REPO_URL:-__REPO_URL__}"
SERVICE_NAME="${SERVICE_NAME:-sustain-orcamentos}"
GIT_REF="${1:-main}"

SHARED="$APP_ROOT/shared"
RELEASES="$APP_ROOT/releases"
CURRENT="$APP_ROOT/current"

# --- Validações iniciais ---

if [ "$REPO_URL" = "__REPO_URL__" ]; then
  echo "ERRO: REPO_URL não está definido. Edita o ficheiro ou exporta REPO_URL=..." >&2
  exit 1
fi

if [ ! -d "$SHARED" ]; then
  echo "ERRO: $SHARED não existe. Setup inicial não foi feito." >&2
  exit 1
fi

if [ ! -f "$SHARED/.env" ]; then
  echo "ERRO: $SHARED/.env não existe. Cria-o (ver deploy/README.md)." >&2
  exit 1
fi

mkdir -p "$RELEASES"

NEW_REL="$RELEASES/$(date +%Y%m%d-%H%M%S)"
echo "[deploy] nova release: $NEW_REL"
echo "[deploy] git ref: $GIT_REF"
echo "[deploy] repo: $REPO_URL"

# Guarda o symlink anterior (para rollback).
PREV_REL=""
if [ -L "$CURRENT" ]; then
  PREV_REL=$(readlink -f "$CURRENT")
  echo "[deploy] release actual: $PREV_REL"
fi

# --- Clone ---

git clone --depth 1 --branch "$GIT_REF" "$REPO_URL" "$NEW_REL"

cd "$NEW_REL"

# --- .env partilhado ---

ln -s "$SHARED/.env" .env

# --- Install + preflight + migrate ---

echo "[deploy] npm ci"
npm ci

echo "[deploy] preflight (lint + tsc + build)"
if ! npm run preflight; then
  echo ""
  echo "ERRO: preflight falhou. Release NÃO foi activada." >&2
  echo "Release nova fica em: $NEW_REL (podes investigar)." >&2
  exit 1
fi

echo "[deploy] db:migrate"
if ! npm run db:migrate; then
  echo ""
  echo "ERRO: migrations falharam. Release NÃO foi activada." >&2
  echo "Release nova fica em: $NEW_REL." >&2
  echo "Verifica $SHARED/data/sustain.db antes de tentar de novo." >&2
  exit 1
fi

# --- Symlink atómico ---

# `ln -sfn` + `mv -T` é o padrão para troca atómica em Linux.
echo "[deploy] a trocar symlink current -> $NEW_REL"
ln -sfn "$NEW_REL" "$CURRENT.tmp"
mv -Tf "$CURRENT.tmp" "$CURRENT"

# --- Restart serviço ---

echo "[deploy] systemctl restart $SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

# --- Healthcheck ---

# Aguarda um pouco para o Next.js arrancar antes do primeiro probe.
sleep 3

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if "$SCRIPT_DIR/healthcheck.sh"; then
  echo ""
  echo "[deploy] OK — release $NEW_REL activa."
  exit 0
fi

# --- Healthcheck falhou: NÃO apaga nada, mostra rollback manual ---

echo ""
echo "================================================================"
echo "DEPLOY ACTIVADO MAS HEALTHCHECK FALHOU"
echo "================================================================"
echo "A release nova fica em: $NEW_REL"
echo "Releases antigas NÃO foram apagadas."
echo ""
if [ -n "$PREV_REL" ] && [ -d "$PREV_REL" ]; then
  echo "Para fazer rollback rápido para a release anterior:"
  echo ""
  echo "  ln -sfn '$PREV_REL' '$CURRENT.tmp' && mv -Tf '$CURRENT.tmp' '$CURRENT'"
  echo "  sudo systemctl restart $SERVICE_NAME"
  echo ""
fi
echo "Para investigar logs:"
echo "  journalctl -u $SERVICE_NAME -n 100 --no-pager"
echo ""
exit 1
