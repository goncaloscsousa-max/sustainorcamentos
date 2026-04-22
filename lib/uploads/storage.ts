import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Storage local de ficheiros em `data/uploads/{obraId}/{uuid}_{nome}`.
 *
 * Tudo é guardado no projeto (fora da bundle) — ver `.gitignore`.
 * O caminho é relativo ao CWD do Next.js (raiz do projeto) por defeito.
 */

const ROOT = process.env.UPLOADS_ROOT
  ? path.resolve(process.env.UPLOADS_ROOT)
  : path.resolve(process.cwd(), "data", "uploads");

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB

export const ACCEPTED_MIME_TYPES: Record<string, string[]> = {
  // extensão -> mime types aceites
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  pdf: ["application/pdf"],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/octet-stream", // browsers por vezes mandam assim
  ],
};

export function extFromFilename(name: string): string | null {
  const m = /\.([a-zA-Z0-9]+)$/.exec(name);
  return m ? m[1].toLowerCase() : null;
}

export function isAcceptedMime(ext: string, mime: string): boolean {
  const list = ACCEPTED_MIME_TYPES[ext];
  if (!list) return false;
  return list.includes(mime.toLowerCase());
}

export function sanitizeFilename(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

/**
 * Guarda um ficheiro no disco. Devolve o caminho RELATIVO (para a DB).
 *
 * Guardamos só o caminho relativo (`{obraId}/{uuid}_{name}`) na DB — o root
 * fica configurável via `UPLOADS_ROOT` sem partir registos existentes.
 */
export async function saveUpload(params: {
  obraId: string;
  originalName: string;
  buffer: Buffer;
}): Promise<{ storagePath: string; absolutePath: string }> {
  const safeName = sanitizeFilename(params.originalName);
  const id = crypto.randomUUID();
  const relative = path.posix.join(params.obraId, `${id}_${safeName}`);
  const absolute = path.join(ROOT, params.obraId, `${id}_${safeName}`);

  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, params.buffer);

  return { storagePath: relative, absolutePath: absolute };
}

export function resolveStoragePath(storagePath: string): string {
  return path.join(ROOT, storagePath);
}

export async function readUpload(storagePath: string): Promise<Buffer> {
  return fs.readFile(resolveStoragePath(storagePath));
}

export async function deleteUpload(storagePath: string): Promise<void> {
  try {
    await fs.unlink(resolveStoragePath(storagePath));
  } catch (err) {
    // Ignora se o ficheiro já não existe — o registo em DB é a fonte da verdade.
    if (
      err != null &&
      typeof err === "object" &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return;
    }
    throw err;
  }
}
