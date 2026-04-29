"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { clientes } from "@/lib/db/schema";
import { clienteSchema } from "@/lib/validation/cliente";
import {
  EMPTY_STATE,
  type ActionState,
  zodIssuesToFieldErrors,
} from "@/lib/actions/types";
import { requireUser } from "@/lib/auth/require-user";

function parseFormData(formData: FormData) {
  return {
    nome: formData.get("nome"),
    nif: formData.get("nif"),
    email: formData.get("email"),
    telefone: formData.get("telefone"),
    morada: formData.get("morada"),
    notas: formData.get("notas"),
  };
}

export async function createClienteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireUser();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado." };
  }

  const parsed = clienteSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return { fieldErrors: zodIssuesToFieldErrors(parsed.error.issues) };
  }

  let newId: string;
  try {
    const [row] = await db.insert(clientes).values(parsed.data).returning();
    newId = row.id;
  } catch (err) {
    console.error("[clientes.create]", err);
    return { error: "Não foi possível criar o cliente." };
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${newId}`);
}

export async function updateClienteAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireUser();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado." };
  }

  const parsed = clienteSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return { fieldErrors: zodIssuesToFieldErrors(parsed.error.issues) };
  }

  try {
    const res = await db
      .update(clientes)
      .set(parsed.data)
      .where(eq(clientes.id, id))
      .returning({ id: clientes.id });
    if (res.length === 0) return { error: "Cliente não encontrado." };
  } catch (err) {
    console.error("[clientes.update]", err);
    return { error: "Não foi possível guardar as alterações." };
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ...EMPTY_STATE, success: "Alterações guardadas." };
}

export async function deleteClienteAction(id: string): Promise<void> {
  await requireUser();

  try {
    await db.delete(clientes).where(eq(clientes.id, id));
  } catch (err) {
    // onDelete: restrict nas obras. Se o cliente tiver obras, a FK falha.
    console.error("[clientes.delete]", err);
    throw new Error(
      "Não é possível apagar este cliente porque tem obras associadas.",
    );
  }
  revalidatePath("/clientes");
  redirect("/clientes");
}
