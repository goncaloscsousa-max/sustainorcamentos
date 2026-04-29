import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ficheirosObra } from "@/lib/db/schema";
import { readUpload } from "@/lib/uploads/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ ficheiroId: string }> };

/**
 * Compõe um Content-Disposition seguro:
 *  - `filename="..."` com ASCII-only (RFC 6266) — quoted-string sem CR/LF/aspas
 *  - `filename*=UTF-8''...` para nomes com acentos/cirílico/etc. (RFC 5987)
 * O nome original NUNCA pode partir os headers.
 */
function buildContentDisposition(
  disposition: "inline" | "attachment",
  rawName: string,
): string {
  // 1) Versão ASCII fallback (RFC 6266 quoted-string): NFKD + remove combining
  // marks (U+0300-U+036F) + colapsa o que não é [a-zA-Z0-9._-] em "_".
  const asciiSafe =
    rawName
      .normalize("NFKD")
      .replace(/[\u{0300}-\u{036f}]/gu, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 100) || "ficheiro";

  // 2) Versão UTF-8 percent-encoded (RFC 5987) — preserva acentos para clientes
  // modernos. Codifica também os caracteres reservados que `encodeURIComponent`
  // deixa passar mas que partem o header (`'`, `(`, `)`, `*`).
  const utf8Encoded = encodeURIComponent(rawName).replace(
    /['()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );

  return `${disposition}; filename="${asciiSafe}"; filename*=UTF-8''${utf8Encoded}`;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { ficheiroId } = await params;
  const [f] = await db
    .select()
    .from(ficheirosObra)
    .where(eq(ficheirosObra.id, ficheiroId))
    .limit(1);
  if (!f) {
    return NextResponse.json({ error: "Ficheiro não encontrado" }, { status: 404 });
  }

  try {
    const buffer = await readUpload(f.storagePath);
    const disposition: "inline" | "attachment" =
      f.mimeType?.startsWith("image/") || f.mimeType === "application/pdf"
        ? "inline"
        : "attachment";
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": f.mimeType ?? "application/octet-stream",
        "Content-Disposition": buildContentDisposition(
          disposition,
          f.nomeOriginal,
        ),
        "Cache-Control": "private, max-age=600",
      },
    });
  } catch (err) {
    console.error("[ficheiros.download]", ficheiroId, err);
    return NextResponse.json(
      { error: "Ficheiro em falta no disco" },
      { status: 410 },
    );
  }
}
