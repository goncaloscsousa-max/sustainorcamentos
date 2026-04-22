import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ficheirosObra } from "@/lib/db/schema";
import { readUpload } from "@/lib/uploads/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ ficheiroId: string }> };

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
    const disposition =
      f.mimeType?.startsWith("image/") || f.mimeType === "application/pdf"
        ? "inline"
        : "attachment";
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": f.mimeType ?? "application/octet-stream",
        "Content-Disposition": `${disposition}; filename="${f.nomeOriginal}"`,
        "Cache-Control": "private, max-age=600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Ficheiro em falta no disco" },
      { status: 410 },
    );
  }
}
