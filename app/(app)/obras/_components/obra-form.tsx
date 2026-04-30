"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Cliente, Obra } from "@/lib/db/schema";
import type { ActionState } from "@/lib/actions/types";
import {
  CIDADES_POR_DISTRITO,
  DISTRITO_OPTIONS,
  type Distrito,
} from "@/lib/data/portugal-locations";
import {
  ANO_CONSTRUCAO_OPCOES,
  DIVISAO_LABELS,
  DIVISOES_INTERVENCIONADAS,
  ELEVADOR_OPCOES,
  ESTADO_INSTALACAO_OPCOES,
  HABITADO_DURANTE_OBRA_OPCOES,
  NIVEL_ACABAMENTOS_OPCOES,
  PISO_OPCOES,
  PRIORIDADE_OPCOES,
  TIPOLOGIA_IMOVEL_OPCOES,
  tryParseBriefing,
  type BriefingObra,
  type DivisaoIntervencionada,
} from "@/lib/data/briefing-obra";
import {
  ESTADO_OBRA_OPTIONS,
  TIPO_OBRA_OPTIONS,
} from "@/lib/format";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  clientes: Pick<Cliente, "id" | "nome">[];
  obra?: Obra;
  includeEstado?: boolean;
  submitLabel?: string;
};

const initial: ActionState = {};

const DEFAULT_INSTALACAO = "desconhecido";

function loadInitialBriefing(obra: Obra | undefined): Partial<BriefingObra> {
  if (!obra?.briefing) return {};
  return tryParseBriefing(obra.briefing) ?? {};
}

function numToStr(n: number | null | undefined): string {
  return n == null ? "" : String(n).replace(".", ",");
}

