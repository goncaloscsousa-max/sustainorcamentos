#!/usr/bin/env bash
#
# Rotação SIMPLES de backups SQLite. Conservador por defeito.
#
# REGRAS:
#   - Lista backups mais antigos que --days dias (default: 30).
#   - NUNCA apaga o backup mais recente, mesmo que esteja fora do prazo.
#   - DRY RUN por defeito — mostra o que apagaria mas NÃO apaga.
#   - Só apaga se passares --apply explicitamente.
#   - Apaga também ficheiros -wal e -shm associados, se existirem.
#
# Estratégias mais avançadas (GFS — Grandfather-Father-Son: 7 diários +
# 4 semanais + 3 mensais) ficam documentadas em deploy/README.md mas NÃO
# implementadas aqui — preferimos manualmente decidir o que apagar.
#
# Uso:
#   ./backup-rotate.sh                 # DRY RUN, mostra candidatos
#   ./backup-rotate.sh --apply         # apaga
#   ./backup-rotate.sh --days=60       # mantém últimos 60 dias
#   ./backup-rotate.sh --apply --days=90
#
# Variáveis:
#   BACKUP_DIR   (default: /srv/sustain-orcamentos/shared/backups)

set -euo pipefail

APP_ROOT="${APP_ROOT:-/srv/sustain-orcamentos}"
BACKUP_DIR="${BACKUP_DIR:-$APP_ROOT/shared/backups}"
KEEP_DAYS=30
APPLY="false"

for arg in "$@"; do
  case "$arg" in
    --apply) APPLY="true" ;;
    --days=*) KEEP_DAYS="${arg#--days=}" ;;
    --help|-h)
      grep -E '^# ' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "Argumento desconhecido: $arg" >&2
      echo "Usa --help para ajuda." >&2
      exit 2
      ;;
  esac
done

if ! [[ "$KEEP_DAYS" =~ ^[0-9]+$ ]]; then
  echo "ERRO: --days tem de ser número inteiro." >&2
  exit 2
fi

if [ ! -d "$BACKUP_DIR" ]; then
  echo "Pasta de backups não existe: $BACKUP_DIR"
  exit 1
fi

cd "$BACKUP_DIR"

# Backup mais recente — protegido sempre.
NEWEST=""
if ls -1 sustain-*.db pre-restore-*.db >/dev/null 2>&1; then
  NEWEST=$(ls -1t sustain-*.db pre-restore-*.db 2>/dev/null | head -n1 || true)
fi

# Candidatos: ficheiros .db mais antigos que KEEP_DAYS.
mapfile -t CANDIDATES < <(find . -maxdepth 1 -type f \
  \( -name "sustain-*.db" -o -name "pre-restore-*.db" \) \
  -mtime "+$KEEP_DAYS" | sort)

if [ ${#CANDIDATES[@]} -eq 0 ]; then
  echo "[rotate] nada para apagar (sem backups com idade > $KEEP_DAYS dias)."
  exit 0
fi

echo "[rotate] modo: $([ "$APPLY" = "true" ] && echo APPLY || echo DRY-RUN)"
echo "[rotate] retenção: últimos $KEEP_DAYS dias"
echo "[rotate] backup mais recente (sempre preservado): $NEWEST"
echo ""

TO_DELETE=()
for f in "${CANDIDATES[@]}"; do
  base=$(basename "$f")
  if [ "$base" = "$NEWEST" ]; then
    echo "  KEEP (mais recente): $base"
  else
    echo "  DEL: $base"
    TO_DELETE+=("$f")
  fi
done

echo ""

if [ ${#TO_DELETE[@]} -eq 0 ]; then
  echo "[rotate] nada a apagar (só o mais recente está fora do prazo)."
  exit 0
fi

if [ "$APPLY" != "true" ]; then
  echo "DRY RUN. Nada apagado. Para apagar de facto:"
  echo "  $0 --apply --days=$KEEP_DAYS"
  exit 0
fi

# --- Apply ---

echo "[rotate] a apagar ${#TO_DELETE[@]} ficheiro(s)..."
for f in "${TO_DELETE[@]}"; do
  rm -- "$f"
  rm -f -- "${f}-wal" "${f}-shm"
  echo "  apagado: $(basename "$f")"
done
echo "[rotate] OK"
