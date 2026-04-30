# Deploy — Sustain Orçamentos

Guia operacional para deploy em VPS Linux (Debian 12 ou Ubuntu 22.04+).

> **Placeholders neste guia.** Substitui antes de aplicar:
>
> - `__DOMAIN__` → o domínio real (ex.: `orcamentos.exemplo.pt`)
> - `__REPO_URL__` → URL git do repositório (HTTPS com token de leitura, ou SSH com chave)
> - `__APP_NAME__` → fica como `sustain-orcamentos` na configuração default

---

## Visão geral

- **Runtime:** Node 20 LTS (≥20.0.0 <23 — fixado em `package.json`).
- **Processo:** `next start` controlado por `systemd` (`sustain-orcamentos.service`).
- **Reverse proxy + HTTPS:** Caddy (Let's Encrypt automático).
- **Persistência:**
  - DB SQLite em `/srv/sustain-orcamentos/shared/data/sustain.db`
  - Uploads em `/srv/sustain-orcamentos/shared/uploads/`
  - Backups em `/srv/sustain-orcamentos/shared/backups/`
- **Releases:** clones git em `/srv/sustain-orcamentos/releases/<timestamp>`, com symlink atómico `current` para a release activa.
- **Rollback:** trocar o symlink + restart serviço.

---

## Pré-requisitos VPS

```bash
# Como root, num servidor Debian/Ubuntu europeu (privacy + latência).
apt update && apt -y upgrade

# Ferramentas básicas + git
apt install -y curl git ca-certificates gnupg ufw

# Node 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Caddy (reverse proxy + HTTPS automático)
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install -y caddy

# Firewall — só HTTP/HTTPS e SSH expostos
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Verificações
node -v   # deve ser v20.x
caddy version
```

---

## Layout de pastas

```
/srv/sustain-orcamentos/
├── current -> releases/<timestamp>      ← symlink para release activa
├── releases/
│   ├── 2026-04-29-103045/               ← clone git + node_modules + .next
│   ├── 2026-05-02-091230/
│   └── ...
└── shared/                              ← persiste entre deploys
    ├── .env                             ← secrets (mode 0600)
    ├── data/
    │   ├── sustain.db
    │   ├── sustain.db-wal
    │   └── sustain.db-shm
    ├── uploads/                         ← UPLOADS_ROOT
    ├── backups/                         ← snapshots SQLite
    └── logs/
        └── caddy-access.log
```

---

## Setup inicial (uma vez)

### 1. Criar utilizador e árvore de pastas

```bash
# Como root
adduser --system --group --shell /bin/bash --home /srv/sustain-orcamentos sustain

mkdir -p /srv/sustain-orcamentos/{releases,shared/{data,uploads,backups,logs}}
chown -R sustain:sustain /srv/sustain-orcamentos
chmod 750 /srv/sustain-orcamentos
```

### 2. Criar `.env` de produção

Como `sustain`:

```bash
sudo -u sustain bash
cd /srv/sustain-orcamentos/shared
cp /tmp/.env .          # transfere via scp para /tmp primeiro
chmod 600 .env
exit
```

Conteúdo mínimo do `.env` (substitui `__DOMAIN__` e os secrets):

```
NODE_ENV=production
PORT=3000
AUTH_URL=https://__DOMAIN__
AUTH_SECRET=<32-bytes-base64-novo-em-produção>
DATABASE_PATH=/srv/sustain-orcamentos/shared/data/sustain.db
UPLOADS_ROOT=/srv/sustain-orcamentos/shared/uploads
BACKUP_DIR=/srv/sustain-orcamentos/shared/backups
ANTHROPIC_API_KEY=<key-NOVA-de-produção-revogar-a-de-dev>

# --- Branding por instância (cada cliente preenche o seu) ---
BRAND_NAME=<ex.: "Lavra Orçamentos">
BRAND_TAGLINE=<opcional, ex.: "Construções com rigor">
COMPANY_LEGAL_NAME=<nome legal completo, ex.: "Lavra Construção, Lda.">
COMPANY_PDF_SLOGAN=<opcional, slogan do PDF>
COMPANY_NIF=
COMPANY_EMAIL=
COMPANY_PHONE=
COMPANY_WEBSITE=
COMPANY_ADDRESS=
COMPANY_POSTAL_CODE=
COMPANY_LOCALITY=
```

> **CRÍTICO.** O `AUTH_SECRET` e a `ANTHROPIC_API_KEY` em produção têm de ser **diferentes** dos de dev. Se a key de dev foi exposta a alguém, **revoga-a na consola Anthropic antes de continuar**.

Gerar `AUTH_SECRET` novo:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Permissão para `sustain` reiniciar o seu próprio serviço

Em `/etc/sudoers.d/sustain-orcamentos`:

```
sustain ALL=(root) NOPASSWD: /bin/systemctl restart sustain-orcamentos, /bin/systemctl stop sustain-orcamentos, /bin/systemctl start sustain-orcamentos
```

```bash
# Como root
visudo -f /etc/sudoers.d/sustain-orcamentos
```

### 4. Instalar systemd unit

```bash
# Como root, com o repo já clonado em /tmp ou similar para acesso ao ficheiro:
cp deploy/systemd/sustain-orcamentos.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable sustain-orcamentos
# NÃO arranques ainda — falta a primeira release.
```

### 5. Configurar Caddy

Antes de tudo: aponta o DNS do `__DOMAIN__` para o IP do VPS (registo A). Aguarda propagação.

```bash
# Como root
cp deploy/caddy/Caddyfile /etc/caddy/Caddyfile
# Edita e substitui __DOMAIN__ pelo domínio real
$EDITOR /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

Caddy vai obter certificado SSL automaticamente na primeira visita.

---

## Primeiro deploy

```bash
# Como sustain
sudo -u sustain bash
cd /srv/sustain-orcamentos

# Clone primeira release manualmente
mkdir -p releases
git clone --depth 1 --branch main __REPO_URL__ releases/initial
cd releases/initial

# Symlink ao .env partilhado
ln -s /srv/sustain-orcamentos/shared/.env .env

# Install + preflight
npm ci
npm run preflight            # lint + tsc + build

# Migrations + seed inicial
npm run db:migrate
ADMIN_PASSWORD='<password-forte>' npm run db:seed

# Activar release
ln -sfn /srv/sustain-orcamentos/releases/initial /srv/sustain-orcamentos/current

exit  # de volta a root

# Arrancar
systemctl start sustain-orcamentos
systemctl status sustain-orcamentos

# Verificação local
curl -fsS http://localhost:3000/api/health
# Esperado: {"ok":true,"ts":"..."}

# Verificação pública (depois do DNS propagar)
curl -fsS https://__DOMAIN__/api/health
```

---

## Deploys seguintes (updates)

Tornar os scripts executáveis (uma vez):

```bash
sudo -u sustain bash -c "chmod +x /srv/sustain-orcamentos/current/deploy/scripts/*.sh"
```

Cada update corre o `deploy.sh`:

```bash
sudo -u sustain bash
export REPO_URL=__REPO_URL__
/srv/sustain-orcamentos/current/deploy/scripts/deploy.sh main
```

O script faz, por esta ordem (e pára se algum passo falhar):

1. Cria `releases/<timestamp>/`
2. `git clone` da ref pedida (default `main`)
3. Symlink ao `.env` partilhado
4. `npm ci`
5. `npm run preflight` (lint + tsc + build)
6. `npm run db:migrate`
7. **Só agora** troca o symlink `current` (operação atómica)
8. `sudo systemctl restart sustain-orcamentos`
9. `healthcheck.sh` — se falhar, mostra comandos de rollback. Não apaga nada.

---

## Backup

### Manual

```bash
sudo -u sustain bash -c "cd /srv/sustain-orcamentos/current && npm run db:backup"
# Output: /srv/sustain-orcamentos/shared/backups/sustain-YYYYMMDD-HHMMSS.db
```

O script usa `better-sqlite3 .backup()` (online backup API do SQLite) — é seguro correr com a app em execução. Copia atómica + checkpoint do WAL.

### Cron diário

`/etc/cron.d/sustain-backup`:

```cron
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Backup todos os dias às 03:00
0 3 * * * sustain cd /srv/sustain-orcamentos/current && /usr/bin/npm run db:backup >> /srv/sustain-orcamentos/shared/logs/backup.log 2>&1
```

### Rotação

Por defeito, **nada é apagado automaticamente**. O `backup-rotate.sh` é DRY RUN salvo passar `--apply`.

```bash
# Ver o que seria apagado (mantém últimos 30 dias):
sudo -u sustain bash -c "/srv/sustain-orcamentos/current/deploy/scripts/backup-rotate.sh"

# Apagar de facto:
sudo -u sustain bash -c "/srv/sustain-orcamentos/current/deploy/scripts/backup-rotate.sh --apply"

# Mudar a janela:
sudo -u sustain bash -c "/srv/sustain-orcamentos/current/deploy/scripts/backup-rotate.sh --apply --days=60"
```

> **Estratégia recomendada (manual, não automatizada):** retenção GFS — manter 7 backups diários, 4 semanais (cada domingo), 3 mensais. Para já, este script só faz age-based simples; mover para GFS quando o histórico justificar.

### Cópia offsite

Boa prática: replicar `/srv/sustain-orcamentos/shared/backups/` para destino externo (rclone para S3/Backblaze, ou rsync para outro VPS) numa janela separada do backup. **Nunca apagar offsite automaticamente.**

---

## Restore

```bash
sudo -u sustain bash
cd /srv/sustain-orcamentos/current

# Listar backups
./deploy/scripts/db-restore.sh

# Restaurar um específico
./deploy/scripts/db-restore.sh /srv/sustain-orcamentos/shared/backups/sustain-20260429-031500.db
```

O script:
1. Mostra DB actual e backup escolhido.
2. Pede confirmação `RESTORE` (em maiúsculas).
3. Faz **safety backup** da DB actual em `pre-restore-<ts>.db`.
4. Pára o serviço, substitui a DB, apaga `-wal`/`-shm` antigos, arranca o serviço.
5. Corre healthcheck. Se falhar, mostra como reverter (voltar ao safety backup).

---

## Rollback

Se um deploy correu mal e queres voltar à release anterior:

```bash
sudo -u sustain bash
cd /srv/sustain-orcamentos
ls releases/                              # vê os timestamps disponíveis

# Aponta current para a anterior
ln -sfn /srv/sustain-orcamentos/releases/<timestamp-anterior> /srv/sustain-orcamentos/current.tmp
mv -Tf /srv/sustain-orcamentos/current.tmp /srv/sustain-orcamentos/current

exit

sudo systemctl restart sustain-orcamentos
curl -fsS http://localhost:3000/api/health
```

> **Atenção a migrations.** Se a release que estás a desfazer tinha aplicado migrations novas que mudam o schema, voltar à release antiga pode partir o ORM. Nesses casos faz **restore da DB também** a partir de um backup anterior à migration.

---

## Logs

```bash
# Aplicação
journalctl -u sustain-orcamentos -f

# Aplicação — últimas 100 linhas
journalctl -u sustain-orcamentos -n 100 --no-pager

# Caddy access log
tail -f /srv/sustain-orcamentos/shared/logs/caddy-access.log

# Backups
tail -f /srv/sustain-orcamentos/shared/logs/backup.log
```

---

## Antes de enviar o link ao cliente

Checklist obrigatório. **Não envies sem todos os pontos verificados.**

- [ ] **Anthropic API key NOVA gerada para produção** (e a antiga revogada, se for a mesma do dev).
- [ ] **`AUTH_SECRET` de produção é diferente do de dev** — gerado com `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
- [ ] **Domínio `__DOMAIN__` aponta para o IP do VPS** (`dig __DOMAIN__` confirma).
- [ ] **HTTPS funcional** — `curl -I https://__DOMAIN__` devolve `HTTP/2 200` ou redirect e o certificado é válido (Caddy + Let's Encrypt).
- [ ] **Login funciona** — `https://__DOMAIN__/login` aceita as credenciais do admin do `db:seed`.
- [ ] **Upload pequeno funciona** — JPG/PNG <5 MB.
- [ ] **Upload grande funciona** — PDF entre 50 e 100 MB. Confirma que aparece em `shared/uploads/<obraId>/...` e fica listado na obra.
- [ ] **Análise IA funciona** — botão "Analisar com IA" numa obra com briefing + ficheiros devolve linhas e riscos. `journalctl` mostra `[ia.analise <runId>] start` e `done`.
- [ ] **Sugestões de materiais funcionam** — botão "Gerar sugestões" responde sem erro.
- [ ] **Backup foi corrido pelo menos uma vez com sucesso** — `npm run db:backup` produziu ficheiro `.db` em `shared/backups/`.
- [ ] **Restore foi testado** pelo menos uma vez em ambiente de staging (ou em VPS de teste): `db-restore.sh` consegue restaurar um snapshot e a app continua funcional.
- [ ] **Cron de backup activo** — `crontab -l -u sustain` ou `cat /etc/cron.d/sustain-backup`.
- [ ] **Firewall fechado** — `ufw status` mostra apenas 22/80/443 abertas.
- [ ] **`.env` com mode 0600** e owner `sustain:sustain`.
- [ ] **Logs limpos** — `journalctl -u sustain-orcamentos -n 50` sem erros 5xx ou stack traces nas últimas 24h.

---

## Optimizações futuras (não fazer agora)

- **`output: "standalone"` em `next.config.ts`** — reduz tamanho do bundle de deploy ~80 % (não copia `node_modules` inteiro). Implica copiar manualmente `.next/static` e `public/` na pipeline. Adiar até o tamanho do release ser problema.
- **Reorganização de `scripts/`** — mover `fix-*.ts` (correcções de dados pontuais) para `scripts/data-fixes/` para isolar dos scripts operacionais. Cosmético.
- **Retenção GFS de backups** — implementar quando houver histórico que justifique a complexidade.
- **Backup offsite automatizado** — `rclone sync` para S3/Backblaze numa cron separada.
- **Monitorização externa** — uptime check ao `/api/health` com alertas (UptimeRobot, BetterStack, etc.).
- **`fail2ban`** — para o login do `/login` se a app começar a ser pública.

---

## Tornar scripts executáveis

Antes do primeiro uso, no servidor:

```bash
chmod +x /srv/sustain-orcamentos/current/deploy/scripts/*.sh
```

Em alternativa, garantir no git que ficam com `+x`:

```bash
git update-index --chmod=+x deploy/scripts/deploy.sh
git update-index --chmod=+x deploy/scripts/healthcheck.sh
git update-index --chmod=+x deploy/scripts/db-restore.sh
git update-index --chmod=+x deploy/scripts/backup-rotate.sh
git commit -m "deploy: marcar scripts como executáveis"
```
