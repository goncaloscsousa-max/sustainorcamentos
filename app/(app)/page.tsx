import Link from "next/link";
import { desc, eq, inArray, sql } from "drizzle-orm";
import {
  ArrowUpRight,
  Building2,
  FileText,
  ListChecks,
  PencilLine,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { clientes, obras, orcamentos } from "@/lib/db/schema";
import { formatCents, formatIsoDate, labelForEstadoObra } from "@/lib/format";

export const dynamic = "force-dynamic";

const navCards: {
  href: string;
  title: string;
  description: string;
  cta: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/obras",
    title: "Obras",
    description: "Criar, consultar e gerir obras e orçamentos.",
    cta: "Ver obras",
    icon: Building2,
  },
  {
    href: "/clientes",
    title: "Clientes",
    description: "Registar e manter a base de clientes.",
    cta: "Ver clientes",
    icon: Users,
  },
  {
    href: "/tabela-precos",
    title: "Tabela de preços",
    description:
      "Referência permanente de preços para reutilização em orçamentos.",
    cta: "Ver tabela",
    icon: FileText,
  },
];

const ESTADO_OBRA_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  orcamentado: "secondary",
  adjudicado: "default",
  em_execucao: "default",
  concluido: "outline",
  perdido: "destructive",
  cancelado: "destructive",
};

export default async function HomePage() {
  // --- Estatísticas (queries em paralelo) -------------------------------
  const [
    [obrasActivasRow],
    [clientesRow],
    [rascunhoRow],
    [enviadosRow],
    recentes,
  ] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)` })
      .from(obras)
      .where(
        inArray(obras.estado, ["orcamentado", "adjudicado", "em_execucao"]),
      ),
    db.select({ n: sql<number>`count(*)` }).from(clientes),
    db
      .select({
        n: sql<number>`count(*)`,
        total: sql<number>`coalesce(sum(${orcamentos.totalCents}), 0)`,
      })
      .from(orcamentos)
      .where(eq(orcamentos.estado, "rascunho")),
    db
      .select({
        n: sql<number>`count(*)`,
        total: sql<number>`coalesce(sum(${orcamentos.totalCents}), 0)`,
      })
      .from(orcamentos)
      .where(inArray(orcamentos.estado, ["enviado", "aprovado"])),
    db
      .select({
        id: obras.id,
        referencia: obras.referencia,
        titulo: obras.titulo,
        estado: obras.estado,
        clienteNome: clientes.nome,
        updatedAt: obras.updatedAt,
      })
      .from(obras)
      .leftJoin(clientes, eq(obras.clienteId, clientes.id))
      .orderBy(desc(obras.updatedAt))
      .limit(5),
  ]);

  const stats = [
    {
      label: "Obras activas",
      value: String(obrasActivasRow?.n ?? 0),
      sub: "orçamentadas, adjudicadas ou em execução",
      icon: Building2,
    },
    {
      label: "Clientes",
      value: String(clientesRow?.n ?? 0),
      sub: "na base de dados",
      icon: Users,
    },
    {
      label: "Em rascunho",
      value: String(rascunhoRow?.n ?? 0),
      sub:
        rascunhoRow?.total
          ? `${formatCents(rascunhoRow.total)} potenciais`
          : "sem orçamentos por fechar",
      icon: PencilLine,
    },
    {
      label: "Enviados / aprovados",
      value: String(enviadosRow?.n ?? 0),
      sub: enviadosRow?.total
        ? formatCents(enviadosRow.total)
        : "sem propostas activas",
      icon: ListChecks,
    },
  ];

  return (
    <div className="flex flex-col gap-12">
      {/* HERO neutro — sem nome de empresa em destaque */}
      <section className="relative flex flex-col gap-3">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -left-16 -z-10 size-72 rounded-full bg-primary/20 blur-[120px]"
        />
        <h1 className="max-w-3xl bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-4xl font-medium leading-[1.1] tracking-tight text-transparent md:text-5xl">
          A engenharia por trás
          <br />
          <span className="italic text-primary">de cada orçamento.</span>
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Briefing estruturado, análise técnica por IA, preços coerentes com
          o teu histórico. Da visita à obra à proposta assinada — num só
          fluxo.
        </p>
      </section>

      {/* ESTATÍSTICAS */}
      <section
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        aria-label="Estatísticas rápidas"
      >
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="relative overflow-hidden rounded-xl border bg-card/60 p-5 ring-1 ring-foreground/5 backdrop-blur-sm"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-12 -right-12 size-32 rounded-full bg-primary/10 blur-2xl"
              />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {s.label}
                  </span>
                  <span className="font-mono text-3xl font-medium tabular-nums text-foreground">
                    {s.value}
                  </span>
                  <span className="text-xs text-muted-foreground">{s.sub}</span>
                </div>
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Icon aria-hidden className="size-4" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* CARTÕES DE NAVEGAÇÃO */}
      <section className="grid gap-5 md:grid-cols-3" aria-label="Atalhos principais">
        {navCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="group">
              <Card className="relative h-full overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:ring-primary/40 group-hover:shadow-[0_24px_60px_-20px_oklch(0.64_0.22_25/0.35)]">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-24 -right-24 size-56 rounded-full bg-primary/10 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/20">
                    <Icon aria-hidden className="size-5" />
                  </div>
                  <CardTitle className="text-lg font-medium">
                    {card.title}
                  </CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80 transition-all group-hover:gap-2.5 group-hover:text-primary">
                    {card.cta}
                    <ArrowUpRight
                      aria-hidden
                      className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      {/* OBRAS RECENTES */}
      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium tracking-tight">
              Obras recentes
            </h2>
            <p className="text-sm text-muted-foreground">
              Últimas alterações.
            </p>
          </div>
          <Link
            href="/obras"
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver todas →
          </Link>
        </div>

        {recentes.length === 0 ? (
          <div className="rounded-md border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Ainda não há obras registadas.
            </p>
            <Link
              href="/obras/nova"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              Registar a primeira obra →
            </Link>
          </div>
        ) : (
          <ul className="divide-y rounded-xl border bg-card/40 ring-1 ring-foreground/5">
            {recentes.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/obras/${o.id}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/40"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {o.referencia}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">
                      {o.titulo}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {o.clienteNome ?? "—"}
                    </span>
                  </div>
                  <Badge
                    variant={ESTADO_OBRA_VARIANT[o.estado] ?? "secondary"}
                    className="hidden sm:inline-flex"
                  >
                    {labelForEstadoObra(o.estado)}
                  </Badge>
                  <span className="hidden text-xs text-muted-foreground md:inline">
                    {formatIsoDate(
                      new Date(o.updatedAt).toISOString().slice(0, 10),
                    )}
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    className="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
