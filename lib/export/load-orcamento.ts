import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  clientes,
  linhasOrcamento,
  obras,
  orcamentos,
  type Cliente,
  type LinhaOrcamento,
  type Obra,
  type Orcamento,
} from "@/lib/db/schema";
import { getBranding } from "@/lib/branding/config";

export type EmpresaInfo = {
  nome: string;
  slogan: string;
  morada: string;
  codigoPostal: string;
  localidade: string;
  telefone: string;
  email: string;
  website: string;
  nif: string;
};

export type OrcamentoExportData = {
  orcamento: Orcamento;
  obra: Obra;
  cliente: Cliente;
  linhas: LinhaOrcamento[];
  linhasPorCategoria: { categoria: string; linhas: LinhaOrcamento[] }[];
  empresa: EmpresaInfo;
};

function empresaFromEnv(): EmpresaInfo {
  const b = getBranding();
  return {
    nome: b.companyLegalName.toUpperCase(),
    slogan: b.pdfSlogan,
    morada: b.addressLine,
    codigoPostal: b.postalCode,
    localidade: b.locality,
    telefone: b.phone,
    email: b.email,
    website: b.website,
    nif: b.nif || "{{COMPANY_NIF}}",
  };
}

function groupByCategoria(
  linhas: LinhaOrcamento[],
): { categoria: string; linhas: LinhaOrcamento[] }[] {
  const ordered = [...linhas].sort((a, b) => a.ordem - b.ordem);
  const map = new Map<string, LinhaOrcamento[]>();
  for (const l of ordered) {
    const bucket = map.get(l.categoria);
    if (bucket) bucket.push(l);
    else map.set(l.categoria, [l]);
  }
  return Array.from(map.entries()).map(([categoria, ls]) => ({
    categoria,
    linhas: ls,
  }));
}

export async function loadOrcamentoForExport(
  orcamentoId: string,
): Promise<OrcamentoExportData | null> {
  const orcamento = await db.query.orcamentos.findFirst({
    where: eq(orcamentos.id, orcamentoId),
  });
  if (!orcamento) return null;

  const obra = await db.query.obras.findFirst({
    where: eq(obras.id, orcamento.obraId),
  });
  if (!obra) return null;

  const cliente = await db.query.clientes.findFirst({
    where: eq(clientes.id, obra.clienteId),
  });
  if (!cliente) return null;

  const linhas = await db
    .select()
    .from(linhasOrcamento)
    .where(eq(linhasOrcamento.orcamentoId, orcamentoId))
    .orderBy(asc(linhasOrcamento.ordem));

  return {
    orcamento,
    obra,
    cliente,
    linhas,
    linhasPorCategoria: groupByCategoria(linhas),
    empresa: empresaFromEnv(),
  };
}
