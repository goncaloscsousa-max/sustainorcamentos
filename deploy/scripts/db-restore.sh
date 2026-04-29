#!/usr/bin/env bash
#
# Restore manual da SQLite a partir de um ficheiro de backup.
#
# Operação destructiva: substitui o ficheiro de DB actual pelo backup.
# Por isso EXIGE confirmação explícita (escrever "RESTORE" em maiúsculas).
#
# O QUE FAZ:
#   1. Mostra DB actual e backup escolhido (tamanho, data).
#   2. Pede confirmação RESTORE.
#   3. Pára o serviço sustain-orcamentos.
#   4. Faz safety backup da DB actual em backups/pre-restore-<ts>.db
#      (incluindo -wal e -shm se existirem).
#   5. Substitui a DB actual pelo backup.
#   6. Apaga -wal/-shm residuais (eram do estado antigo, inconsistentes
#      com a nova DB).
#   7. Arranca o serviço.
#   8. Corre healthcheck. Se falhar, indica como reverter.
#
# Uso:
#   ./db-restore.sh <ficheiro-de-backup.db>
#
#   Sem argumento, lista os backups disponíveis.

set -euo pipefail

APP_ROOT="${APP_ROOT:-/srv/sustain-orcamentos}"
SHARED="$APP_ROOT/shared"
DB_PATH="${DATABASE_PATH:-$SHARED/data/sustain.db}"
BACKUP_DIR="${BACKUP_DIR:-$SHARED/backups}"
SERVICE_NAME="${SERVICE_NAME:-sustain-orcamentos}"

if [ $# -lt 1 ]; then
  echo "Uso: $0 <ficheiro-de-backup.db>"
  echo ""
  echo "Backups disponíveis em $BACKUP_DIR:"
  if [ -d "$BACKUP_DIR" ]; then
    ls -lhrt "$BACKUP_DIR"/*.db 2>/dev/null || echo "  (nenhum)"
  else
    echo "  (pasta não existe)"
  fi
  exit 2
fi

BACKUP="$1"

if [ ! -f "$BACKUP" ]; then
  echo "ERRO: ficheiro de backup não existe: $BACKUP" >&2
  exit 1
fi

if [ ! -f "$DB_PATH" ]; then
  echo "ERRO: DB actual não existe em $DB_PATH" >&2
  exit 1
fi

echo "================================================================"
echo "RESTORE DA BASE DE DADOS"
echo "================================================================"
echo ""
echo "DB actual:"
ls -lh "$DB_PATH"
echo ""
echo "Backup a usar:"
ls -lh "$BACKUP"
echo ""
echo "Esta operação:"
echo "  1) Pára o serviço $SERVICE_NAME"
echo "  2) Faz safety backup da DB actual em $BACKUP_DIR/pre-restore-<ts>.db"
echo "  3) Substitui $DB_PATH pelo backup escolhido"
echo "  4) Arranca o serviço"
echo "  5) Corre healthcheck"
echo ""
echo "É DESTRUTIVO — a DB actual será substituída."
echo ""
read -r -p 'Para confirmar, escreve RESTORE em maiúsculas: ' CONFIRM
if [ "$CONFIRM" != "RESTORE" ]; then
  echo "Cancelado."
  exit 1
fi

# --- Safety backup ---

mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)
SAFETY="$BACKUP_DIR/pre-restore-$TS.db"

echo ""
echo "[restore] safety backup -> $SAFETY"
cp -a "$DB_PATH" "$SAFETY"
[ -f "$DB_PATH-wal" ] && cp -a "$DB_PATH-wal" "$SAFETY-wal" || true
[ -f "$DB_PATH-shm" ] && cp -a "$DB_PATH-shm" "$SAFETY-shm" || true

# --- Stop service ---

echo "[restore] systemctl stop $SERVICE_NAME"
sudo systemctl stop "$SERVICE_NAME"

# --- Replace DB ---

echo "[restore] a substituir $DB_PATH"
cp -a "$BACKUP" "$DB_PATH"

# WAL/SHM antigos não correspondem à DB nova — apaga-os.
# (O SQLite recria os ficheiros conforme necessário no próximo open.)
rm -f "$DB_PATH-wal" "$DB_PATH-shm"

# --- Start service ---

echo "[restore] systemctl start $SERVICE_NAME"
sudo systemctl start "$SERVICE_NAME"

# --- Healthcheck ---

sleep 3
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if "$SCRIPT_DIR/healthcheck.sh"; then
  echo ""
  echo "[restore] OK"
  echo "Safety backup da DB anterior: $SAFETY"
  echo "Mantém este safety por uns dias antes de o apagar."
  exit 0
fi

echo ""
echo "================================================================"
echo "RESTORE FEITO MAS HEALTHCHECK FALHOU"
echo "================================================================"
echo "Para reverter o restore (voltar à DB que estava antes):"
echo ""
echo "  sudo systemctl stop $SERVICE_NAME"
echo "  cp -a '$SAFETY' '$DB_PATH'"
[ -f "$SAFETY-wal" ] && echo "  cp -a '$SAFETY-wal' '$DB_PATH-wal'"
[ -f "$SAFETY-shm" ] && echo "  cp -a '$SAFETY-shm' '$DB_PATH-shm'"
echo "  sudo systemctl start $SERVICE_NAME"
echo ""
echo "Logs do serviço:"
echo "  journalctl -u $SERVICE_NAME -n 100 --no-pager"
exit 1
