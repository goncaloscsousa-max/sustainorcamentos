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
import type { TabelaPreco } from "@/lib/db/schema";
import type { ActionState } from "@/lib/actions/types";
import { CATEGORIA_OPTIONS, UNIDADE_OPTIONS } from "@/lib/format";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  item?: TabelaPreco;
  submitLabel?: string;
};

const initial: ActionState = {};

function centsToEuroInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function TabelaPrecoForm({
  action,
  item,
  submitLabel = "Guardar",
}: Props) {
  const [state, formAction, pending] = useActionState(action, initial);

  useEffect(() => {
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [state.success, state.error]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="codigo">Código *</Label>
          <Input
            id="codigo"
            name="codigo"
            defaultValue={item?.codigo ?? ""}
            aria-invalid={!!state.fieldErrors?.codigo}
            required
            placeholder="Ex.: DEM-001"
            className="font-mono uppercase"
          />
          {state.fieldErrors?.codigo ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.codigo}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="categoria">Categoria *</Label>
          <Select
            name="categoria"
            defaultValue={item?.categoria ?? undefined}
            required
          >
            <SelectTrigger
              id="categoria"
              className="w-full"
              aria-invalid={!!state.fieldErrors?.categoria}
            >
              <SelectValue placeholder="Escolher categoria" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIA_OPTIONS.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.fieldErrors?.categoria ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.categoria}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="descricao">Descrição *</Label>
        <Textarea
          id="descricao"
          name="descricao"
          rows={2}
          defaultValue={item?.descricao ?? ""}
          aria-invalid={!!state.fieldErrors?.descricao}
          required
        />
        {state.fieldErrors?.descricao ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.descricao}
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="unidade">Unidade *</Label>
          <Select
            name="unidade"
            defaultValue={item?.unidade ?? undefined}
            required
          >
            <SelectTrigger
              id="unidade"
              className="w-full"
              aria-invalid={!!state.fieldErrors?.unidade}
            >
              <SelectValue placeholder="Unidade" />
            </SelectTrigger>
            <SelectContent>
              {UNIDADE_OPTIONS.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.fieldErrors?.unidade ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.unidade}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="precoClienteBaseCents">Preço cliente (€) *</Label>
          <Input
            id="precoClienteBaseCents"
            name="precoClienteBaseCents"
            defaultValue={centsToEuroInput(item?.precoClienteBaseCents)}
            aria-invalid={!!state.fieldErrors?.precoClienteBaseCents}
            required
            inputMode="decimal"
            placeholder="0,00"
          />
          {state.fieldErrors?.precoClienteBaseCents ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.precoClienteBaseCents}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="custoInternoBaseCents">Custo interno (€)</Label>
          <Input
            id="custoInternoBaseCents"
            name="custoInternoBaseCents"
            defaultValue={centsToEuroInput(item?.custoInternoBaseCents)}
            aria-invalid={!!state.fieldErrors?.custoInternoBaseCents}
            inputMode="decimal"
            placeholder="0,00"
          />
          {state.fieldErrors?.custoInternoBaseCents ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.custoInternoBaseCents}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="rendimentoDiario">Rendimento diário (unid./dia)</Label>
          <Input
            id="rendimentoDiario"
            name="rendimentoDiario"
            defaultValue={item?.rendimentoDiario ?? ""}
            aria-invalid={!!state.fieldErrors?.rendimentoDiario}
            inputMode="decimal"
            placeholder="Ex.: 8"
          />
          {state.fieldErrors?.rendimentoDiario ? (
            <p className="text-sm text-destructive">
              {state.fieldErrors.rendimentoDiario}
            </p>
          ) : null}
        </div>

        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              name="ativo"
              value="true"
              defaultChecked={item?.ativo ?? true}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm">Ativo (disponível em orçamentos)</span>
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          name="observacoes"
          rows={3}
          defaultValue={item?.observacoes ?? ""}
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
