import { z } from "zod";

/**
 * Briefing estruturado de obra.
 *
 * Antes inseria-se uma descrição livre que normalmente era pobre
 * (ex.: "remodelação do apartamento da Sra. Silva"). A IA não tem como
 * inferir áreas, idade do edifício, instalações a refazer, etc., e isto
 * resulta em orçamentos demasiado vagos.
 *
 * Este briefing força perguntas estruturadas que cobrem o que um engenheiro
 * de obra precisaria de saber antes de orçamentar. As respostas são
 * serializadas num bloco de texto rico que vai como contexto à IA.
 */

/* ---------------------------------------------------------------------- */
/*                              ENUMS / CONST                             */
/* ---------------------------------------------------------------------- */

export const DIVISOES_INTERVENCIONADAS = [
  "cozinha",
  "sala",
  "wc_principal",
  "wc_servico",
  "quartos",
  "suite",
  "hall_corredores",
  "varanda_terraco",
  "fachada",
  "cobertura",
  "garagem",
  "logradouro_jardim",
  "comercial_loja",
  "comercial_escritorio",
  "outro",
] as const;
export type DivisaoIntervencionada = (typeof DIVISOES_INTERVENCIONADAS)[number];

export const DIVISAO_LABELS: Record<DivisaoIntervencionada, string> = {
  cozinha: "Cozinha",
  sala: "Sala / sala de jantar",
  wc_principal: "WC principal",
  wc_servico: "WC de serviço",
  quartos: "Quartos",
  suite: "Suite",
  hall_corredores: "Hall e corredores",
  varanda_terraco: "Varanda / terraço",
  fachada: "Fachada",
  cobertura: "Cobertura / telhado",
  garagem: "Garagem",
  logradouro_jardim: "Logradouro / jardim",
  comercial_loja: "Loja comercial",
  comercial_escritorio: "Escritório",
  outro: "Outro (descreve)",
};

export const ANO_CONSTRUCAO_OPCOES = [
  { value: "pre_1951", label: "Antes de 1951 (sem RGEU pleno, frequente amianto/chumbo)" },
  { value: "1951_1980", label: "1951–1980 (canalização Pb/Fe, elétrica antiga)" },
  { value: "1981_2000", label: "1981–2000 (instalações reformáveis, isolamento fraco)" },
  { value: "2001_2010", label: "2001–2010 (RCCTE inicial, isolamento médio)" },
  { value: "2011_2020", label: "2011–2020 (REH, isolamento bom)" },
  { value: "pos_2020", label: "Pós-2020 (eficiência elevada)" },
] as const;
export const ANO_CONSTRUCAO_VALUES = ANO_CONSTRUCAO_OPCOES.map((o) => o.value) as [
  string,
  ...string[],
];
export type AnoConstrucao = (typeof ANO_CONSTRUCAO_OPCOES)[number]["value"];

export const TIPOLOGIA_IMOVEL_OPCOES = [
  { value: "apartamento", label: "Apartamento" },
  { value: "moradia_unifamiliar", label: "Moradia unifamiliar" },
  { value: "moradia_geminada", label: "Moradia geminada / banda" },
  { value: "loja", label: "Loja / espaço comercial" },
  { value: "escritorio", label: "Escritório" },
  { value: "armazem", label: "Armazém / industrial leve" },
  { value: "outro", label: "Outro" },
] as const;
export const TIPOLOGIA_IMOVEL_VALUES = TIPOLOGIA_IMOVEL_OPCOES.map((o) => o.value) as [
  string,
  ...string[],
];

export const PISO_OPCOES = [
  { value: "rc", label: "Rés-do-chão" },
  { value: "1", label: "1.º andar" },
  { value: "2", label: "2.º andar" },
  { value: "3", label: "3.º andar" },
  { value: "4_mais", label: "4.º ou superior" },
  { value: "moradia", label: "Moradia (vários pisos)" },
] as const;
export const PISO_VALUES = PISO_OPCOES.map((o) => o.value) as [string, ...string[]];

export const ELEVADOR_OPCOES = [
  { value: "sim_carga", label: "Sim — com elevador de carga" },
  { value: "sim_passageiros", label: "Sim — só passageiros (limita transporte)" },
  { value: "nao", label: "Não há elevador" },
  { value: "na", label: "Não aplicável" },
] as const;
export const ELEVADOR_VALUES = ELEVADOR_OPCOES.map((o) => o.value) as [string, ...string[]];

