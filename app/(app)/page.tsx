import Link from "next/link";
import { ArrowUpRight, Building2, FileText, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getBranding } from "@/lib/branding/config";

const cards = [
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

export default function HomePage() {
  const { companyLegalName } = getBranding();
  return (
    <div className="flex flex-col gap-12">
      <section className="relative flex flex-col gap-3">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -left-16 -z-10 size-72 rounded-full bg-primary/20 blur-[120px]"
        />
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          <span
            aria-hidden
            className="inline-block h-px w-8 bg-gradient-to-r from-primary to-transparent"
          />
          {companyLegalName}
        </p>
        <h1 className="max-w-3xl bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-4xl font-medium leading-[1.1] tracking-tight text-transparent md:text-5xl">
          Orçamentos profissionais
          <br />
          <span className="italic text-primary">em minutos.</span>
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Centraliza obras, clientes, preços praticados e análises técnicas
          para gerar propostas consistentes com histórico de rentabilidade.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-3" aria-label="Atalhos principais">
        {cards.map((card) => {
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
    </div>
  );
}
