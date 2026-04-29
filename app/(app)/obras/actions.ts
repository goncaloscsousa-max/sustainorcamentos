"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, like } from "drizzle-orm";

import { db } from "@/lib/db";
import { obras } from "@/lib/db/schema";
import { obraCreateSchema, obraUpdateSchema } from "@/lib/validation/obra";
import {
  EMPTY_STATE,
  type ActionState,
  zodIssuesToFieldErrors,
} from "@/lib/actions/types";
import { requireUser } from "@/lib/auth/require-user";

function parseBriefing(formData: FormData) {
  return {
    divisoes: formData.getAll("briefing_divisoes"),
    areaTotalM2: formData.get("briefing_areaTotalM2"),
    peDireitoM: formData.get("briefing_peDireitoM"),
    tipologiaImovel: formData.get("briefing_tipologiaImovel"),
    anoConstrucao: formData.get("briefing_anoConstrucao"),
    piso: formData.get("briefing_piso"),
    elevador: formData.get("briefing_elevador"),
    habitado: formData.get("briefing_habitado"),
    ultimaIntervencao: formData.get("briefing_ultimaIntervencao"),
    estadoEletrica: formData.get("briefing_estadoEletrica"),
    estadoCanalizacao: formData.get("briefing_estadoCanalizacao"),
    estadoSaneamento: formData.get("briefing_estadoSaneamento"),
    estadoGas: formData.get("briefing_estadoGas"),
    estadoAvac: formData.get("briefing_estadoAvac"),
    nivelAcabamentos: formData.get("briefing_nivelAcabamentos"),
    referenciasMateriais: formData.get("briefing_referenciasMateriais"),
    marcasPreferidas: formData.get("briefing_marcasPreferidas"),
    prazoDesejadoSemanas: formData.get("briefing_prazoDesejadoSemanas"),
    acesso: formData.get("briefing_acesso"),
    restricoesHorario: formData.get("briefing_restricoesHorario"),
    orcamentoAlvoMinEur: formData.get("briefing_orcamentoAlvoMinEur"),
    orcamentoAlvoMaxEur: formData.get("briefing_orcamentoAlvoMaxEur"),
    prioridade: formData.get("briefing_prioridade"),
    outrosOrcamentos: formData.get("briefing_outrosOrcamentos"),
    problemasConhecidos: formData.get("briefing_problemasConhecidos"),
    trabalhoEspecifico: formData.get("briefing_trabalhoEspecifico"),
    notasAdicionais: formData.get("briefing_notasAdicionais"),
  };
}

function parseCreate(formData: FormData) {
  return {
    clienteId: formData.get("clienteId"),
    titulo: formData.get("titulo"),
    moradaObra: formData.get("moradaObra"),
    tipo: formData.get("tipo"),
    dataVisita: formData.get("dataVisita"),
    dataInicioPrevista: formData.get("dataInicioPrevista"),
    dataConclusaoPrevista: formData.get("dataConclusaoPrevista"),
    distrito: formData.get("distrito"),
    cidade: formData.get("cidade"),
    descricao: null,
    briefing: parseBriefing(formData),
    notas: formData.get("notas"),
  };
}

function parseUpdate(formData: FormData) {
  return {
    ...parseCreate(formData),
    estado: formData.get("estado"),
  };
}

/**
 * Mapeia os field errors do briefing aninhado (`briefing.areaTotalM2`)
 * para os ids do form (`briefing_areaTotalM2`) e dá flatten ao topo.
 */
function flattenBriefingErrors(
  errors: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!errors) return errors;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(errors)) {
    if (k.startsWith("briefing.")) {
      out[`briefing_${k.slice("briefing.".length)}`] = v;
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Calcula a próxima referência SUS-YYYY-NNN dentro de uma transacção síncrona
 * — com better-sqlite3 isto serializa contra outros writers e elimina a
 * race window entre o SELECT max e o INSERT.
 */
function nextReferenciaWithin(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  year: number,
): string {
  const prefix = `SUS-${year}-`;
  const rows = tx
    .select({ referencia: obras.referencia })
    .from(obras)
    .where(like(obras.referencia, `${prefix}%`))
    .all();
  let maxN = 0;
  for (const r of rows) {
    const n = Number(r.referencia.slice(prefix.length));
    if (Number.isFinite(n) && n > maxN) maxN = n;
  }
  return `${prefix}${String(maxN + 1).padStart(3, "0")}`;
}

function isUniqueReferenciaErr(err: unknown): boolean {
  return (
    err instanceof Error &&
    /UNIQUE constraint failed.*referencia/i.test(err.message)
  );
}

export async function createObraAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado." };
  }

  const parsed = obraCreateSchema.safeParse(parseCreate(formData));
  if (!parsed.success) {
    return {
      fieldErrors: flattenBriefingErrors(
        zodIssuesToFieldErrors(parsed.error.issues),
      ),
    };
  }

  const { briefing, ...rest } = parsed.data;
  const year = new Date().getFullYear();

  // Tentamos até 2 vezes em caso de UNIQUE collision teórica (multi-instância,
  // ou clique muito rápido em duas tabs).
  let newId: string | null = null;
  for (let attempt = 0; attempt < 2 && newId == null; attempt++) {
    try {
      newId = db.transaction((tx) => {
        const referencia = nextReferenciaWithin(tx, year);
        const [row] = tx
          .insert(obras)
          .values({
            ...rest,
            briefing: JSON.stringify(briefing),
            referencia,
            criadoPor: user.id,
          })
          .returning({ id: obras.id })
          .all();
        return row.id;
      });
    } catch (err) {
      if (isUniqueReferenciaErr(err) && attempt === 0) {
        // race rara: outra transacção apanhou o mesmo número entre o SELECT
        // max e o INSERT. Repete uma vez.
        continue;
      }
      console.error("[obras.create]", err);
      return { error: "Não foi possível criar a obra." };
    }
  }

  if (newId == null) {
    return { error: "Não foi possível gerar referência única para a obra." };
  }

  revalidatePath("/obras");
  redirect(`/obras/${newId}`);
}

export async function updateObraAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireUser();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não autenticado." };
  }

  const parsed = obraUpdateSchema.safeParse(parseUpdate(formData));
  if (!parsed.success) {
    return {
      fieldErrors: flattenBriefingErrors(
        zodIssuesToFieldErrors(parsed.error.issues),
      ),
    };
  }

  const { briefing, ...rest } = parsed.data;

  try {
    const res = await db
      .update(obras)
      .set({ ...rest, briefing: JSON.stringify(briefing) })
      .where(eq(obras.id, id))
      .returning({ id: obras.id });
    if (res.length === 0) return { error: "Obra não encontrada." };
  } catch (err) {
    console.error("[obras.update]", err);
    return { error: "Não foi possível guardar as alterações." };
  }

  revalidatePath("/obras");
  revalidatePath(`/obras/${id}`);
  return { ...EMPTY_STATE, success: "Alterações guardadas." };
}

export async function deleteObraAction(id: string): Promise<void> {
  await requireUser();

  try {
    await db.delete(obras).where(eq(obras.id, id));
  } catch (err) {
    console.error("[obras.delete]", err);
    throw new Error("Não foi possível apagar a obra.");
  }
  revalidatePath("/obras");
  redirect("/obras");
}