export const HABITADO_DURANTE_OBRA_OPCOES = [
  { value: "nao", label: "Não — espaço fica livre durante toda a obra" },
  { value: "sim_parcial", label: "Sim — só algumas divisões intervencionadas de cada vez" },
  { value: "sim_total", label: "Sim — habitado em pleno (limita ruído e horários)" },
] as const;
export const HABITADO_VALUES = HABITADO_DURANTE_OBRA_OPCOES.map((o) => o.value) as [
  string,
  ...string[],
];

export const ESTADO_INSTALACAO_OPCOES = [
  { value: "manter", label: "Manter (já está bem)" },
  { value: "remendar", label: "Pequenos retoques" },
  { value: "refazer_zona", label: "Refazer só zona intervencionada" },
  { value: "refazer_tudo", label: "Refazer tudo de raiz" },
  { value: "introduzir", label: "Introduzir nova (não existe hoje)" },
  { value: "na", label: "Não aplicável" },
  { value: "desconhecido", label: "Desconhecido — precisa inspecionar" },
] as const;
export const ESTADO_INST_VALUES = ESTADO_INSTALACAO_OPCOES.map((o) => o.value) as [
  string,
  ...string[],
];

export const NIVEL_ACABAMENTOS_OPCOES = [
  {
    value: "basico",
    label: "Básico — funcional, marcas low-cost, foco em poupar",
  },
  {
    value: "medio",
    label: "Médio — Leroy/AKI/IKEA, equilíbrio preço/qualidade",
  },
  {
    value: "medio_alto",
    label: "Médio-alto — marcas portuguesas reconhecidas (Margres, Roca)",
  },
  {
    value: "premium",
    label: "Premium — Recer série alta, Geberit, sanitários design",
  },
  {
    value: "luxo",
    label: "Luxo — pedra natural, carpintaria por medida, marcas internacionais",
  },
] as const;
export const NIVEL_VALUES = NIVEL_ACABAMENTOS_OPCOES.map((o) => o.value) as [
  string,
  ...string[],
];

export const PRIORIDADE_OPCOES = [
  { value: "preco", label: "Preço — cliente quer o mais barato possível" },
  { value: "prazo", label: "Prazo — cliente precisa rápido" },
  { value: "qualidade", label: "Qualidade — cliente quer trabalho bem feito" },
  { value: "equilibrio", label: "Equilíbrio — sem prioridade óbvia" },
] as const;
export const PRIORIDADE_VALUES = PRIORIDADE_OPCOES.map((o) => o.value) as [
  string,
  ...string[],
];

/* ---------------------------------------------------------------------- */
/*                                  SCHEMA                                */
/* ---------------------------------------------------------------------- */

const INVALID_NUMBER_SENTINEL = "__invalid_number__";

/**
 * Aceita string vazia / null como `null`. Texto não numérico FALHA validação
 * em vez de ser silenciosamente convertido para `null` (que apagaria
 * silenciosamente dados que o utilizador pensava ter preenchido).
 */
const optionalNumber = z.preprocess(
  (v): number | null | string => {
    if (v == null) return null;
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed === "") return null;
      const n = Number(trimmed.replace(",", "."));
      return Number.isFinite(n) ? n : INVALID_NUMBER_SENTINEL;
    }
    if (typeof v === "number" && Number.isFinite(v)) return v;
    return INVALID_NUMBER_SENTINEL;
  },
  z.union([
    z.number().nonnegative(),
    z.null(),
    z.literal(INVALID_NUMBER_SENTINEL).transform((_, ctx) => {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Valor numérico inválido — usa números (ex.: 95 ou 12,5)",
      });
      return z.NEVER;
    }),
  ]),
);

const optionalText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().trim().nullable(),
);

/**
 * Schema base do briefing — sem refinements transversais.
 * É o que estendemos para o `briefingObraReadSchema` (leitura permissiva).
 * O schema de submit (`briefingObraSchema`) é este + refinements.
 */
