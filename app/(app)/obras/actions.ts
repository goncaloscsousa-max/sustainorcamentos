"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, like } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { obras } from "@/lib/db/schema";
import { obraCreateSchema, obraUpdateSchema } from "@/lib/validation/obra";
import {
  EMPTY_STATE,
  type ActionState,
  zodIssuesToFieldErrors,
} from "@/lib/actions/types";

function parseCreate(formData: FormData) {
  return {
    clienteId: formData.get("clienteId"),
    titulo: formData.get("titulo"),
    moradaObra: formData.get("moradaObra"),
    tipo: formData.get("tipo"),
    dataVisita: formData.get("dataVisita"),
    dataInicioPrevista: formData.get("dataInicioPrevista"),
    dataConclusaoPrevista: formData.get("dataConclusaoPrevista"),
    notas: formData.get("notas"),
  };
}

function parseUpdate(formData: FormData) {
  return {
    ...parseCreate(formData),
    estado: formData.get("estado"),
  };
}

/**
 * Gera referência no formato SUS-YYYY-NNN, incrementando o contador do ano.
 * Race condition teórica existe mas é aceitável para single-tenant local.
 */
async function generateReferencia(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SUS-${year}-`;

  const rows = await db
    .select({ referencia: obras.referencia })
    .from(obras)
    .where(like(obras.referencia, `${prefix}%`));

  let maxN = 0;
  for (const r of rows) {
    const suffix = r.referencia.slice(prefix.length);
    const n = Number(suffix);
    if (Number.isFinite(n) && n > maxN) maxN = n;
  }

  const next = String(maxN + 1).padStart(3, "0");
  return `${prefix}${next}`;
}

export async function createObraAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = obraCreateSchema.safeParse(parseCreate(formData));
  if (!parsed.success) {
    return { fieldErrors: zodIssuesToFieldErrors(parsed.error.issues) };
  }

  const session = await auth();
  let newId: string;

  try {
    const referencia = await generateReferencia();
    const [row] = await db
      .insert(obras)
      .values({
        ...parsed.data,
        referencia,
        criadoPor: session?.user?.id ?? null,
      })
      .returning();
    newId = row.id;
  } catch (err) {
    console.error("[obras.create]", err);
    return { error: "Não foi possível criar a obra." };
  }

  revalidatePath("/obras");
  redirect(`/obras/${newId}`);
}

export async function updateObraAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = obraUpdateSchema.safeParse(parseUpdate(formData));
  if (!parsed.success) {
    return { fieldErrors: zodIssuesToFieldErrors(parsed.error.issues) };
  }

  try {
    const res = await db
      .update(obras)
      .set(parsed.data)
      .where(eq(obras.id, id))
      .returning({ id: obras.id });
    if (res.length === 0) return { error: "Obra não encontrada." };
  } catch (err) {
    console.error("[obras.update]", err);
    return { error: "Não foi possível guardar as alterações." };
  }

  revalidatePath("/obras");
  revalidatePath(`/obras/${id}`);
  return { ...EMPTY_STATE, success: "Alterações guardadas." };
}

export async function deleteObraAction(id: string): Promise<void> {
  try {
    await db.delete(obras).where(eq(obras.id, id));
  } catch (err) {
    console.error("[obras.delete]", err);
    throw new Error("Não foi possível apagar a obra.");
  }
  revalidatePath("/obras");
  redirect("/obras");
}

