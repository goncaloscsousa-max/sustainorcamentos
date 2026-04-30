import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getBranding } from "@/lib/branding/config";
import { LoginForm } from "./login-form";

export function generateMetadata(): Metadata {
  const b = getBranding();
  return { title: `Entrar — ${b.brandName}` };
}

export default function LoginPage() {
  const { brandName, tagline } = getBranding();
  return (
    <Card className="w-full max-w-sm border-border/60 bg-card/70 shadow-2xl backdrop-blur-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          <span
            aria-hidden
            className="inline-block size-2 rounded-full bg-primary shadow-[0_0_18px_4px_oklch(0.62_0.23_25/0.55)]"
          />
          <span>{brandName}</span>
        </div>
        <CardTitle className="text-2xl font-medium tracking-tight">
          Entrar
        </CardTitle>
        {tagline ? (
          <CardDescription className="italic">{tagline}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
