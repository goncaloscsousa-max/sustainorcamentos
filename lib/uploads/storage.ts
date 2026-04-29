import {
  createWriteStream,
  existsSync,
  mkdirSync,
  promises as fs,
} from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/**
 * Magic bytes (assinaturas iniciais) dos formatos que aceitamos. Validamos
 * o conteúdo real do ficheiro depois de gravado em disco — nunca confiamos
 * no `Content-Type` que o cliente declara nem na extensão.
 *
 * - JPEG: FF D8 FF
 * - PNG:  89 50 4E 47 0D 0A 1A 0A
 * - WEBP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50
 * - PDF:  25 50 44 46 2D ("%PDF-")
 * - XLSX: 50 4B 03 04 ("PK\x03\x04" — assinatura ZIP genérica; XLSX é OOXML)
 */
function matchesMagic(head: Buffer, ext: string): boolean {
  if (head.length < 8) return false;
  switch (ext) {
    case "jpg":
    case "jpeg":
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case "png":
      return (
        head[0] === 0x89 &&
        head[1] === 0x50 &&
        head[2] === 0x4e &&
        head[3] === 0x47 &&
        head[4] === 0x0d &&
        head[5] === 0x0a &&
        head[6] === 0x1a &&
        head[7] === 0x0a
      );
    case "webp": {
      if (
        head.length < 12 ||
        head[0] !== 0x52 ||
        head[1] !== 0x49 ||
        head[2] !== 0x46 ||
        head[3] !== 0x46
      )
        return false;
      // bytes 8-11 devem ser "WEBP"
      return (
        head[8] === 0x57 &&
        head[9] === 0x45 &&
        head[10] === 0x42 &&
        head[11] === 0x50
      );
    }
    case "pdf":
      return head.subarray(0, 5).toString("latin1") === "%PDF-";
    case "xlsx":
      return (
        head[0] === 0x50 &&
        head[1] === 0x4b &&
        head[2] === 0x03 &&
        head[3] === 0x04
      );
    default:
      return false;
  }
}

/**
 * Valida o conteúdo real de um ficheiro acabado de gravar em disco contra a
 * extensão declarada. Lê os primeiros 16 bytes (suficiente para todas as
 * assinaturas que usamos). Se não bater certo, lança erro — o caller é
 * responsável por apagar o ficheiro órfão.
 */
export async function validateFileMagic(
  absolutePath: string,
  ext: string,
): Promise<void> {
  const fh = await fs.open(absolutePath, "r");
  try {
    const buf = Buffer.alloc(16);
    const { bytesRead } = await fh.read(buf, 0, 16, 0);
    const head = buf.subarray(0, bytesRead);
    if (!matchesMagic(head, ext)) {
      throw new Error(
        `Conteúdo do ficheiro não corresponde à extensão .${ext}.`,
      );
    }
  } finally {
    await fh.close();
  }
}

/**
 * Storage local de ficheiros em `data/uploads/{obraId}/{uuid}_{nome}`.
 *
 * Tudo é guardado no projeto (fora da bundle) — ver `.gitignore`.
 * O caminho é relativo ao CWD do Next.js (raiz do projeto) por defeito.
 */

const ROOT = process.env.UPLOADS_ROOT
  ? path.resolve(process.env.UPLOADS_ROOT)
  : path.resolve(process.cwd(), "data", "uploads");

// Garante que a pasta de uploads existe ao carregar o módulo. Evita ENOENT
// na primeira escrita em ambiente novo (ex.: VPS recém-provisionado).
try {
  if (!existsSync(ROOT)) {
    mkdirSync(ROOT, { recursive: true });
  }
} catch (err) {
  // Não lançamos — se não conseguirmos criar agora, o save falhará depois
  // com erro mais útil. Isto é só best-effort no boot.
  console.error("[uploads] não foi possível criar UPLOADS_ROOT:", ROOT, err);
}

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB — projetos de decorador podem ser pesados

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
/**
 * Constrói o par (relative, absolute) e VALIDA que o absolute fica dentro
 * de ROOT — defesa em profundidade contra obraId malicioso (ex.: "..").
 * Os IDs vêm de `crypto.randomUUID()` mas o input do route handler vem da
 * URL, por isso nunca podemos confiar.
 */
function buildSafePaths(obraId: string, originalName: string): {
  relative: string;
  absolute: string;
} {
  const safeName = sanitizeFilename(originalName);
  const id = crypto.randomUUID();
  const relative = path.posix.join(obraId, `${id}_${safeName}`);
  const absolute = resolveStoragePath(relative);
  return { relative, absolute };
}

export async function saveUpload(params: {
  obraId: string;
  originalName: string;
  buffer: Buffer;
}): Promise<{ storagePath: string; absolutePath: string }> {
  const { relative, absolute } = buildSafePaths(
    params.obraId,
    params.originalName,
  );

  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, params.buffer);

  return { storagePath: relative, absolutePath: absolute };
}

/**
 * Versão em streaming para ficheiros grandes (projetos de decorador, etc).
 * Evita carregar 100 MB em memória ao mesmo tempo.
 */
export async function saveUploadStream(params: {
  obraId: string;
  originalName: string;
  stream: ReadableStream<Uint8Array>;
}): Promise<{ storagePath: string; absolutePath: string }> {
  const { relative, absolute } = buildSafePaths(
    params.obraId,
    params.originalName,
  );

  await fs.mkdir(path.dirname(absolute), { recursive: true });

  const nodeReadable = Readable.fromWeb(
    params.stream as Parameters<typeof Readable.fromWeb>[0],
  );
  const writeStream = createWriteStream(absolute);
  try {
    await pipeline(nodeReadable, writeStream);
  } catch (err) {
    // Limpa ficheiro parcial se o pipeline falhou (cliente abortou, disco cheio, etc.)
    await fs.unlink(absolute).catch(() => {});
    throw err;
  }

  return { storagePath: relative, absolutePath: absolute };
}

/**
 * Resolve um `storagePath` relativo (`{obraId}/{uuid}_{name}`) para um caminho
 * absoluto, GARANTINDO que o resultado fica dentro de `ROOT`. Se o caminho
 * apontar para fora da raiz (ex.: registo malicioso ou DB corrompida com
 * "../../etc/passwd"), lança erro.
 */
export function resolveStoragePath(storagePath: string): string {
  const absolute = path.resolve(ROOT, storagePath);
  const rootWithSep = ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;
  if (absolute !== ROOT && !absolute.startsWith(rootWithSep)) {
    throw new Error(
      `Caminho de ficheiro fora da raiz de uploads: ${storagePath}`,
    );
  }
  return absolute;
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