export function ObraForm({
  action,
  clientes,
  obra,
  includeEstado = false,
  submitLabel = "Guardar",
}: Props) {
  const [state, formAction, pending] = useActionState(action, initial);
  const [distrito, setDistrito] = useState<Distrito | "">(
    (obra?.distrito as Distrito | null | undefined) ?? "",
  );

  const initialBriefing = loadInitialBriefing(obra);
  const [divisoes, setDivisoes] = useState<Set<DivisaoIntervencionada>>(
    new Set(initialBriefing.divisoes ?? []),
  );

  // React 19 reseta inputs uncontrolled após a Server Action retornar.
  // Mantemos os valores de texto/número em estado controlado para que erros
  // de validação NÃO apaguem o que o utilizador já tinha preenchido.
  const [vals, setVals] = useState({
    titulo: obra?.titulo ?? "",
    moradaObra: obra?.moradaObra ?? "",
    cidade: obra?.cidade ?? "",
    dataVisita: obra?.dataVisita ?? "",
    dataInicioPrevista: obra?.dataInicioPrevista ?? "",
    dataConclusaoPrevista: obra?.dataConclusaoPrevista ?? "",
    notas: obra?.notas ?? "",
    briefing_divisoesOutroDescricao: initialBriefing.divisoesOutroDescricao ?? "",
    briefing_areaTotalM2: numToStr(initialBriefing.areaTotalM2),
    briefing_peDireitoM: numToStr(initialBriefing.peDireitoM),
    briefing_ultimaIntervencao: initialBriefing.ultimaIntervencao ?? "",
    briefing_referenciasMateriais: initialBriefing.referenciasMateriais ?? "",
    briefing_marcasPreferidas: initialBriefing.marcasPreferidas ?? "",
    briefing_prazoDesejadoSemanas: numToStr(initialBriefing.prazoDesejadoSemanas),
    briefing_acesso: initialBriefing.acesso ?? "",
    briefing_restricoesHorario: initialBriefing.restricoesHorario ?? "",
    briefing_orcamentoAlvoMinEur: numToStr(initialBriefing.orcamentoAlvoMinEur),
    briefing_orcamentoAlvoMaxEur: numToStr(initialBriefing.orcamentoAlvoMaxEur),
    briefing_outrosOrcamentos: initialBriefing.outrosOrcamentos ?? "",
    briefing_problemasConhecidos: initialBriefing.problemasConhecidos ?? "",
    briefing_trabalhoEspecifico: initialBriefing.trabalhoEspecifico ?? "",
    briefing_notasAdicionais: initialBriefing.notasAdicionais ?? "",
  });
  type ValKey = keyof typeof vals;
  const setVal =
    (k: ValKey) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setVals((prev) => ({ ...prev, [k]: e.target.value }));

  useEffect(() => {
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [state.success, state.error]);

  const cidadesSugeridas = distrito ? CIDADES_POR_DISTRITO[distrito] : [];

  function toggleDivisao(d: DivisaoIntervencionada, checked: boolean) {
    setDivisoes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(d);
      else next.delete(d);
      return next;
    });
  }

  const fieldErrors = state.fieldErrors ?? {};
  const errorEntries = Object.entries(fieldErrors).filter(
    ([, v]) => typeof v === "string" && v.length > 0,
  );

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {errorEntries.length > 0 ? (
        <ErrorSummary entries={errorEntries} />
      ) : null}

      {/* ============================================================ */}
      {/* Cliente, título, morada                                       */}
      {/* ============================================================ */}
      <Section
        title="Identificação"
        subtitle="Quem é o cliente, onde fica a obra."
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="clienteId">Cliente *</Label>
          <Select
            name="clienteId"
            defaultValue={obra?.clienteId ?? undefined}
            required
          >
            <SelectTrigger
              id="clienteId"
              className="w-full"
              aria-invalid={!!state.fieldErrors?.clienteId}
            >
              <SelectValue placeholder="Escolher cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Sem clientes. Criar um primeiro.
                </div>
              ) : (
                clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <FieldError msg={state.fieldErrors?.clienteId} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="titulo">Título *</Label>
          <Input
            id="titulo"
            name="titulo"
            value={vals.titulo}
            onChange={setVal("titulo")}
            aria-invalid={!!state.fieldErrors?.titulo}
            required
            placeholder="Ex.: Remodelação cozinha Sra. Silva"
          />
          <FieldError msg={state.fieldErrors?.titulo} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="moradaObra">Morada da obra *</Label>
          <Input
            id="moradaObra"
            name="moradaObra"
            value={vals.moradaObra}
            onChange={setVal("moradaObra")}
            aria-invalid={!!state.fieldErrors?.moradaObra}
            required
          />
          <FieldError msg={state.fieldErrors?.moradaObra} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="tipo">Tipo de intervenção *</Label>
            <Select
              name="tipo"
              defaultValue={obra?.tipo ?? undefined}
              required
            >
              <SelectTrigger
                id="tipo"
                className="w-full"
                aria-invalid={!!state.fieldErrors?.tipo}
              >
                <SelectValue placeholder="Escolher tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPO_OBRA_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError msg={state.fieldErrors?.tipo} />
          </div>

          {includeEstado ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="estado">Estado</Label>
              <Select
                name="estado"
                defaultValue={obra?.estado ?? "orcamentado"}
              >
                <SelectTrigger id="estado" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADO_OBRA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="distrito">Distrito *</Label>
            <Select
              name="distrito"
              value={distrito}
              onValueChange={(v) => setDistrito(v as Distrito)}
            >
              <SelectTrigger
                id="distrito"
                className="w-full"
                aria-invalid={!!state.fieldErrors?.distrito}
              >
                <SelectValue placeholder="Escolher distrito" />
              </SelectTrigger>
              <SelectContent>
                {DISTRITO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError msg={state.fieldErrors?.distrito} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cidade">Cidade / Concelho</Label>
            <Input
              id="cidade"
              name="cidade"
              list="cidades-sugeridas"
              value={vals.cidade}
              onChange={setVal("cidade")}
              placeholder={
                distrito ? "Ex.: Cascais" : "Escolher distrito primeiro"
              }
              aria-invalid={!!state.fieldErrors?.cidade}
              disabled={!distrito}
            />
            <datalist id="cidades-sugeridas">
              {cidadesSugeridas.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground">
              A IA ajusta preços €/m² consoante a região (ex.: Lisboa +20 %,
              Bragança −10 %).
            </p>
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/* BRIEFING — âmbito                                              */}
      {/* ============================================================ */}
      <Section
        title="1. Âmbito da intervenção"
        subtitle="Onde se mete a mão e quanta área é. Sem isto a IA chuta no escuro."
        critical
      >
        <div className="flex flex-col gap-3">
          <Label>Divisões intervencionadas *</Label>
          <p className="text-xs text-muted-foreground">
            Marca todas as divisões onde haverá trabalho — mesmo que pequeno.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DIVISOES_INTERVENCIONADAS.map((d) => (
              <label
                key={d}
                className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={divisoes.has(d)}
                  onCheckedChange={(v) => toggleDivisao(d, v === true)}
                />
                {/* hidden inputs serializam para FormData */}
                {divisoes.has(d) ? (
                  <input type="hidden" name="briefing_divisoes" value={d} />
                ) : null}
                <span>{DIVISAO_LABELS[d]}</span>
              </label>
            ))}
          </div>

          {/* Campo livre que aparece SÓ quando "Outro" está marcado */}
          {divisoes.has("outro") ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="briefing_divisoesOutroDescricao">
                Descreve a divisão &ldquo;Outro&rdquo; *
              </Label>
              <Input
                id="briefing_divisoesOutroDescricao"
                name="briefing_divisoesOutroDescricao"
                value={vals.briefing_divisoesOutroDescricao}
                onChange={setVal("briefing_divisoesOutroDescricao")}
                placeholder="Ex.: Sótão, anexo de jardim, sala técnica, escadas exteriores"
                aria-invalid={
                  !!state.fieldErrors?.briefing_divisoesOutroDescricao
                }
              />
              <FieldError
                msg={state.fieldErrors?.briefing_divisoesOutroDescricao}
              />
            </div>
          ) : null}

          <FieldError msg={state.fieldErrors?.briefing_divisoes} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <NumberField
            id="briefing_areaTotalM2"
            label="Área total intervencionada (m²) *"
            placeholder="Ex.: 95"
            value={vals.briefing_areaTotalM2}
            onChange={setVal("briefing_areaTotalM2")}
            error={state.fieldErrors?.briefing_areaTotalM2}
            help="Soma todas as divisões marcadas acima."
          />
          <NumberField
            id="briefing_peDireitoM"
            label="Pé-direito médio (m)"
            placeholder="Ex.: 2,7"
            value={vals.briefing_peDireitoM}
            onChange={setVal("briefing_peDireitoM")}
            help="Opcional. Importante se for >3 m (mais material em paredes/tetos)."
          />
        </div>
      </Section>

      {/* ============================================================ */}
      {/* BRIEFING — caracterização                                     */}
      {/* ============================================================ */}
      <Section
        title="2. Caracterização do imóvel"
        subtitle="Idade do edifício e logística do acesso definem riscos e custos."
        critical
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            name="briefing_tipologiaImovel"
            label="Tipologia do imóvel *"
            options={TIPOLOGIA_IMOVEL_OPCOES}
            defaultValue={initialBriefing.tipologiaImovel}
            error={state.fieldErrors?.briefing_tipologiaImovel}
          />
          <SelectField
            name="briefing_anoConstrucao"
            label="Ano de construção *"
            options={ANO_CONSTRUCAO_OPCOES}
            defaultValue={initialBriefing.anoConstrucao}
            error={state.fieldErrors?.briefing_anoConstrucao}
          />
          <SelectField
            name="briefing_piso"
            label="Piso *"
            options={PISO_OPCOES}
            defaultValue={initialBriefing.piso}
            error={state.fieldErrors?.briefing_piso}
          />
          <SelectField
            name="briefing_elevador"
            label="Elevador *"
            options={ELEVADOR_OPCOES}
            defaultValue={initialBriefing.elevador}
            error={state.fieldErrors?.briefing_elevador}
          />
          <SelectField
            name="briefing_habitado"
            label="Habitado durante a obra? *"
            options={HABITADO_DURANTE_OBRA_OPCOES}
            defaultValue={initialBriefing.habitado}
            error={state.fieldErrors?.briefing_habitado}
            wide
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="briefing_ultimaIntervencao">
              Última intervenção significativa
            </Label>
            <Input
              id="briefing_ultimaIntervencao"
              name="briefing_ultimaIntervencao"
              value={vals.briefing_ultimaIntervencao}
              onChange={setVal("briefing_ultimaIntervencao")}
              placeholder="Ex.: pintura há 8 anos; nunca; cozinha em 2015"
            />
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/* BRIEFING — instalações                                        */}
      {/* ============================================================ */}
      <Section
        title="3. Estado das instalações"
        subtitle="Diz o que o cliente quer fazer com cada instalação. Se não souberes, marca 'desconhecido' — a IA flagueia como risco."
        critical
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            name="briefing_estadoEletrica"
            label="Elétrica *"
            options={ESTADO_INSTALACAO_OPCOES}
            defaultValue={initialBriefing.estadoEletrica ?? DEFAULT_INSTALACAO}
            error={state.fieldErrors?.briefing_estadoEletrica}
            wide
          />
          <SelectField
            name="briefing_estadoCanalizacao"
            label="Canalização (águas) *"
            options={ESTADO_INSTALACAO_OPCOES}
            defaultValue={initialBriefing.estadoCanalizacao ?? DEFAULT_INSTALACAO}
            error={state.fieldErrors?.briefing_estadoCanalizacao}
            wide
          />
          <SelectField
            name="briefing_estadoSaneamento"
            label="Saneamento *"
            options={ESTADO_INSTALACAO_OPCOES}
            defaultValue={initialBriefing.estadoSaneamento ?? DEFAULT_INSTALACAO}
            error={state.fieldErrors?.briefing_estadoSaneamento}
            wide
          />
          <SelectField
            name="briefing_estadoGas"
            label="Gás *"
            options={ESTADO_INSTALACAO_OPCOES}
            defaultValue={initialBriefing.estadoGas ?? DEFAULT_INSTALACAO}
            error={state.fieldErrors?.briefing_estadoGas}
            wide
          />
          <SelectField
            name="briefing_estadoAvac"
            label="AVAC / climatização *"
            options={ESTADO_INSTALACAO_OPCOES}
            defaultValue={initialBriefing.estadoAvac ?? DEFAULT_INSTALACAO}
            error={state.fieldErrors?.briefing_estadoAvac}
            wide
          />
        </div>
      </Section>

      {/* ============================================================ */}
      {/* BRIEFING — acabamentos                                        */}
      {/* ============================================================ */}
      <Section
        title="4. Acabamentos e estilo"
        subtitle="O nível pretendido muda os €/m² em ~3x. Não inventes — pergunta ao cliente."
        critical
      >
        <SelectField
          name="briefing_nivelAcabamentos"
          label="Nível de acabamentos pretendido *"
          options={NIVEL_ACABAMENTOS_OPCOES}
          defaultValue={initialBriefing.nivelAcabamentos}
          error={state.fieldErrors?.briefing_nivelAcabamentos}
          wide
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="briefing_referenciasMateriais">
              Referências de materiais / paleta
            </Label>
            <Textarea
              id="briefing_referenciasMateriais"
              name="briefing_referenciasMateriais"
              rows={3}
              value={vals.briefing_referenciasMateriais}
              onChange={setVal("briefing_referenciasMateriais")}
              placeholder="Ex.: paleta off-white + carvalho claro; cozinha lacada branca; bancada Silestone"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="briefing_marcasPreferidas">Marcas / lojas preferidas</Label>
            <Textarea
              id="briefing_marcasPreferidas"
              name="briefing_marcasPreferidas"
              rows={3}
              value={vals.briefing_marcasPreferidas}
              onChange={setVal("briefing_marcasPreferidas")}
              placeholder="Ex.: Roca, Margres, Topo Centro, IKEA na cozinha"
            />
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/* BRIEFING — logística                                          */}
      {/* ============================================================ */}
      <Section
        title="5. Logística e prazos"
        subtitle="Acessos difíceis e horários restritos disparam custos de mão-de-obra."
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <NumberField
            id="briefing_prazoDesejadoSemanas"
            label="Prazo desejado (semanas)"
            placeholder="Ex.: 12"
            value={vals.briefing_prazoDesejadoSemanas}
            onChange={setVal("briefing_prazoDesejadoSemanas")}
          />
          <div className="sm:col-span-2 flex flex-col gap-2">
            <Label htmlFor="briefing_acesso">Acesso ao local</Label>
            <Input
              id="briefing_acesso"
              name="briefing_acesso"
              value={vals.briefing_acesso}
              onChange={setVal("briefing_acesso")}
              placeholder="Ex.: rua estreita sem entrada de camião; 2.º sem elevador; só carga de manhã"
            />
          </div>
          <div className="sm:col-span-3 flex flex-col gap-2">
            <Label htmlFor="briefing_restricoesHorario">
              Restrições de horário / condomínio
            </Label>
            <Input
              id="briefing_restricoesHorario"
              name="briefing_restricoesHorario"
              value={vals.briefing_restricoesHorario}
              onChange={setVal("briefing_restricoesHorario")}
              placeholder="Ex.: condomínio só permite obras 9h-18h dias úteis; ruído proibido após 17h"
            />
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/* BRIEFING — comerciais                                         */}
      {/* ============================================================ */}
      <Section
        title="6. Enquadramento comercial"
        subtitle="O que o cliente espera gastar e o que valoriza. Se ele não disse, escreve 'não disse'."
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <NumberField
            id="briefing_orcamentoAlvoMinEur"
            label="Orçamento alvo — mín. (€)"
            placeholder="Ex.: 25000"
            value={vals.briefing_orcamentoAlvoMinEur}
            onChange={setVal("briefing_orcamentoAlvoMinEur")}
          />
          <NumberField
            id="briefing_orcamentoAlvoMaxEur"
            label="Orçamento alvo — máx. (€)"
            placeholder="Ex.: 35000"
            value={vals.briefing_orcamentoAlvoMaxEur}
            onChange={setVal("briefing_orcamentoAlvoMaxEur")}
          />
          <SelectField
            name="briefing_prioridade"
            label="Prioridade do cliente *"
            options={PRIORIDADE_OPCOES}
            defaultValue={initialBriefing.prioridade}
            error={state.fieldErrors?.briefing_prioridade}
            wide
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="briefing_outrosOrcamentos">
            Concorrência / outros orçamentos
          </Label>
          <Input
            id="briefing_outrosOrcamentos"
            name="briefing_outrosOrcamentos"
            value={vals.briefing_outrosOrcamentos}
            onChange={setVal("briefing_outrosOrcamentos")}
            placeholder="Ex.: já tem 2 orçamentos (28k e 41k); só falou connosco"
          />
        </div>
      </Section>

      {/* ============================================================ */}
      {/* BRIEFING — problemas + descrição livre                        */}
      {/* ============================================================ */}
      <Section
        title="7. Problemas conhecidos e trabalho específico"
        subtitle="Tudo o que o cliente disse por palavras dele — sem filtrar."
        critical
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="briefing_problemasConhecidos">
            Problemas conhecidos
          </Label>
          <Textarea
            id="briefing_problemasConhecidos"
            name="briefing_problemasConhecidos"
            rows={3}
            value={vals.briefing_problemasConhecidos}
            onChange={setVal("briefing_problemasConhecidos")}
            placeholder="Ex.: humidade na parede do WC principal; chão da cozinha está abaulado; portão exterior empenado"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="briefing_trabalhoEspecifico">
            Trabalho específico pretendido (palavras do cliente) *
          </Label>
          <Textarea
            id="briefing_trabalhoEspecifico"
            name="briefing_trabalhoEspecifico"
            rows={5}
            value={vals.briefing_trabalhoEspecifico}
            onChange={setVal("briefing_trabalhoEspecifico")}
            aria-invalid={!!state.fieldErrors?.briefing_trabalhoEspecifico}
            placeholder="Ex.: Trocar bancada da cozinha por uma maior em ilha; abrir parede entre cozinha e sala; substituir cerâmica do WC; pintar tudo em branco; instalar climatização nos quartos."
          />
          <FieldError msg={state.fieldErrors?.briefing_trabalhoEspecifico} />
          <p className="text-xs text-muted-foreground">
            Mínimo 20 caracteres. Sê fiel ao que o cliente disse — a IA usa
            isto para cruzar com as fotos.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="briefing_notasAdicionais">
            Notas adicionais para a IA
          </Label>
          <Textarea
            id="briefing_notasAdicionais"
            name="briefing_notasAdicionais"
            rows={3}
            value={vals.briefing_notasAdicionais}
            onChange={setVal("briefing_notasAdicionais")}
            placeholder="Qualquer outra coisa relevante: cliente pediu para começar em julho; elevador do prédio estará em manutenção em maio; etc."
          />
        </div>
      </Section>

      {/* ============================================================ */}
      {/* Datas + notas internas                                         */}
      {/* ============================================================ */}
      <Section
        title="Datas e notas internas"
        subtitle="Apenas para uso da Sustain — não vai à IA."
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <DateField
            id="dataVisita"
            label="Data visita"
            value={vals.dataVisita}
            onChange={setVal("dataVisita")}
            error={state.fieldErrors?.dataVisita}
          />
          <DateField
            id="dataInicioPrevista"
            label="Início previsto"
            value={vals.dataInicioPrevista}
            onChange={setVal("dataInicioPrevista")}
            error={state.fieldErrors?.dataInicioPrevista}
          />
          <DateField
            id="dataConclusaoPrevista"
            label="Conclusão prevista"
            value={vals.dataConclusaoPrevista}
            onChange={setVal("dataConclusaoPrevista")}
            error={state.fieldErrors?.dataConclusaoPrevista}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="notas">Notas internas</Label>
          <Textarea
            id="notas"
            name="notas"
            rows={3}
            value={vals.notas}
            onChange={setVal("notas")}
            placeholder="Observações privadas da Sustain (não saem da plataforma)."
          />
        </div>
      </Section>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "A guardar..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------------- */
