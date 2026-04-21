"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Cliente, Obra } from "@/lib/db/schema";
import type { ActionState } from "@/lib/actions/types";
import {
  ESTADO_OBRA_OPTIONS,
  TIPO_OBRA_OPTIONS,
} from "@/lib/format";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  clientes: Pick<Cliente, "id" | "nome">[];
  obra?: Obra;
  includeEstado?: boolean;
  submitLabel?: string;
};

const initial: ActionState = {};

export function ObraForm({
  action,
  clientes,
  obra,
  includeEstado = false,
  submitLabel = "Guardar",
}: Props) {
  const [state, formAction, pending] = useActionState(action, initial);

  useEffect(() => {
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [state.success, state.error]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* Cliente */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="clienteId">Cliente *</Label>
        <Select
          name="clienteId"
          defaultValue={obra?.clienteId ?? undefined}
          required
        >
          <SelectTrigger
            id="clienteId"
            className="w-full"
            aria-invalid={!!state.fieldErrors?.clienteId}
          >
            <SelectValue placeholder="Escolher cliente" />
          </SelectTrigger>
          <SelectContent>
            {clientes.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                Sem clientes. Criar um primeiro.
              </div>
            ) : (
              clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {state.fieldErrors?.clienteId ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.clienteId}
          </p>
        ) : null}
      </div>

      {/* Título */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="titulo">Título *</Label>
        <Input
          id="titulo"
          name="titulo"
          defaultValue={obra?.titulo ?? ""}
          aria-invalid={!!state.fieldErrors?.titulo}
          required
          placeholder="Ex.: Remodelação cozinha Sra. Silva"
        />
        {state.fieldErrors?.titulo ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.titulo}
          </p>
        ) : null}
      </div>

      {/* Morada */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="moradaObra">Morada da obra *</Label>
        <Input
          id="moradaObra"
          name="moradaObra"
          defaultValue={obra?.moradaObra ?? ""}
          aria-invalid={!!state.fieldErrors?.moradaObra}
          required
        />
        {state.fieldErrors?.moradaObra ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.moradaObra}
          </p>
        ) : null}
      </div>

      {/* Tipo + Estado */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="tipo">Tipo *</Label>
          <Select
            name="tipo"
            defaultValue={obra?.tipo ?? undefined}
            required
          >
            <SelectTrigger
              id="tipo"
              className="w-full"
              aria-invalid={!!state.fieldErrors?.tipo}
            >
              <SelectValue placeholder="Escolher tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPO_OBRA_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.fieldErrors?.tipo ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.tipo}
            </p>
          ) : null}
        </div>

        {includeEstado ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="estado">Estado</Label>
            <Select
              name="estado"
              defaultValue={obra?.estado ?? "orcamentado"}
            >
              <SelectTrigger
                id="estado"
                className="w-full"
                aria-invalid={!!state.fieldErrors?.estado}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADO_OBRA_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.fieldErrors?.estado ? (
              <p className="text-sm text-destructive">
                {state.fieldErrors.estado}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Datas */}
      <div className="grid gap-5 sm:grid-cols-3">
        <DateField
          id="dataVisita"
          label="Data visita"
          defaultValue={obra?.dataVisita ?? ""}
          error={state.fieldErrors?.dataVisita}
        />
        <DateField
          id="dataInicioPrevista"
          label="Início previsto"
          defaultValue={obra?.dataInicioPrevista ?? ""}
          error={state.fieldErrors?.dataInicioPrevista}
        />
        <DateField
          id="dataConclusaoPrevista"
          label="Conclusão prevista"
          defaultValue={obra?.dataConclusaoPrevista ?? ""}
          error={state.fieldErrors?.dataConclusaoPrevista}
        />
      </div>

      {/* Notas */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="notas">Notas</Label>
        <Textarea
          id="notas"
          name="notas"
          rows={4}
          defaultValue={obra?.notas ?? ""}
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

function DateField({
  id,
  label,
  defaultValue,
  error,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type="date"
        defaultValue={defaultValue}
        aria-invalid={!!error}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
