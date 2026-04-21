"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Cliente } from "@/lib/db/schema";
import type { ActionState } from "@/lib/actions/types";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  cliente?: Cliente;
  submitLabel?: string;
};

const initial: ActionState = {};

export function ClienteForm({ action, cliente, submitLabel = "Guardar" }: Props) {
  const [state, formAction, pending] = useActionState(action, initial);

  useEffect(() => {
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [state.success, state.error]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field
        id="nome"
        label="Nome *"
        defaultValue={cliente?.nome ?? ""}
        error={state.fieldErrors?.nome}
        required
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="nif"
          label="NIF"
          defaultValue={cliente?.nif ?? ""}
          error={state.fieldErrors?.nif}
          inputMode="numeric"
          placeholder="9 dígitos"
        />
        <Field
          id="telefone"
          label="Telefone"
          defaultValue={cliente?.telefone ?? ""}
          error={state.fieldErrors?.telefone}
          inputMode="tel"
          autoComplete="tel"
        />
      </div>

      <Field
        id="email"
        label="Email"
        type="email"
        defaultValue={cliente?.email ?? ""}
        error={state.fieldErrors?.email}
        autoComplete="email"
      />

      <Field
        id="morada"
        label="Morada"
        defaultValue={cliente?.morada ?? ""}
        error={state.fieldErrors?.morada}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="notas">Notas</Label>
        <Textarea
          id="notas"
          name="notas"
          rows={4}
          defaultValue={cliente?.notas ?? ""}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "A guardar..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} aria-invalid={!!error} {...rest} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