/*                        SUB-COMPONENTES (locais)                        */
/* ---------------------------------------------------------------------- */

function Section({
  title,
  subtitle,
  critical,
  children,
}: {
  title: string;
  subtitle?: string;
  critical?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`flex flex-col gap-5 rounded-lg border p-5 ${
        critical ? "border-amber-300/60 bg-amber-50/30 dark:border-amber-700/40 dark:bg-amber-950/10" : ""
      }`}
    >
      <header className="flex flex-col gap-1">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-sm text-destructive">{msg}</p>;
}

const FIELD_LABELS: Record<string, string> = {
  clienteId: "Cliente",
  titulo: "Título",
  moradaObra: "Morada da obra",
  tipo: "Tipo de intervenção",
  estado: "Estado",
  distrito: "Distrito",
  cidade: "Cidade",
  dataVisita: "Data visita",
  dataInicioPrevista: "Início previsto",
  dataConclusaoPrevista: "Conclusão prevista",
  briefing_divisoes: "Divisões intervencionadas",
  briefing_divisoesOutroDescricao: "Descrição da divisão 'Outro'",
  briefing_areaTotalM2: "Área total",
  briefing_peDireitoM: "Pé-direito",
  briefing_tipologiaImovel: "Tipologia",
  briefing_anoConstrucao: "Ano de construção",
  briefing_piso: "Piso",
  briefing_elevador: "Elevador",
  briefing_habitado: "Habitado durante a obra",
  briefing_estadoEletrica: "Elétrica",
  briefing_estadoCanalizacao: "Canalização",
  briefing_estadoSaneamento: "Saneamento",
  briefing_estadoGas: "Gás",
  briefing_estadoAvac: "AVAC",
  briefing_nivelAcabamentos: "Nível de acabamentos",
  briefing_prioridade: "Prioridade",
  briefing_prazoDesejadoSemanas: "Prazo desejado",
  briefing_orcamentoAlvoMinEur: "Orçamento alvo (mín.)",
  briefing_orcamentoAlvoMaxEur: "Orçamento alvo (máx.)",
  briefing_trabalhoEspecifico: "Trabalho específico",
};

