"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ficheirosObra, obras } from "@/lib/db/schema";
import {
  MAX_UPLOAD_BYTES,
  deleteUpload,
  extFromFilename,
  isAcceptedMime,
  saveUpload,
} from "@/lib/uploads/storage";

import { FICHEIRO_TIPOS } from "./tipos";

const tipoEnum = z.enum(FICHEIRO_TIPOS);

export type UploadOutcome = {
  ok: boolean;
  error?: string;
  uploaded?: number;
  skipped?: { filename: string; reason: string }[];
};

export async function uploadFicheirosAction(
  obraId: string,
  formData: FormData,
): Promise<UploadOutcome> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Não autenticado." };

  const obra = await db.query.obras.findFirst({ where: eq(obras.id, obraId) });
  if (!obra) return { ok: false, error: "Obra não encontrada." };

  const tipoRaw = formData.get("tipo");
  const tipoParsed = tipoEnum.safeParse(tipoRaw);
  if (!tipoParsed.success) {
    return { ok: false, error: "Tipo de ficheiro inválido." };
  }
  const tipo = tipoParsed.data;

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return { ok: false, error: "Nenhum ficheiro selecionado." };
  }

  const skipped: { filename: string; reason: string }[] = [];
  let uploaded = 0;

  for (const file of files) {
    if (file.size === 0) {
      skipped.push({ filename: file.name, reason: "ficheiro vazio" });
      continue;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      skipped.push({
        filename: file.name,
        reason: `ultrapassa ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB`,
      });
      continue;
    }
    const ext = extFromFilename(file.name);
    if (!ext) {
      skipped.push({ filename: file.name, reason: "sem extensão reconhecida" });
      continue;
    }
    if (ext === "heic" || ext === "heif") {
      skipped.push({
        filename: file.name,
        reason: "HEIC ainda não suportado — converte para JPG",
      });
      continue;
    }
    if (!isAcceptedMime(ext, file.type)) {
      skipped.push({
        filename: file.name,
        reason: `tipo ${file.type || "desconhecido"} não aceite para .${ext}`,
      });
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { storagePath } = await saveUpload({
      obraId,
      originalName: file.name,
      buffer,
    });

    await db.insert(ficheirosObra).values({
      obraId,
      tipo,
      nomeOriginal: file.name,
      storagePath,
      mimeType: file.type || null,
      tamanhoBytes: file.size,
    });

    uploaded += 1;
  }

  revalidatePath(`/obras/${obraId}`);
  return { ok: true, uploaded, skipped };
}

export async function deleteFicheiroAction(
  obraId: string,
  ficheiroId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

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
