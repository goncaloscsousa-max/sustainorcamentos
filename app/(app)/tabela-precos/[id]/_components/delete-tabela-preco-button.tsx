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

import { deleteTabelaPrecoAction } from "../../actions";

type Props = {
  id: string;
  codigo: string;
};

export function DeleteTabelaPrecoButton({ id, codigo }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await deleteTabelaPrecoAction(id);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro a apagar item.";
        if (!/NEXT_REDIRECT/i.test(message)) {
          toast.error(message);
          setOpen(false);
        }
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" type="button">
          Apagar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar item da tabela?</AlertDialogTitle>
          <AlertDialogDescription>
            Vai apagar o item <strong>{codigo}</strong>. Linhas de orçamento já
            criadas mantêm-se mas deixam de ter ligação à tabela de referência.
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
            {isPending ? "A apagar..." : "Apagar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
