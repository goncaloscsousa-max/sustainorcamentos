import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { loadOrcamentoForExport } from "@/lib/export/load-orcamento";
import { generateOrcamentoXLSX } from "@/lib/export/xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ orcamentoId: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { orcamentoId } = await params;
  const data = await loadOrcamentoForExport(orcamentoId);
  if (!data) {
    return NextResponse.json(
      { error: "Orçamento não encontrado" },
      { status: 404 },
    );
  }

  const buffer = await generateOrcamentoXLSX(data);
  const filename = `${data.obra.referencia}_v${data.orcamento.versao}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
