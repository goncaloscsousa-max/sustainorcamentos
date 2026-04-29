"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { ficheirosObra } from "@/lib/db/schema";
import { deleteUpload } from "@/lib/uploads/storage";
import { requireUser } from "@/lib/auth/require-user";

/**
 * O upload de ficheiros é feito via route handler em
 * `app/api/obras/[id]/ficheiros/route.ts` (XHR multipart com streaming).
 * Este ficheiro mantém apenas a action de DELETE para os botões "×" da UI.
 */

export async function deleteFicheiroAction(
  obraId: string,
  ficheiroId: string,
): Promise<void> {
  await requireUser();

  const [f] = await db
    .select()
    .from(ficheirosObra)
    .where(
      and(eq(ficheirosObra.id, ficheiroId), eq(ficheirosObra.obraId, obraId)),
    )
    .limit(1);
  if (!f) throw new Error("Ficheiro não encontrado.");

  await deleteUpload(f.storagePath);
  await db.delete(ficheirosObra).where(eq(ficheirosObra.id, ficheiroId));

  revalidatePath(`/obras/${obraId}`);
}
