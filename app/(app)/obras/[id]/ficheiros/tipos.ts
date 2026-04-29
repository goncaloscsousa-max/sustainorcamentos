export const FICHEIRO_TIPOS = [
  "foto_estado_atual",
  "referencia_final",
  "mtq",
  "projeto_3d",
  "projeto_eletricidade",
  "projeto_hidraulica",
  "projeto_carpintaria",
  "projeto_avac",
  "outro",
] as const;

export type FicheiroTipo = (typeof FICHEIRO_TIPOS)[number];

export const FICHEIRO_TIPO_LABELS: Record<FicheiroTipo, string> = {
  foto_estado_atual: "Foto estado atual",
  referencia_final: "Referência — como vai ficar",
  mtq: "MTQ (mapa de trabalhos)",
  projeto_3d: "Projeto 3D",
  projeto_eletricidade: "Projeto elétrico",
  projeto_hidraulica: "Projeto hidráulico",
  projeto_carpintaria: "Projeto carpintaria",
  projeto_avac: "Projeto AVAC",
  outro: "Outro",
};
