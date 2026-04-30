"use client";

// Este componente usa um timer para mostrar progresso pseudo-real durante
// a análise IA. O React 19 introduziu `react-hooks/set-state-in-effect`
// que é demasiado restritivo para o caso clássico de setInterval -> setState.
// Desabilitamos só neste ficheiro.
/* eslint-disable react-hooks/set-state-in-effect */

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format";

import { analisarObraAction } from "../ia-actions";

type Props = {
  orcamentoId: string;
};

// Duração estimada de uma análise IA típica (segundos). A barra preenche
// até 90 % linearmente até este tempo; depois fica nos 90 % à espera de
// resposta real. Ajustar se a média mudar.
const EXPECTED_DURATION_S = 120;

const STAGES: { fromS: number; mensagem: string }[] = [
  { fromS: 0, mensagem: "A preparar fotos e contexto da obra…" },
  { fromS: 8, mensagem: "Claude a olhar para cada foto…" },
  { fromS: 25, mensagem: "A identificar trabalhos e quantidades…" },
  { fromS: 55, mensagem: "A calibrar preços com factor regional…" },
  { fromS: 85, mensagem: "A escrever riscos e recomendações…" },
  { fromS: 115, mensagem: "Quase a terminar — obrigado pela paciência" },
  {
    fromS: 180,
    mensagem: "Análise mais demorada que o normal — não fechar a janela",
  },
];

function formatElapsed(s: number): string {
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

export function AnaliseIAButton({ orcamentoId }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, start] = useTransition();
  const [elapsed, setElapsed] = useState(0);
  const router = useRouter();

  // Cronómetro do tempo decorrido enquanto a análise está a correr.
  useEffect(() => {
    if (!isPending) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, [isPending]);

  // Progresso pseudo-real: linear até 90 % no tempo esperado, depois fica.
  const progressPct = Math.min(
    95,
    Math.round((elapsed / EXPECTED_DURATION_S) * 90),
  );
  const numTijolos = Math.min(10, Math.floor(progressPct / 10));

  const stage =
    [...STAGES].reverse().find((s) => elapsed >= s.fromS) ?? STAGES[0];

  function handleConfirm() {
    start(async () => {
      const res = await analisarObraAction(orcamentoId);
      if (!res.ok) {
        toast.error(res.error);
        setOpen(false);
        return;
      }
      toast.success(
        `Análise IA: ${res.trabalhosAdicionados} trabalhos, ${res.riscosAdicionados} riscos. ~${formatCents(res.custoEstimadoCents)}.`,
      );
      if (res.observacoesGerais) {
        toast.message("Observações da IA", {
          description: res.observacoesGerais,
        });
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Enquanto a análise está a correr, não permitir fechar com Esc /
        // click fora — a action está em curso e fechar não a cancela.
        if (isPending && !next) return;
        setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Sparkles aria-hidden className="size-4" />
          Analisar com IA
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        {isPending ? (
          // ============================================================
          // VIEW EM CURSO — animação de obra
          // ============================================================
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Análise em curso…</AlertDialogTitle>
              <AlertDialogDescription className="sr-only">
                A IA está a analisar as fotos e ficheiros da obra. Não fechar
                a janela.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="flex flex-col items-center gap-5 py-2">
              {/* Trolha + tijolos */}
              <div className="flex items-end gap-3">
                <span
                  className="inline-block text-5xl animate-bounce"
                  aria-hidden
                >
                  👷
                </span>
                <div className="flex items-end gap-0.5 pb-1">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <span
                      key={i}
                      aria-hidden
                      className={`inline-block text-xl transition-all duration-500 ${
                        i < numTijolos
                          ? "opacity-100 translate-y-0"
                          : "opacity-10 translate-y-1"
                      }`}
                    >
                      🧱
                    </span>
                  ))}
                </div>
              </div>

              {/* Barra de progresso */}
              <div className="w-full">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-[width] duration-500 ease-out"
                    style={{ width: `${progressPct}%` }}
                    role="progressbar"
                    aria-valuenow={progressPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {formatElapsed(elapsed)}
                  </span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {progressPct}%
                  </span>
                </div>
              </div>

              {/* Mensagem rotativa */}
              <p
                className="text-center text-sm font-medium leading-snug min-h-[2.5rem]"
                aria-live="polite"
              >
                {stage.mensagem}
              </p>

              {/* Mensagem fixa de paciência */}
              <p className="rounded-md border bg-muted/40 px-3 py-2 text-center text-xs leading-relaxed text-muted-foreground">
                A análise pode demorar <strong>1 a 3 minutos</strong> — a IA
                está a olhar para todas as fotos uma a uma para garantir o
                <strong> máximo de qualidade no resultado</strong>. Não feches
                esta janela.
              </p>
            </div>
          </>
        ) : (
          // ============================================================
          // VIEW INICIAL — confirmação
          // ============================================================
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Analisar obra com Claude?</AlertDialogTitle>
              <AlertDialogDescription>
                Vamos enviar as fotos, MTQ e projetos desta obra ao Claude
                Sonnet 4.6. A resposta é aplicada ao orçamento como linhas
                novas (origem
                <span className="font-medium"> IA</span>, com preço estimado
                que podes ajustar) e riscos identificados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirm();
                }}
              >
                Analisar
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
