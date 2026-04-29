"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { tabelaPrecos } from "@/lib/db/schema";
import { tabelaPrecoSchema } from "@/lib/validation/tabela-preco";
import {
  EMPTY_STATE,
  type ActionState,
  zodIssuesToFieldErrors,
} from "@/lib/actions/types";
import { requireUser } from "@/lib/auth/require-user";

function parseFormData(formData: FormData) {
  return {
    codigo: formData.get("codigo"),
    categoria: formData.get("categoria"),
    descricao: formData.get("descricao"),
    unidade: formData.get("unidade"),
    precoClienteBaseCents: formData.get("precoClienteBaseCents"),
    custoInternoBaseCents: formData.get("custoInternoBaseCents"),
    rendimentoDiario: formData.get("rendimentoDiario"),
    observacoes: formData.get("observacoes"),
    ativo: formData.get("ativo") ?? "false",
  };
}

function isUniqueConstraintErr(err: unknown): boolean {
  return (
    err instanceof Error &&
    /UNIQUE constraint failed.*codigo/i.test(err.message)
  );
}

export async function createTabelaPrecoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireUser();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado." };
  }

  const parsed = tabelaPrecoSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return { fieldErrors: zodIssuesToFieldErrors(parsed.error.issues) };
  }

  let newId: string;
  try {
    const [row] = await db
      .insert(tabelaPrecos)
      .values(parsed.data)
      .returning();
    newId = row.id;
  } catch (err) {
    console.error("[tabelaPrecos.create]", err);
    if (isUniqueConstraintErr(err)) {
      return { fieldErrors: { codigo: "Código já existe." } };
    }
    return { error: "Não foi possível criar o item." };
  }

  revalidatePath("/tabela-precos");
  redirect(`/tabela-precos/${newId}`);
}

export async function updateTabelaPrecoAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireUser();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado." };
  }

  const parsed = tabelaPrecoSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return { fieldErrors: zodIssuesToFieldErrors(parsed.error.issues) };
  }

  try {
    const res = await db
      .update(tabelaPrecos)
      .set(parsed.data)
      .where(eq(tabelaPrecos.id, id))
      .returning({ id: tabelaPrecos.id });
    if (res.length === 0) return { error: "Item não encontrado." };
  } catch (err) {
    console.error("[tabelaPrecos.update]", err);
    if (isUniqueConstraintErr(err)) {
      return { fieldErrors: { codigo: "Código já existe." } };
    }
    return { error: "Não foi possível guardar as alterações." };
  }

  revalidatePath("/tabela-precos");
  revalidatePath(`/tabela-precos/${id}`);
  return { ...EMPTY_STATE, success: "Alterações guardadas." };
}

export async function deleteTabelaPrecoAction(id: string): Promise<void> {
  await requireUser();

  try {
    await db.delete(tabelaPrecos).where(eq(tabelaPrecos.id, id));
  } catch (err) {
    console.error("[tabelaPrecos.delete]", err);
    throw new Error("Não foi possível apagar o item.");
  }
  revalidatePath("/tabela-precos");
  redirect("/tabela-precos");
}
