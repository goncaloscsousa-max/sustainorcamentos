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

import { deleteClienteAction } from "../../actions";

type Props = {
  id: string;
  nome: string;
};

export function DeleteClienteButton({ id, nome }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await deleteClienteAction(id);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro a apagar cliente.";
        // redirect() throws a NEXT_REDIRECT internally — só mostramos toast para erros reais.
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
          <AlertDialogTitle>Apagar cliente?</AlertDialogTitle>
          <AlertDialogDescription>
            Vai apagar <strong>{nome}</strong>. Esta ação não pode ser
            revertida. Se o cliente tiver obras associadas, a operação é
            bloqueada.
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
