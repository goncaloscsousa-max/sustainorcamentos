"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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

export function AnaliseIAButton({ orcamentoId }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, start] = useTransition();
  const router = useRouter();

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
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Sparkles aria-hidden className="size-4" />
          Analisar com IA
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Analisar obra com Claude?</AlertDialogTitle>
          <AlertDialogDescription>
            Vamos enviar as fotos, MTQ e projetos desta obra ao Claude Sonnet
            4.6. A resposta é aplicada ao orçamento como linhas novas (origem
            <span className="font-medium"> IA</span>, com preço estimado que
            podes ajustar) e riscos identificados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isPending}
          >
            {isPending ? "A analisar..." : "Analisar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
