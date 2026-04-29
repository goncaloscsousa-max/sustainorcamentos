"use client";

import { useTransition } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

import { sugerirMateriaisAction } from "../materiais-actions";

type Sugestao = {
  divisao: string;
  item: string;
  opcao_media: string;
  opcao_premium: string;
  unidade: string;
  preco_min_eur: number;
  preco_max_eur: number;
  justificacao: string;
};

type Props = {
  obraId: string;
  sugestoes: Sugestao[] | null;
  observacoes: string | null;
  atualizadoEm: Date | null;
  podeGerar: boolean;
  motivoBloqueio: string | null;
};

export function SugestoesMateriais({
  obraId,
  sugestoes,
  observacoes,
  atualizadoEm,
  podeGerar,
  motivoBloqueio,
}: Props) {
  const [isPending, start] = useTransition();

  function handleGerar() {
    start(async () => {
      const res = await sugerirMateriaisAction(obraId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `${res.sugestoesCount} sugestão${res.sugestoesCount === 1 ? "" : "s"} de materiais gerada${
          res.sugestoesCount === 1 ? "" : "s"
        }.`,
      );
    });
  }

  // Agrupa por divisão para mostrar em secções
  const grupos = new Map<string, Sugestao[]>();
  for (const s of sugestoes ?? []) {
    const arr = grupos.get(s.divisao) ?? [];
    arr.push(s);
    grupos.set(s.divisao, arr);
  }
  const divisoes = [...grupos.keys()];

  return (
    <section className="rounded-md border">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Sugestões de materiais</h2>
          <p className="text-sm text-muted-foreground">
            Marcas e referências concretas calibradas pelo briefing e região.
          </p>
          {atualizadoEm ? (
            <p className="text-xs text-muted-foreground">
              Atualizadas em {formatDateTime(atualizadoEm)}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant={sugestoes ? "secondary" : "default"}
          onClick={handleGerar}
          disabled={isPending || !podeGerar}
          aria-describedby={motivoBloqueio ? "sugestoes-motivo" : undefined}
          title={motivoBloqueio ?? undefined}
        >
          {isPending ? (
            <RefreshCw className="size-4 animate-spin" aria-hidden />
          ) : sugestoes ? (
            <RefreshCw className="size-4" aria-hidden />
          ) : (
            <Sparkles className="size-4" aria-hidden />
          )}
          {isPending
            ? "A gerar..."
            : sugestoes
              ? "Atualizar sugestões"
              : "Gerar sugestões"}
        </Button>
      </header>

      {motivoBloqueio ? (
        <p
          id="sugestoes-motivo"
          className="border-b bg-amber-50/60 px-5 py-2 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-300"
        >
          {motivoBloqueio}
        </p>
      ) : null}

      {sugestoes == null || sugestoes.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">
          {podeGerar
            ? "Sem sugestões ainda. Clica em \"Gerar sugestões\" para a IA propor materiais e marcas calibradas ao briefing + ficheiros."
            : (motivoBloqueio ?? "Pré-requisitos em falta para gerar sugestões.")}
        </div>
      ) : (
        <div className="flex flex-col divide-y">
          {divisoes.map((divisao) => (
            <div key={divisao} className="flex flex-col gap-2 px-5 py-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {divisao}
              </h3>
              <ul className="grid gap-3 md:grid-cols-2">
                {grupos.get(divisao)!.map((s, i) => (
                  <li
                    key={`${divisao}-${i}`}
                    className="flex flex-col gap-2 rounded-md border bg-background/60 p-3"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold">{s.item}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {s.preco_min_eur.toFixed(0)}–{s.preco_max_eur.toFixed(0)} €/
                        {s.unidade}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5 text-sm">
                      {s.opcao_media ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Média
                          </span>
                          <span>{s.opcao_media}</span>
                        </div>
                      ) : null}
                      {s.opcao_premium ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Premium
                          </span>
                          <span>{s.opcao_premium}</span>
                        </div>
                      ) : null}
                    </div>
                    {s.justificacao ? (
                      <p className="text-xs italic text-muted-foreground">
                        {s.justificacao}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {observacoes ? (
            <div className="flex flex-col gap-2 px-5 py-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notas gerais
              </h3>
              <p className="whitespace-pre-line text-sm">{observacoes}</p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
