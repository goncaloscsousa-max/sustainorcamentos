import Link from "next/link";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/(app)/actions";

type Props = {
  userName?: string | null;
};

const navItems = [
  { href: "/", label: "Início" },
  { href: "/obras", label: "Obras" },
  { href: "/clientes", label: "Clientes" },
  { href: "/tabela-precos", label: "Tabela de preços" },
];

export function AppHeader({ userName }: Props) {
  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-sm font-semibold uppercase tracking-[0.18em]"
          >
            SUSTAIN <span className="text-muted-foreground">Orçamentos</span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {userName ? (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {userName}
            </span>
          ) : null}
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
