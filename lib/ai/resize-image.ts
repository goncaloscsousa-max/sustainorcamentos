import sharp from "sharp";

/**
 * Redimensiona + recomprime uma imagem para caber no limite de 5 MB da API
 * Anthropic (e manter o pedido total < 32 MB quando enviamos várias fotos).
 *
 * Estratégia:
 *  1. Se já é pequena (< 1.5 MB) e tem dimensões razoáveis, devolve tal qual.
 *  2. Caso contrário, reduz a resolução máxima a 1600 px e converte para JPEG
 *     com qualidade 80. Se ainda estiver grande, baixa gradualmente a qualidade.
 */

const TARGET_MAX_BYTES = 1_500_000; // 1.5 MB — bem abaixo do limite da API
const HARD_MAX_BYTES = 4_500_000; // 4.5 MB — abaixo dos 5 MB/imagem da API
const MAX_DIM = 1600;

export type ResizedImage = {
  buffer: Buffer;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
};

export async function resizeForAI(
  input: Buffer,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
): Promise<ResizedImage> {
  if (input.byteLength < TARGET_MAX_BYTES) {
    try {
      const meta = await sharp(input).metadata();
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;
      if (w > 0 && h > 0 && w <= MAX_DIM && h <= MAX_DIM) {
        return { buffer: input, mediaType };
      }
    } catch {
      // metadata falhou — segue para recompressão
    }
  }

  const quality: number[] = [82, 72, 62, 50];
  let last: Buffer | null = null;
  for (const q of quality) {
    const out = await sharp(input)
      .rotate() // respeita EXIF orientation
      .resize({
        width: MAX_DIM,
        height: MAX_DIM,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: q, mozjpeg: true })
      .toBuffer();
    last = out;
    if (out.byteLength <= TARGET_MAX_BYTES) {
      return { buffer: out, mediaType: "image/jpeg" };
    }
  }
  if (last && last.byteLength <= HARD_MAX_BYTES) {
    return { buffer: last, mediaType: "image/jpeg" };
  }
  throw new Error(
    `Imagem continua grande após recompressão (${(
      (last?.byteLength ?? input.byteLength) /
      1024 /
      1024
    ).toFixed(1)} MB). Tenta uma foto mais pequena.`,
  );
}
