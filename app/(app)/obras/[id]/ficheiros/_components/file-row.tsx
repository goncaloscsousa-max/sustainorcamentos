"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
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

import { deleteFicheiroAction } from "../actions";

type Props = {
  obraId: string;
  ficheiroId: string;
  nomeOriginal: string;
};

export function DeleteFicheiroButton({ obraId, ficheiroId, nomeOriginal }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, start] = useTransition();

  function handleDelete() {
    start(async () => {
      try {
        await deleteFicheiroAction(obraId, ficheiroId);
        toast.success("Ficheiro apagado.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro a apagar.");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-destructive"
          aria-label={`Apagar ${nomeOriginal}`}
        >
          <Trash2 aria-hidden className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar ficheiro?</AlertDialogTitle>
          <AlertDialogDescription>
            Vais apagar <span className="font-medium">{nomeOriginal}</span>. O
            ficheiro é removido do disco e do registo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
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
