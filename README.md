# Sustain Orçamentos

Plataforma web de apoio à orçamentação da **Sustain Remodelações**.
Corre 100 % localmente. Internet apenas para a API da Anthropic (Fase 5).

- **Briefing funcional e técnico:** ver [SPEC.md](./SPEC.md).
- **Progresso por fase:** ver [PROGRESS.md](./PROGRESS.md).
- **Decisões de arquitetura:** ver [docs/adr/](./docs/adr/).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16 (App Router) · React 19 · TypeScript 5 (strict) |
| UI | Tailwind CSS v4 · shadcn/ui (Radix) |
| Base de dados | SQLite (ficheiro local) · Drizzle ORM |
| Auth | Auth.js v5 · Credentials provider · JWT |
| Storage | Filesystem local (`data/uploads/`) |
| IA | Claude Sonnet 4.6 via API oficial Anthropic *(Fase 5)* |

---

## Arranque local (primeira vez)

Pré-requisitos: **Node.js ≥ 20** e **npm**.

```bash
# 1. Instalar dependências
npm install

# 2. Criar .env a partir do exemplo
cp .env.example .env

# 3. Gerar AUTH_SECRET e colar no .env
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 4. Preencher no .env:
#    - AUTH_SECRET (gerado acima)
#    - ADMIN_PASSWORD (palavra-passe inicial do utilizador admin)

# 5. Criar base de dados + correr migrations
npm run db:migrate

# 6. Criar utilizador admin inicial
npm run db:seed

# 7. Iniciar dev server
npm run dev
```

A app arranca em <http://localhost:3000>. Entra com o email e a palavra-passe do `.env`.

---

## Comandos úteis

| Comando | Descrição |
|---|---|
| `npm run dev` | Dev server com Turbopack |
| `npm run build` | Build de produção |
| `npm run start` | Servir build de produção |
| `npm run lint` | ESLint |
| `npm run db:generate` | Gera nova migration a partir do schema |
| `npm run db:migrate` | Aplica migrations à DB |
| `npm run db:seed` | Cria utilizador admin inicial |
| `npm run db:studio` | Abre Drizzle Studio (explorador visual) |

---

## Estrutura

```
app/
  (auth)/login/       # login (público)
  (app)/              # app autenticada
  api/auth/           # Auth.js route handlers
components/
  ui/                 # shadcn components
  app-header.tsx      # header da app
lib/
  db/
    schema.ts         # schema Drizzle
    migrations/       # SQL gerado por drizzle-kit
    migrate.ts        # script que aplica migrations
    seed.ts           # script que cria admin
    index.ts          # cliente Drizzle
  utils.ts            # helpers (cn)
auth.ts               # config Auth.js (Node runtime)
auth.config.ts        # config Auth.js edge-safe (para proxy)
proxy.ts              # Next.js proxy (redireciona para /login)
drizzle.config.ts
data/                 # SQLite DB + uploads (gitignored)
docs/adr/             # Architecture Decision Records
```

---

## Convenções

- **Dinheiro:** sempre em `INTEGER` cêntimos (sufixo `_cents`).
- **Percentagens:** em basis points × 100 (ex.: 2300 = 23,00 %).
- **IDs:** UUID v4, gerados em aplicação.
- **Datas** (só data, sem hora) guardadas como `TEXT` ISO-8601 (`YYYY-MM-DD`).
- **Timestamps** guardados como `INTEGER` milissegundos.
