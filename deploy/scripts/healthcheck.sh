#!/usr/bin/env bash
#
# Faz HTTP GET ao /api/health da app local e devolve exit 0 se a app
# responder { "ok": true }. Faz retry com backoff curto para acomodar
# arranque do serviço logo após `systemctl restart`.
#
# Uso:
#   ./healthcheck.sh
#
# Variáveis:
#   HEALTHCHECK_URL       (default: http://localhost:3000/api/health)
#   HEALTHCHECK_TIMEOUT   (default: 10)   — segundos por tentativa
#   HEALTHCHECK_RETRIES   (default: 5)    — tentativas antes de desistir
#   HEALTHCHECK_DELAY     (default: 2)    — segundos entre tentativas

set -euo pipefail

URL="${HEALTHCHECK_URL:-http://localhost:3000/api/health}"
TIMEOUT="${HEALTHCHECK_TIMEOUT:-10}"
RETRIES="${HEALTHCHECK_RETRIES:-5}"
DELAY="${HEALTHCHECK_DELAY:-2}"

for i in $(seq 1 "$RETRIES"); do
  if curl -fsS --max-time "$TIMEOUT" "$URL" 2>/dev/null | grep -q '"ok":true'; then
    echo "[healthcheck] OK ($URL)"
    exit 0
  fi
  if [ "$i" -lt "$RETRIES" ]; then
    echo "[healthcheck] tentativa $i/$RETRIES falhou; nova tentativa em ${DELAY}s..."
    sleep "$DELAY"
  fi
done

echo "[healthcheck] FALHOU após $RETRIES tentativas — $URL não responde com ok:true"
exit 1
