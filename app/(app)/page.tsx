import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const cards = [
  {
    href: "/obras",
    title: "Obras",
    description: "Criar, consultar e gerir obras e orçamentos.",
    cta: "Ver obras",
  },
  {
    href: "/clientes",
    title: "Clientes",
    description: "Registar e manter a base de clientes da Sustain.",
    cta: "Ver clientes",
  },
  {
    href: "/tabela-precos",
    title: "Tabela de preços",
    description:
      "Referência permanente de preços para reutilização em orçamentos.",
    cta: "Ver tabela",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
          Sustain Remodelações
        </p>
        <h1 className="text-3xl font-medium tracking-tight">
          Orçamentos profissionais em minutos.
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Plataforma de apoio à orçamentação. Centraliza obras, clientes,
          preços praticados e análises técnicas para gerar propostas
          consistentes e com histórico de rentabilidade.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="group">
            <Card className="h-full transition-colors group-hover:border-foreground/20">
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  {card.title}
                </CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">
                  {card.cta} →
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
