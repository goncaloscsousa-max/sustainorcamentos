"use client";

import { useState, useTransition } from "react";
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

import {
  deleteOrcamentoAction,
  duplicateOrcamentoAction,
} from "../../actions";

type Props = {
  orcamentoId: string;
};

export function OrcamentoActions({ orcamentoId }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDuplicating, startDuplicate] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  function handleDuplicate() {
    startDuplicate(async () => {
      try {
        await duplicateOrcamentoAction(orcamentoId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao duplicar.";
        if (!/NEXT_REDIRECT/i.test(message)) toast.error(message);
      }
    });
  }

  function handleDelete() {
    startDelete(async () => {
      try {
        await deleteOrcamentoAction(orcamentoId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro a apagar.";
        if (!/NEXT_REDIRECT/i.test(message)) {
          toast.error(message);
          setDeleteOpen(false);
        }
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        onClick={handleDuplicate}
        disabled={isDuplicating}
      >
        {isDuplicating ? "A duplicar..." : "Duplicar versão"}
      </Button>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">Apagar</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar esta versão?</AlertDialogTitle>
            <AlertDialogDescription>
              Vai apagar esta versão de orçamento e todas as linhas e riscos
              associados. A obra mantém-se.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "A apagar..." : "Apagar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
