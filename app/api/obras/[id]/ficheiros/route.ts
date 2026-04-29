import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ficheirosObra, obras } from "@/lib/db/schema";
import {
  MAX_UPLOAD_BYTES,
  deleteUpload,
  extFromFilename,
  isAcceptedMime,
  resolveStoragePath,
  saveUploadStream,
  validateFileMagic,
} from "@/lib/uploads/storage";
import { FICHEIRO_TIPOS } from "@/app/(app)/obras/[id]/ficheiros/tipos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tipoEnum = z.enum(FICHEIRO_TIPOS);

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Upload de ficheiros via route handler (em vez de Server Action) porque o
 * parser multipart das Server Actions do Turbopack trunca ficheiros grandes
 * com "Unexpected end of form". Request.formData() nativo é estável.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id: obraId } = await params;

  const obra = await db.query.obras.findFirst({ where: eq(obras.id, obraId) });
  if (!obra) {
    return NextResponse.json(
      { error: "Obra não encontrada." },
      { status: 404 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    console.error("[ficheiros.upload.parse]", err);
    return NextResponse.json(
      { error: "Formulário inválido ou truncado." },
      { status: 400 },
    );
  }

  const tipoRaw = formData.get("tipo");
  const tipoParsed = tipoEnum.safeParse(tipoRaw);
  if (!tipoParsed.success) {
    return NextResponse.json(
      { error: "Tipo de ficheiro inválido." },
      { status: 400 },
    );
  }
  const tipo = tipoParsed.data;

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json(
      { error: "Nenhum ficheiro selecionado." },
      { status: 400 },
    );
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

    // Streaming directo do File para o disco — evita carregar o ficheiro
    // todo em memória (importante para projetos pesados de decorador).
    let storagePath: string | null = null;
    try {
      ({ storagePath } = await saveUploadStream({
        obraId,
        originalName: file.name,
        stream: file.stream(),
      }));
    } catch (err) {
      console.error("[ficheiros.upload.save]", file.name, err);
      skipped.push({
        filename: file.name,
        reason: "erro ao guardar — tenta novamente",
      });
      continue;
    }

    // Validação por magic bytes do conteúdo real — agora que está em disco.
    // Se não bater certo com a extensão, apaga e ignora.
    try {
      await validateFileMagic(resolveStoragePath(storagePath), ext);
    } catch (err) {
      console.warn("[ficheiros.upload.magic]", file.name, err);
      await deleteUpload(storagePath).catch(() => {});
      skipped.push({
        filename: file.name,
        reason: `conteúdo não corresponde a um ficheiro .${ext} válido`,
      });
      continue;
    }

    try {
      await db.insert(ficheirosObra).values({
        obraId,
        tipo,
        nomeOriginal: file.name,
        storagePath,
        mimeType: file.type || null,
        tamanhoBytes: file.size,
      });
      uploaded += 1;
    } catch (err) {
      console.error("[ficheiros.upload.db]", file.name, err);
      // Insert falhou — apaga o ficheiro físico para não ficar órfão.
      await deleteUpload(storagePath).catch((cleanupErr) => {
        console.error(
          "[ficheiros.upload.cleanup]",
          storagePath,
          cleanupErr,
        );
      });
      skipped.push({
        filename: file.name,
        reason: "erro a registar — tenta novamente",
      });
    }
  }

  revalidatePath(`/obras/${obraId}`);
  return NextResponse.json({ ok: true, uploaded, skipped });
}
