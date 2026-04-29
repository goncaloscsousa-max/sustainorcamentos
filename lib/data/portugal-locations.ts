/**
 * Localizações em Portugal — distritos, cidades/concelhos principais e notas
 * de preço regional para a IA ajustar €/m² consoante o local da obra.
 *
 * Multiplicadores em basis points (bps): 10000 = 100 % (baseline nacional).
 * Baseado em mercado PT 2026 — custos de mão de obra, logística e procura.
 */

export type Distrito =
  | "aveiro"
  | "beja"
  | "braga"
  | "braganca"
  | "castelo_branco"
  | "coimbra"
  | "evora"
  | "faro"
  | "guarda"
  | "leiria"
  | "lisboa"
  | "portalegre"
  | "porto"
  | "santarem"
  | "setubal"
  | "viana_do_castelo"
  | "vila_real"
  | "viseu"
  | "acores"
  | "madeira";

export const DISTRITO_OPTIONS: { value: Distrito; label: string }[] = [
  { value: "aveiro", label: "Aveiro" },
  { value: "beja", label: "Beja" },
  { value: "braga", label: "Braga" },
  { value: "braganca", label: "Bragança" },
  { value: "castelo_branco", label: "Castelo Branco" },
  { value: "coimbra", label: "Coimbra" },
  { value: "evora", label: "Évora" },
  { value: "faro", label: "Faro" },
  { value: "guarda", label: "Guarda" },
  { value: "leiria", label: "Leiria" },
  { value: "lisboa", label: "Lisboa" },
  { value: "portalegre", label: "Portalegre" },
  { value: "porto", label: "Porto" },
  { value: "santarem", label: "Santarém" },
  { value: "setubal", label: "Setúbal" },
  { value: "viana_do_castelo", label: "Viana do Castelo" },
  { value: "vila_real", label: "Vila Real" },
  { value: "viseu", label: "Viseu" },
  { value: "acores", label: "Açores" },
  { value: "madeira", label: "Madeira" },
];

export const DISTRITO_VALUES = DISTRITO_OPTIONS.map((d) => d.value) as [
  Distrito,
  ...Distrito[],
];

/**
 * Principais concelhos/cidades por distrito — usado em <datalist> para
 * autocomplete enquanto o utilizador escreve.
 */