const briefingObraSchemaRaw = z.object({
  /* Âmbito */
  divisoes: z
    .array(z.enum(DIVISOES_INTERVENCIONADAS))
    .min(1, "Indica pelo menos uma divisão intervencionada"),
  // Texto livre que acompanha "Outro" — só relevante se "outro" estiver
  // em `divisoes`. Mantemos opcional para retrocompatibilidade com obras
  // antigas que não tinham este campo.
  divisoesOutroDescricao: optionalText,
  areaTotalM2: z.preprocess(
    (v) => {
      if (v == null || v === "") return null;
      if (typeof v === "string") {
        const n = Number(v.replace(",", "."));
        return Number.isFinite(n) ? n : null;
      }
      return v;
    },
    z.number().positive("Indica a área em m² (obrigatório para a IA estimar quantidades)"),
  ),
  peDireitoM: optionalNumber,

  /* Caracterização do imóvel */
  tipologiaImovel: z.enum(TIPOLOGIA_IMOVEL_VALUES, {
    message: "Indica a tipologia do imóvel",
  }),
  anoConstrucao: z.enum(ANO_CONSTRUCAO_VALUES, {
    message: "Indica a idade aproximada do edifício",
  }),
  piso: z.enum(PISO_VALUES, { message: "Indica em que piso é a obra" }),
  elevador: z.enum(ELEVADOR_VALUES, {
    message: "Indica se há elevador (afeta custos de mão de obra)",
  }),
  habitado: z.enum(HABITADO_VALUES, {
    message: "Indica se o espaço está habitado",
  }),
  ultimaIntervencao: optionalText,

  /* Instalações */
  estadoEletrica: z.enum(ESTADO_INST_VALUES),
  estadoCanalizacao: z.enum(ESTADO_INST_VALUES),
  estadoSaneamento: z.enum(ESTADO_INST_VALUES),
  estadoGas: z.enum(ESTADO_INST_VALUES),
  estadoAvac: z.enum(ESTADO_INST_VALUES),

  /* Acabamentos e estilo */
  nivelAcabamentos: z.enum(NIVEL_VALUES, {
    message: "Indica o nível de acabamentos pretendido",
  }),
  referenciasMateriais: optionalText,
  marcasPreferidas: optionalText,

  /* Logística e prazos */
  prazoDesejadoSemanas: optionalNumber,
  acesso: optionalText,
  restricoesHorario: optionalText,

  /* Comerciais */
  orcamentoAlvoMinEur: optionalNumber,
  orcamentoAlvoMaxEur: optionalNumber,
  prioridade: z.enum(PRIORIDADE_VALUES, {
    message: "Indica a prioridade do cliente",
  }),
  outrosOrcamentos: optionalText,

  /* Problemas conhecidos / livre */
  problemasConhecidos: optionalText,
  trabalhoEspecifico: z
    .string()
    .trim()
    .min(20, "Descreve em palavras o que querem fazer (mínimo 20 caracteres)"),
  notasAdicionais: optionalText,
});

// Schema final para SUBMIT — adiciona o refinement transversal.
// Se marcou "Outro" como divisão, exige descrição não vazia.
export const briefingObraSchema = briefingObraSchemaRaw.superRefine(
  (data, ctx) => {
    if (data.divisoes.includes("outro")) {
      const desc = data.divisoesOutroDescricao?.trim();
      if (!desc || desc.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["divisoesOutroDescricao"],
          message:
            "Descreve a divisão 'Outro' (mín. 3 caracteres) ou desmarca a opção.",
        });
      }
    }
  },
);

export type BriefingObra = z.infer<typeof briefingObraSchema>;

/**
 * Schema permissivo para LEITURA de briefings já gravados.
 *
 * Quando o schema de submit evolui (ex.: subimos `min(trabalhoEspecifico)`
 * de 10 para 20), briefings antigos passariam a falhar parsing e a UI
 * mostrava "sem briefing" mesmo havendo dados na DB. Para evitar perder
 * informação, leitura aceita campos legacy mais soltos e devolve `BriefingObra`
 * com defaults onde precisa.
 */
const briefingObraReadSchema = briefingObraSchemaRaw.extend({
  trabalhoEspecifico: z.string().trim().default(""),
});

/* ---------------------------------------------------------------------- */
/*                              SERIALIZAÇÃO                              */
/* ---------------------------------------------------------------------- */

function pickLabel<T extends { value: string; label: string }>(
  opcoes: readonly T[],
  v: string,
): string {
  return opcoes.find((o) => o.value === v)?.label ?? v;
}

/**
 * Converte o briefing num bloco de texto rico em português, optimizado
 * para ser injectado no prompt do Claude. Cada secção é claramente
 * marcada para a IA poder discriminar.
 */
