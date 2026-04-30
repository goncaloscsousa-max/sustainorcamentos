import Link from "next/link";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/(app)/actions";
import { PRODUCT } from "@/lib/branding/product";

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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-sm font-semibold uppercase tracking-[0.22em]"
          >
            <span
              aria-hidden
              className="inline-block size-2 rounded-full bg-primary shadow-[0_0_18px_4px_oklch(0.62_0.23_25/0.55)] transition-transform group-hover:scale-110"
            />
            <span>{PRODUCT.name}</span>
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