function ErrorSummary({ entries }: { entries: [string, string][] }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3"
    >
      <p className="text-sm font-semibold text-destructive">
        {entries.length === 1
          ? "Há 1 campo por corrigir antes de guardar."
          : `Há ${entries.length} campos por corrigir antes de guardar.`}
      </p>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {entries.map(([field, msg]) => {
          const label = FIELD_LABELS[field] ?? field;
          return (
            <li key={field}>
              <a
                href={`#${field}`}
                onClick={(e) => {
                  // O `name` do briefing é igual ao id (ex.: briefing_areaTotalM2),
                  // por isso o âncora #id resolve naturalmente. Adicionamos um
                  // smooth scroll + focus para acessibilidade.
                  const el = document.getElementById(field);
                  if (el) {
                    e.preventDefault();
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    if (
                      el instanceof HTMLInputElement ||
                      el instanceof HTMLTextAreaElement ||
                      el instanceof HTMLButtonElement
                    ) {
                      setTimeout(() => el.focus(), 250);
                    }
                  }
                }}
                className="text-destructive underline-offset-2 hover:underline"
              >
                {label}
              </a>
              <span className="text-muted-foreground"> — {msg}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DateField({
  id,
  label,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type="date"
        value={value}
        onChange={onChange}
        aria-invalid={!!error}
      />
      <FieldError msg={error} />
    </div>
  );
}

function NumberField({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  help,
}: {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  help?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        aria-invalid={!!error}
      />
      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
      <FieldError msg={error} />
    </div>
  );
}

function SelectField({
  name,
  label,
  options,
  defaultValue,
  error,
  wide,
}: {
  name: string;
  label: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string;
  error?: string;
  wide?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-2 ${wide ? "sm:col-span-2" : ""}`}>
      <Label htmlFor={name}>{label}</Label>
      <Select name={name} defaultValue={defaultValue}>
        <SelectTrigger
          id={name}
          className="w-full"
          aria-invalid={!!error}
        >
          <SelectValue placeholder="Escolher..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError msg={error} />
    </div>
  );
}