export function briefingToPrompt(b: BriefingObra): string {
  // Quando "outro" está marcado, substitui o label genérico pelo texto
  // livre que o utilizador escreveu (ex.: "Anexo de jardim", "Sótão").
  const divisoes = b.divisoes
    .map((d) => {
      if (d === "outro") {
        const desc = b.divisoesOutroDescricao?.trim();
        return desc ? `Outro (${desc})` : DIVISAO_LABELS[d];
      }
      return DIVISAO_LABELS[d];
    })
    .join(", ");
  const orcamentoAlvo =
    b.orcamentoAlvoMinEur != null || b.orcamentoAlvoMaxEur != null
      ? `${b.orcamentoAlvoMinEur ?? "?"} – ${b.orcamentoAlvoMaxEur ?? "?"} €`
      : "não indicado pelo cliente";

  const linhas: string[] = [
    "==== BRIEFING ESTRUTURADO DA OBRA ====",
    "",
    "ÂMBITO E DIMENSÕES",
    `- Divisões intervencionadas: ${divisoes}`,
    `- Área total intervencionada: ${b.areaTotalM2} m²`,
    b.peDireitoM != null ? `- Pé-direito: ${b.peDireitoM} m` : null,
    "",
    "CARACTERIZAÇÃO DO IMÓVEL",
    `- Tipologia: ${pickLabel(TIPOLOGIA_IMOVEL_OPCOES, b.tipologiaImovel)}`,
    `- Ano de construção: ${pickLabel(ANO_CONSTRUCAO_OPCOES, b.anoConstrucao)}`,
    `- Piso: ${pickLabel(PISO_OPCOES, b.piso)}`,
    `- Elevador: ${pickLabel(ELEVADOR_OPCOES, b.elevador)}`,
    `- Habitado durante a obra: ${pickLabel(HABITADO_DURANTE_OBRA_OPCOES, b.habitado)}`,
    b.ultimaIntervencao
      ? `- Última intervenção significativa: ${b.ultimaIntervencao}`
      : null,
    "",
    "ESTADO DAS INSTALAÇÕES (decisão do cliente)",
    `- Elétrica: ${pickLabel(ESTADO_INSTALACAO_OPCOES, b.estadoEletrica)}`,
    `- Canalização (águas): ${pickLabel(ESTADO_INSTALACAO_OPCOES, b.estadoCanalizacao)}`,
    `- Saneamento: ${pickLabel(ESTADO_INSTALACAO_OPCOES, b.estadoSaneamento)}`,
    `- Gás: ${pickLabel(ESTADO_INSTALACAO_OPCOES, b.estadoGas)}`,
    `- AVAC / climatização: ${pickLabel(ESTADO_INSTALACAO_OPCOES, b.estadoAvac)}`,
    "",
    "ACABAMENTOS E ESTILO",
    `- Nível pretendido: ${pickLabel(NIVEL_ACABAMENTOS_OPCOES, b.nivelAcabamentos)}`,
    b.referenciasMateriais
      ? `- Referências de materiais / paleta: ${b.referenciasMateriais}`
      : null,
    b.marcasPreferidas ? `- Marcas/lojas preferidas: ${b.marcasPreferidas}` : null,
    "",
    "LOGÍSTICA E PRAZOS",
    b.prazoDesejadoSemanas != null
      ? `- Prazo desejado: ${b.prazoDesejadoSemanas} semanas`
      : "- Prazo desejado: não indicado",
    b.acesso ? `- Acesso ao local: ${b.acesso}` : null,
    b.restricoesHorario
      ? `- Restrições de horário/condomínio: ${b.restricoesHorario}`
      : null,
    "",
    "COMERCIAIS",
    `- Orçamento alvo do cliente: ${orcamentoAlvo}`,
    `- Prioridade: ${pickLabel(PRIORIDADE_OPCOES, b.prioridade)}`,
    b.outrosOrcamentos
      ? `- Concorrência / outros orçamentos: ${b.outrosOrcamentos}`
      : null,
    "",
    "PROBLEMAS CONHECIDOS",
    b.problemasConhecidos
      ? b.problemasConhecidos
      : "(o cliente não mencionou problemas explicitamente — não significa que não existam)",
    "",
    "TRABALHO ESPECÍFICO PRETENDIDO (palavras do cliente)",
    b.trabalhoEspecifico,
    "",
    b.notasAdicionais ? `NOTAS ADICIONAIS\n${b.notasAdicionais}` : null,
    "==== FIM DO BRIEFING ====",
  ].filter((l): l is string => l != null);

  return linhas.join("\n");
}

/**
 * Tenta carregar um briefing JSON. Devolve null se for legacy plain text.
 * Para briefings gravados com versões mais permissivas do schema (ex.:
 * trabalhoEspecifico curto), tenta o `briefingObraReadSchema` antes de desistir.
 */
export function tryParseBriefing(raw: unknown): BriefingObra | null {
  if (raw == null) return null;
  let candidate: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("{")) return null;
    try {
      candidate = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  const strict = briefingObraSchema.safeParse(candidate);
  if (strict.success) return strict.data;
  const lenient = briefingObraReadSchema.safeParse(candidate);
  return lenient.success ? lenient.data : null;
}