export const CIDADES_POR_DISTRITO: Record<Distrito, string[]> = {
  aveiro: [
    "Aveiro",
    "Águeda",
    "Albergaria-a-Velha",
    "Anadia",
    "Arouca",
    "Espinho",
    "Estarreja",
    "Ílhavo",
    "Oliveira de Azeméis",
    "Ovar",
    "Santa Maria da Feira",
    "São João da Madeira",
    "Vagos",
  ],
  beja: [
    "Beja",
    "Aljustrel",
    "Almodôvar",
    "Castro Verde",
    "Cuba",
    "Ferreira do Alentejo",
    "Moura",
    "Odemira",
    "Ourique",
    "Serpa",
    "Vidigueira",
  ],
  braga: [
    "Braga",
    "Amares",
    "Barcelos",
    "Cabeceiras de Basto",
    "Celorico de Basto",
    "Esposende",
    "Fafe",
    "Guimarães",
    "Póvoa de Lanhoso",
    "Terras de Bouro",
    "Vieira do Minho",
    "Vila Nova de Famalicão",
    "Vila Verde",
    "Vizela",
  ],
  braganca: [
    "Bragança",
    "Alfândega da Fé",
    "Carrazeda de Ansiães",
    "Freixo de Espada à Cinta",
    "Macedo de Cavaleiros",
    "Miranda do Douro",
    "Mirandela",
    "Mogadouro",
    "Torre de Moncorvo",
    "Vila Flor",
    "Vimioso",
    "Vinhais",
  ],
  castelo_branco: [
    "Castelo Branco",
    "Belmonte",
    "Covilhã",
    "Fundão",
    "Idanha-a-Nova",
    "Oleiros",
    "Penamacor",
    "Proença-a-Nova",
    "Sertã",
    "Vila de Rei",
    "Vila Velha de Ródão",
  ],
  coimbra: [
    "Coimbra",
    "Arganil",
    "Cantanhede",
    "Condeixa-a-Nova",
    "Figueira da Foz",
    "Góis",
    "Lousã",
    "Mira",
    "Miranda do Corvo",
    "Montemor-o-Velho",
    "Oliveira do Hospital",
    "Pampilhosa da Serra",
    "Penacova",
    "Penela",
    "Soure",
    "Tábua",
    "Vila Nova de Poiares",
  ],
  evora: [
    "Évora",
    "Alandroal",
    "Arraiolos",
    "Borba",
    "Estremoz",
    "Montemor-o-Novo",
    "Mora",
    "Mourão",
    "Portel",
    "Redondo",
    "Reguengos de Monsaraz",
    "Vendas Novas",
    "Viana do Alentejo",
    "Vila Viçosa",
  ],
  faro: [
    "Faro",
    "Albufeira",
    "Alcoutim",
    "Aljezur",
    "Castro Marim",
    "Lagoa",
    "Lagos",
    "Loulé",
    "Monchique",
    "Olhão",
    "Portimão",
    "São Brás de Alportel",
    "Silves",
    "Tavira",
    "Vila do Bispo",
    "Vila Real de Santo António",
  ],
  guarda: [
    "Guarda",
    "Aguiar da Beira",
    "Almeida",
    "Celorico da Beira",
    "Figueira de Castelo Rodrigo",
    "Fornos de Algodres",
    "Gouveia",
    "Manteigas",
    "Mêda",
    "Pinhel",
    "Sabugal",
    "Seia",
    "Trancoso",
    "Vila Nova de Foz Côa",
  ],
  leiria: [
    "Leiria",
    "Alcobaça",
    "Alvaiázere",
    "Ansião",
    "Batalha",
    "Bombarral",
    "Caldas da Rainha",
    "Castanheira de Pera",
    "Figueiró dos Vinhos",
    "Marinha Grande",
    "Nazaré",
    "Óbidos",
    "Pedrógão Grande",
    "Peniche",
    "Pombal",
    "Porto de Mós",
  ],
  lisboa: [
    "Lisboa",
    "Alenquer",
    "Amadora",
    "Arruda dos Vinhos",
    "Cadaval",
    "Cascais",
    "Loures",
    "Lourinhã",
    "Mafra",
    "Odivelas",
    "Oeiras",
    "Sintra",
    "Sobral de Monte Agraço",
    "Torres Vedras",
    "Vila Franca de Xira",
  ],
  portalegre: [
    "Portalegre",
    "Alter do Chão",
    "Arronches",
    "Avis",
    "Campo Maior",
    "Castelo de Vide",
    "Crato",
    "Elvas",
    "Fronteira",
    "Gavião",
    "Marvão",
    "Monforte",
    "Nisa",
    "Ponte de Sor",
    "Sousel",
  ],
  porto: [
    "Porto",
    "Amarante",
    "Baião",
    "Felgueiras",
    "Gondomar",
    "Lousada",
    "Maia",
    "Marco de Canaveses",
    "Matosinhos",
    "Paços de Ferreira",
    "Paredes",
    "Penafiel",
    "Póvoa de Varzim",
    "Santo Tirso",
    "Trofa",
    "Valongo",
    "Vila do Conde",
    "Vila Nova de Gaia",
  ],
  santarem: [
    "Santarém",
    "Abrantes",
    "Alcanena",
    "Almeirim",
    "Alpiarça",
    "Benavente",
    "Cartaxo",
    "Chamusca",
    "Constância",
    "Coruche",
    "Entroncamento",
    "Ferreira do Zêzere",
    "Golegã",
    "Mação",
    "Ourém",
    "Rio Maior",
    "Salvaterra de Magos",
    "Sardoal",
    "Tomar",
    "Torres Novas",
    "Vila Nova da Barquinha",
  ],
  setubal: [
    "Setúbal",
    "Alcácer do Sal",
    "Alcochete",
    "Almada",
    "Barreiro",
    "Grândola",
    "Moita",
    "Montijo",
    "Palmela",
    "Santiago do Cacém",
    "Seixal",
    "Sesimbra",
    "Sines",
  ],
  viana_do_castelo: [
    "Viana do Castelo",
    "Arcos de Valdevez",
    "Caminha",
    "Melgaço",
    "Monção",
    "Paredes de Coura",
    "Ponte da Barca",
    "Ponte de Lima",
    "Valença",
    "Vila Nova de Cerveira",
  ],
  vila_real: [
    "Vila Real",
    "Alijó",
    "Boticas",
    "Chaves",
    "Mesão Frio",
    "Mondim de Basto",
    "Montalegre",
    "Murça",
    "Peso da Régua",
    "Ribeira de Pena",
    "Sabrosa",
    "Santa Marta de Penaguião",
    "Valpaços",
    "Vila Pouca de Aguiar",
  ],
  viseu: [
    "Viseu",
    "Armamar",
    "Carregal do Sal",
    "Castro Daire",
    "Cinfães",
    "Lamego",
    "Mangualde",
    "Moimenta da Beira",
    "Mortágua",
    "Nelas",
    "Oliveira de Frades",
    "Penalva do Castelo",
    "Penedono",
    "Resende",
    "Santa Comba Dão",
    "São João da Pesqueira",
    "São Pedro do Sul",
    "Sátão",
    "Sernancelhe",
    "Tabuaço",
    "Tarouca",
    "Tondela",
    "Vila Nova de Paiva",
    "Vouzela",
  ],
  acores: [
    "Ponta Delgada",
    "Angra do Heroísmo",
    "Horta",
    "Lagoa (Açores)",
    "Lajes das Flores",
    "Lajes do Pico",
    "Madalena",
    "Nordeste",
    "Povoação",
    "Praia da Vitória",
    "Ribeira Grande",
    "Santa Cruz da Graciosa",
    "Santa Cruz das Flores",
    "São Roque do Pico",
    "Velas",
    "Vila do Porto",
    "Vila Franca do Campo",
  ],
  madeira: [
    "Funchal",
    "Calheta",
    "Câmara de Lobos",
    "Machico",
    "Ponta do Sol",
    "Porto Moniz",
    "Porto Santo",
    "Ribeira Brava",
    "Santa Cruz",
    "Santana",
    "São Vicente",
  ],
};

