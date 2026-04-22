"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCents } from "@/lib/format";
import type { RiscoIdentificado } from "@/lib/db/schema";

import {
  deleteRiscoAction,
  toggleRiscoResolvidoAction,
} from "../ia-actions";

type Props = {
  riscos: RiscoIdentificado[];
};

const severidadeVariant: Record<string, "default" | "secondary" | "destructive"> = {
  baixa: "secondary",
  media: "default",
  alta: "destructive",
};

const severidadeLabel: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export function RiscosPanel({ riscos }: Props) {
  const [isPending, start] = useTransition();

  function handleToggle(id: string, resolvido: boolean) {
    start(async () => {
      try {
        await toggleRiscoResolvidoAction(id, resolvido);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro.");
      }
    });
  }

  function handleDelete(id: string) {
    start(async () => {
      try {
        await deleteRiscoAction(id);
        toast.success("Risco apagado.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro.");
      }
    });
  }

  if (riscos.length === 0) return null;

  return (
    <section className="rounded-md border">
      <header className="flex items-center justify-between border-b px-5 py-3">
        <div className="flex flex-col">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Riscos identificados pela IA
          </h2>
          <p className="text-xs text-muted-foreground">
            Marca como resolvido à medida que validas ou corriges no terreno.
          </p>
        </div>
        <Badge variant="outline">{riscos.length}</Badge>
      </header>
      <ul className="divide-y">
        {riscos.map((r) => (
          <li
            key={r.id}
            className={`flex items-start gap-4 px-5 py-3 ${r.resolvido ? "opacity-60" : ""}`}
          >
            <Checkbox
              className="mt-1"
              checked={r.resolvido}
              onCheckedChange={(v) => handleToggle(r.id, v === true)}
              disabled={isPending}
              aria-label="Marcar como resolvido"
            />
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-sm ${r.resolvido ? "line-through" : "font-medium"}`}
                >
                  {r.descricao}
                </span>
                <Badge variant={severidadeVariant[r.severidade] ?? "default"}>
                  {severidadeLabel[r.severidade] ?? r.severidade}
                </Badge>
                {r.fonte ? (
                  <span className="text-xs text-muted-foreground">{r.fonte}</span>
                ) : null}
                {r.custoAdicionalEstimadoCents != null ? (
                  <span className="font-mono text-xs text-muted-foreground">
                    +{formatCents(r.custoAdicionalEstimadoCents)}
                  </span>
                ) : null}
              </div>
              {r.impactoEstimado ? (
                <p className="text-xs text-muted-foreground">
                  Impacto: {r.impactoEstimado}
                </p>
              ) : null}
              {r.recomendacao ? (
                <p className="text-xs text-muted-foreground">
                  Recomendação: {r.recomendacao}
                </p>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(r.id)}
              disabled={isPending}
              aria-label="Apagar risco"
            >
              <Trash2 aria-hidden className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