/**
 * Factor multiplicador de preço em basis points (10000 = 100 % = baseline).
 * Aplicado sobre preços médios nacionais para chegar ao €/unidade regional.
 * Fontes: INE (custo mão de obra construção), mercado imobiliário, logística
 * de materiais. Valores 2026.
 */
export const REGIONAL_PRICE_FACTOR_BPS: Record<Distrito, number> = {
  lisboa: 12000, // +20 %  — Grande Lisboa, procura + salários altos
  madeira: 11800, // +18 %  — logística insular
  acores: 11500, // +15 %  — logística insular
  porto: 11200, // +12 %  — Grande Porto
  setubal: 10800, // +8 %  — Área metropolitana
  faro: 10700, // +7 %  — Algarve, sazonalidade turística
  leiria: 10300, // +3 %
  braga: 10200, // +2 %
  aveiro: 10200, // +2 %
  coimbra: 10100, // +1 %
  santarem: 10000, // baseline
  evora: 9800, // -2 %
  viana_do_castelo: 9700, // -3 %
  viseu: 9500, // -5 %
  vila_real: 9400, // -6 %
  castelo_branco: 9300, // -7 %
  beja: 9200, // -8 %
  portalegre: 9200, // -8 %
  guarda: 9000, // -10 %
  braganca: 9000, // -10 %
};

/**
 * Notas de mercado por distrito para incluir no contexto da IA. A IA usa
 * estas notas em conjunto com o factor multiplicador para ajustar preços.
 */
export const REGIONAL_PRICING_NOTES: Record<Distrito, string> = {
  lisboa:
    "Grande Lisboa — mercado premium. Mão de obra qualificada escassa, salários altos, rendas elevadas. Materiais com boa disponibilidade mas prazos de instalação apertados.",
  porto:
    "Grande Porto — mercado ativo, boa oferta de mão de obra mas com tendência de subida nos últimos anos. Custos materiais competitivos (proximidade a fornecedores do norte).",
  braga:
    "Norte — boa disponibilidade de mão de obra qualificada, preços competitivos. Muitos fornecedores locais de cerâmica e carpintaria.",
  aveiro:
    "Centro-norte — mercado estável, proximidade a polos industriais de cerâmica (Ovar, Águeda). Preços ligeiramente acima da média.",
  viana_do_castelo:
    "Alto-Minho — mercado mais pequeno, menos concorrência entre empreiteiros. Preços ligeiramente abaixo da média nacional.",
  coimbra:
    "Centro — mercado médio, boa oferta académica e técnica. Preços próximos da média nacional.",
  leiria:
    "Centro-oeste — forte ligação a materiais cerâmicos (Batalha, Alcobaça). Custos materiais competitivos, mão de obra na média.",
  santarem:
    "Ribatejo — mercado tradicional, preços na média nacional. Boa disponibilidade de materiais.",
  setubal:
    "Área metropolitana sul de Lisboa — preços acompanham Lisboa em zonas mais próximas (Almada, Seixal). Sines/Grândola mais económicos.",
  faro:
    "Algarve — forte sazonalidade. Preços sobem no verão e em zonas turísticas (Albufeira, Vilamoura, Lagos). Mão de obra sazonal em obras de 2ª habitação.",
  evora:
    "Alentejo central — mercado pequeno, menos concorrência. Tempos de resposta e deslocação aumentam custo logístico.",
  beja: "Baixo Alentejo — mercado disperso, custos logísticos elevados por km. Mão de obra escassa mas económica.",
  portalegre:
    "Alto Alentejo — mercado muito pequeno, mão de obra local limitada. Muitas obras dependem de equipas vindas de outros distritos.",
  castelo_branco:
    "Beira Baixa — mercado disperso. Materiais comuns com boa disponibilidade, acabamentos premium podem exigir encomenda.",
  guarda:
    "Beira Alta / Serra da Estrela — mercado pequeno, invernos rigorosos podem afetar prazos de obra exterior.",
  viseu: "Beira Alta — mercado estável mas fora dos grandes polos. Preços competitivos.",
  vila_real:
    "Trás-os-Montes — mercado pequeno, logística cara em zonas de difícil acesso.",
  braganca:
    "Trás-os-Montes — mercado muito pequeno e disperso. Mão de obra escassa, materiais podem exigir encomenda com semanas de antecedência.",
  acores:
    "Açores — logística insular com frete marítimo. Adiciona-se tipicamente 10–20 % ao custo de materiais não produzidos localmente. Prazos alargados.",
  madeira:
    "Madeira — logística insular com frete marítimo. Adiciona-se tipicamente 15–25 % ao custo de materiais importados. Mercado pequeno e concentrado no Funchal.",
};

export function labelForDistrito(value: string | null | undefined): string {
  if (!value) return "—";
  return DISTRITO_OPTIONS.find((d) => d.value === value)?.label ?? value;
}

/**
 * Devolve contexto regional para injetar no prompt da IA.
 * Retorna string vazia se não houver distrito.
 */
export function buildRegionalContextForAI(
  distrito: string | null | undefined,
  cidade: string | null | undefined,
): string {
  if (!distrito) return "";
  const d = distrito as Distrito;
  const label = labelForDistrito(d);
  const factor = REGIONAL_PRICE_FACTOR_BPS[d];
  const notes = REGIONAL_PRICING_NOTES[d];
  if (factor == null || !notes) return "";

  const pct = ((factor - 10000) / 100).toFixed(1);
  const sign = factor >= 10000 ? "+" : "";
  const local = cidade?.trim() ? `${cidade.trim()}, ${label}` : label;

  return [
    `Localização da obra: ${local}`,
    `Ajuste regional de preços: ${sign}${pct} % sobre a média nacional (factor ${factor / 10000}).`,
    `Notas de mercado: ${notes}`,
    `Aplica este ajuste aos valores unitários €/m², €/ml, €/un e €/vg que normalmente praticarias a nível nacional.`,
  ].join("\n");
}
