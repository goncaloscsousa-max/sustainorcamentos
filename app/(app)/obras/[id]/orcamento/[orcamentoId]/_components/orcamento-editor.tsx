"use client";

import { useMemo, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LinhaOrcamento, Orcamento } from "@/lib/db/schema";
import {
  CATEGORIA_OPTIONS,
  formatCents,
  parseCentsInput,
  parsePercentageInput,
  UNIDADE_OPTIONS,
} from "@/lib/format";

import { saveOrcamentoAction } from "../../actions";
import { sugerirPrecoAction } from "../ia-actions";
import { TabelaSearch } from "./tabela-search";

type LinhaState = {
  localId: string;
  categoria: string;
  descricao: string;
  unidade: string;
  quantidadeStr: string;
  precoClienteStr: string;
  custoInternoStr: string;
  origem: "tabela" | "ia_sugestao" | "manual";
  tabelaPrecoId: string | null;
  notas: string;
};

type HeaderState = {
  estado: Orcamento["estado"];
  dataEmissao: string;
  validadeDias: string;
  ivaPercentageStr: string;
  margemAlvoStr: string;
  condicoesPagamento: string;
  observacoes: string;
};

const ESTADO_ORC_OPTIONS = [
  { value: "rascunho", label: "Rascunho" },
  { value: "enviado", label: "Enviado" },
  { value: "aprovado", label: "Aprovado" },
  { value: "rejeitado", label: "Rejeitado" },
  { value: "substituido", label: "Substituído" },
] as const;

const origemVariant: Record<
  LinhaState["origem"],
  "default" | "secondary" | "outline"
> = {
  tabela: "secondary",
  ia_sugestao: "default",
  manual: "outline",
};

const origemLabel: Record<LinhaState["origem"], string> = {
  tabela: "Tabela",
  ia_sugestao: "IA",
  manual: "Manual",
};

function linhaToState(l: LinhaOrcamento): LinhaState {
  return {
    localId: l.id,
    categoria: l.categoria,
    descricao: l.descricao,
    unidade: l.unidade,
    quantidadeStr: String(l.quantidade).replace(".", ","),
    precoClienteStr: (l.precoClienteUnitCents / 100)
      .toFixed(2)
      .replace(".", ","),
    custoInternoStr:
      l.custoInternoUnitCents == null
        ? ""
        : (l.custoInternoUnitCents / 100).toFixed(2).replace(".", ","),
    origem: l.origem as LinhaState["origem"],
    tabelaPrecoId: l.tabelaPrecoId,
    notas: l.notas ?? "",
  };
}

function parseQuantity(s: string): number | null {
  const cleaned = s.replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function emptyLinha(): LinhaState {
  return {
    localId: crypto.randomUUID(),
    categoria: CATEGORIA_OPTIONS[0],
    descricao: "",
    unidade: "un",
    quantidadeStr: "1",
    precoClienteStr: "",
    custoInternoStr: "",
    origem: "manual",
    tabelaPrecoId: null,
    notas: "",
  };
}

type Props = {
  orcamento: Orcamento;
  linhas: LinhaOrcamento[];
};

export function OrcamentoEditor({ orcamento, linhas: initialLinhas }: Props) {
  const [header, setHeader] = useState<HeaderState>({
    estado: orcamento.estado as HeaderState["estado"],
    dataEmissao: orcamento.dataEmissao,
    validadeDias: String(orcamento.validadeDias),
    ivaPercentageStr: (orcamento.ivaPercentagemBps / 100)
      .toFixed(2)
      .replace(".", ","),
    margemAlvoStr:
      orcamento.margemAlvoBps == null
        ? ""
        : (orcamento.margemAlvoBps / 100).toFixed(2).replace(".", ","),
    condicoesPagamento: orcamento.condicoesPagamento,
    observacoes: orcamento.observacoes ?? "",
  });
  const [linhas, setLinhas] = useState<LinhaState[]>(() =>
    initialLinhas.map(linhaToState),
  );
  const [isSaving, startSave] = useTransition();
  const [suggestingId, setSuggestingId] = useState<string | null>(null);

  function handleSuggestPrice(linha: LinhaState) {
    if (!linha.descricao.trim()) {
      toast.error("Preenche a descrição antes de pedir sugestão.");
      return;
    }
    setSuggestingId(linha.localId);
    (async () => {
      try {
        const res = await sugerirPrecoAction({
          descricao: linha.descricao,
          unidade: linha.unidade,
          categoria: linha.categoria,
          quantidade: parseQuantity(linha.quantidadeStr),
          orcamentoId: orcamento.id,
        });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        updateLinha(linha.localId, {
          precoClienteStr: (res.precoClienteCents / 100)
            .toFixed(2)
            .replace(".", ","),
          custoInternoStr: (res.custoInternoCents / 100)
            .toFixed(2)
            .replace(".", ","),
          origem: "ia_sugestao",
          notas:
            (linha.notas ? linha.notas + "\n" : "") +
            `IA (${res.confianca}): ${res.justificacao}`,
        });
        toast.success(
          `Sugestão IA: €${(res.precoClienteCents / 100).toFixed(2)} / ${linha.unidade}`,
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro.");
      } finally {
        setSuggestingId(null);
      }
    })();
  }

  const totals = useMemo(() => {
    let subtotal = 0;
    let custoInterno = 0;
    for (const l of linhas) {
      const qty = parseQuantity(l.quantidadeStr);
      const preco = parseCentsInput(l.precoClienteStr);
      const custo = l.custoInternoStr ? parseCentsInput(l.custoInternoStr) : null;
      if (qty == null || preco == null) continue;
      subtotal += Math.round(qty * preco);
      if (custo != null) custoInterno += Math.round(qty * custo);
    }
    const ivaBps = parsePercentageInput(header.ivaPercentageStr) ?? 0;
    const ivaCents = Math.round((subtotal * ivaBps) / 10000);
    const total = subtotal + ivaCents;
    const margemBps =
      subtotal > 0
        ? Math.round(((subtotal - custoInterno) / subtotal) * 10000)
        : 0;
    const margemAlvoBps = parsePercentageInput(header.margemAlvoStr);
    return { subtotal, ivaCents, total, custoInterno, margemBps, margemAlvoBps };
  }, [linhas, header.ivaPercentageStr, header.margemAlvoStr]);

  function applyMargemToPrices() {
    const alvoBps = parsePercentageInput(header.margemAlvoStr);
    if (alvoBps == null) {
      toast.error("Indica primeiro a margem alvo (%) no metadata.");
      return;
    }
    if (alvoBps >= 10000) {
      toast.error("Margem alvo tem de ser < 100 %.");
      return;
    }
    // Margem (lucro/preço): preço = custo / (1 - margem). Necessária para
    // que (preço − custo) / preço = margem alvo.
    const factor = 10000 / (10000 - alvoBps);
    let semCusto = 0;
    setLinhas((prev) =>
      prev.map((l) => {
        const custo = l.custoInternoStr ? parseCentsInput(l.custoInternoStr) : null;
        if (custo == null || custo <= 0) {
          semCusto += 1;
          return l;
        }
        const novoCents = Math.round(custo * factor);
        return {
          ...l,
          precoClienteStr: (novoCents / 100).toFixed(2).replace(".", ","),
        };
      }),
    );
    if (semCusto > 0) {
      toast.warning(
        `Margem aplicada. ${semCusto} linha(s) sem custo interno foram ignoradas.`,
      );
    } else {
      toast.success("Margem aplicada a todas as linhas com custo interno.");
    }
  }

  function updateLinha(localId: string, patch: Partial<LinhaState>) {
    setLinhas((prev) =>
      prev.map((l) => (l.localId === localId ? { ...l, ...patch } : l)),
    );
  }

  function removeLinha(localId: string) {
    setLinhas((prev) => prev.filter((l) => l.localId !== localId));
  }

  function moveLinha(localId: string, direction: -1 | 1) {
    setLinhas((prev) => {
      const idx = prev.findIndex((l) => l.localId === localId);
      if (idx === -1) return prev;
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function addEmptyLinha() {
    setLinhas((prev) => [...prev, emptyLinha()]);
  }

  function addFromTabela(row: {
    id: string;
    codigo: string;
    categoria: string;
    descricao: string;
    unidade: string;
    precoClienteBaseCents: number;
    custoInternoBaseCents: number | null;
  }) {
    setLinhas((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        categoria: row.categoria,
        descricao: `${row.codigo} — ${row.descricao}`,
        unidade: row.unidade,
        quantidadeStr: "1",
        precoClienteStr: (row.precoClienteBaseCents / 100)
          .toFixed(2)
          .replace(".", ","),
        custoInternoStr:
          row.custoInternoBaseCents == null
            ? ""
            : (row.custoInternoBaseCents / 100).toFixed(2).replace(".", ","),
        origem: "tabela",
        tabelaPrecoId: row.id,
        notas: "",
      },
    ]);
  }

  function handleSave() {
    // Validar linhas com campos obrigatórios não vazios
    for (const l of linhas) {
      if (!l.descricao.trim()) {
        toast.error("Todas as linhas precisam de descrição.");
        return;
      }
      if (parseQuantity(l.quantidadeStr) == null) {
        toast.error(`Quantidade inválida em "${l.descricao}".`);
        return;
      }
      if (parseCentsInput(l.precoClienteStr) == null) {
        toast.error(`Preço cliente inválido em "${l.descricao}".`);
        return;
      }
    }

    // Validação cliente-side: confirma que o IVA digitado é parsável e ≤ 100 %.
    // O servidor faz a conversão definitiva para BPS via schema (parseEuroString
    // × 100). Por isso enviamos a STRING humana (ex.: "23,00"), não o número
    // já em BPS — caso contrário o servidor multiplicaria × 100 outra vez.
    const ivaBpsCheck = parsePercentageInput(header.ivaPercentageStr);
    if (ivaBpsCheck == null) {
      toast.error("IVA inválido.");
      return;
    }
    if (ivaBpsCheck > 10000) {
      toast.error("IVA tem de ser ≤ 100 % (escreve 23, não 2300).");
      return;
    }

    const payload = {
      header: {
        estado: header.estado,
        dataEmissao: header.dataEmissao,
        validadeDias: Number(header.validadeDias),
        ivaPercentagemBps: header.ivaPercentageStr,
        margemAlvoBps: header.margemAlvoStr.trim() === "" ? null : header.margemAlvoStr,
        condicoesPagamento: header.condicoesPagamento,
        observacoes: header.observacoes,
      },
      // Enviamos os valores como STRINGS em €. O server schema (moneyCents)
      // converte uma vez via parseEuroString × 100 → cents. Se enviarmos
      // já em cents (number), o schema multiplica × 100 OUTRA vez e dá
      // valores absurdos (×100 do correcto). Mesmo padrão que IVA fix.
      linhas: linhas.map((l) => ({
        categoria: l.categoria,
        descricao: l.descricao,
        unidade: l.unidade,
        quantidade: parseQuantity(l.quantidadeStr)!,
        precoClienteUnitCents: l.precoClienteStr,
        custoInternoUnitCents: l.custoInternoStr ? l.custoInternoStr : null,
        origem: l.origem,
        tabelaPrecoId: l.tabelaPrecoId,
        notas: l.notas,
      })),
    };

    startSave(async () => {
      const res = await saveOrcamentoAction(orcamento.id, payload);
      if (res.ok) toast.success(res.success);
      else toast.error(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER METADATA */}
      <section className="rounded-md border p-5">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Metadata
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="estado">Estado</Label>
            <Select
              value={header.estado}
              onValueChange={(v) =>
                setHeader({ ...header, estado: v as HeaderState["estado"] })
              }
            >
              <SelectTrigger id="estado" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADO_ORC_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dataEmissao">Data emissão</Label>
            <Input
              id="dataEmissao"
              type="date"
              value={header.dataEmissao}
              onChange={(e) =>
                setHeader({ ...header, dataEmissao: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="validadeDias">Validade (dias)</Label>
            <Input
              id="validadeDias"
              inputMode="numeric"
              value={header.validadeDias}
              onChange={(e) =>
                setHeader({ ...header, validadeDias: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="iva">IVA (%)</Label>
            <Input
              id="iva"
              inputMode="decimal"
              value={header.ivaPercentageStr}
              onChange={(e) =>
                setHeader({ ...header, ivaPercentageStr: e.target.value })
              }
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="margemAlvo">
              Margem alvo (%) <span className="text-xs text-muted-foreground">— opcional</span>
            </Label>
            <Input
              id="margemAlvo"
              inputMode="decimal"
              placeholder="ex.: 30"
              value={header.margemAlvoStr}
              onChange={(e) =>
                setHeader({ ...header, margemAlvoStr: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Usada para comparar com a margem teórica e para o botão &ldquo;Aplicar margem&rdquo;.
            </p>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applyMargemToPrices}
              disabled={!header.margemAlvoStr.trim()}
              title="Recalcula o preço cliente de cada linha a partir do custo interno × (1 + margem alvo)"
            >
              Aplicar margem aos preços
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="condicoesPagamento">Condições de pagamento</Label>
            <Textarea
              id="condicoesPagamento"
              rows={2}
              value={header.condicoesPagamento}
              onChange={(e) =>
                setHeader({ ...header, condicoesPagamento: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              rows={2}
              value={header.observacoes}
              onChange={(e) =>
                setHeader({ ...header, observacoes: e.target.value })
              }
            />
          </div>
        </div>
      </section>

      {/* ADD LINHAS */}
      <section className="flex flex-wrap items-end gap-3 rounded-md border p-4">
        <div className="flex-1 min-w-64">
          <TabelaSearch onSelect={addFromTabela} />
        </div>
        <Button type="button" variant="secondary" onClick={addEmptyLinha}>
          Linha manual
        </Button>
      </section>

      {/* GRID */}
      <section className="rounded-md border overflow-x-auto">
        <Table className="min-w-[1200px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-48 min-w-48">Categoria</TableHead>
              <TableHead className="min-w-[420px]">Descrição</TableHead>
              <TableHead className="w-24">Un.</TableHead>
              <TableHead className="w-24 text-right">Qtd.</TableHead>
              <TableHead className="w-32 text-right">€ Cliente</TableHead>
              <TableHead className="w-32 text-right">€ Custo</TableHead>
              <TableHead className="w-32 text-right">Total €</TableHead>
              <TableHead className="w-24">Origem</TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                  Sem linhas. Adiciona da tabela de preços ou cria uma linha manual.
                </TableCell>
              </TableRow>
            ) : (
              linhas.map((l, i) => {
                const qty = parseQuantity(l.quantidadeStr);
                const preco = parseCentsInput(l.precoClienteStr);
                const rowTotal =
                  qty != null && preco != null ? Math.round(qty * preco) : null;
                return (
                  <TableRow key={l.localId} className="align-top">
                    <TableCell className="pt-3 text-xs text-muted-foreground tabular-nums">
                      {i + 1}
                    </TableCell>
                    <TableCell className="pt-2">
                      <Select
                        value={l.categoria}
                        onValueChange={(v) => updateLinha(l.localId, { categoria: v })}
                      >
                        <SelectTrigger className="w-full whitespace-normal text-left">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIA_OPTIONS.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="pt-2">
                      <Textarea
                        rows={2}
                        value={l.descricao}
                        onChange={(e) => updateLinha(l.localId, { descricao: e.target.value })}
                        className="min-h-[60px] resize-y whitespace-pre-wrap break-words text-sm leading-relaxed"
                      />
                      {l.notas ? (
                        <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                          {l.notas}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="pt-2">
                      <Select
                        value={l.unidade}
                        onValueChange={(v) => updateLinha(l.localId, { unidade: v })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIDADE_OPTIONS.map((u) => (
                            <SelectItem key={u.value} value={u.value}>
                              {u.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="pt-2">
                      <Input
                        className="text-right tabular-nums"
                        inputMode="decimal"
                        value={l.quantidadeStr}
                        onChange={(e) => updateLinha(l.localId, { quantidadeStr: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="pt-2">
                      <Input
                        className="text-right tabular-nums"
                        inputMode="decimal"
                        value={l.precoClienteStr}
                        onChange={(e) => updateLinha(l.localId, { precoClienteStr: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="pt-2">
                      <Input
                        className="text-right tabular-nums"
                        inputMode="decimal"
                        value={l.custoInternoStr}
                        onChange={(e) => updateLinha(l.localId, { custoInternoStr: e.target.value })}
                        placeholder="—"
                      />
                    </TableCell>
                    <TableCell className="pt-3 text-right font-mono tabular-nums">
                      {rowTotal == null ? "—" : formatCents(rowTotal)}
                    </TableCell>
                    <TableCell className="pt-3">
                      <Badge variant={origemVariant[l.origem]}>
                        {origemLabel[l.origem]}
                      </Badge>
                    </TableCell>
                    <TableCell className="pt-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleSuggestPrice(l)}
                          disabled={suggestingId === l.localId}
                          className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-50"
                          aria-label="Sugerir preço com IA"
                          title="Sugerir preço com IA"
                        >
                          <Sparkles
                            aria-hidden
                            className={`size-3.5 ${suggestingId === l.localId ? "animate-pulse" : ""}`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveLinha(l.localId, -1)}
                          className="rounded p-1 text-muted-foreground hover:bg-accent"
                          aria-label="Subir"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveLinha(l.localId, 1)}
                          className="rounded p-1 text-muted-foreground hover:bg-accent"
                          aria-label="Descer"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLinha(l.localId)}
                          className="rounded p-1 text-destructive hover:bg-destructive/10"
                          aria-label="Apagar linha"
                        >
                          ×
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </section>

      {/* TOTALS + SAVE */}
      <section className="sticky bottom-4 z-10 rounded-md border bg-background p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="grid gap-x-10 gap-y-1 text-sm md:grid-cols-2">
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground">Subtotal (s/ IVA)</span>
              <span className="font-mono tabular-nums">{formatCents(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground">Custo interno</span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {formatCents(totals.custoInterno)}
              </span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground">
                IVA ({header.ivaPercentageStr}%)
              </span>
              <span className="font-mono tabular-nums">{formatCents(totals.ivaCents)}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground">
                Margem teórica
                {totals.margemAlvoBps != null ? (
                  <span className="ml-1 text-xs">
                    (alvo {(totals.margemAlvoBps / 100).toFixed(1)}%)
                  </span>
                ) : null}
              </span>
              <span
                className={`font-mono tabular-nums ${
                  totals.margemAlvoBps == null
                    ? "text-muted-foreground"
                    : totals.margemBps >= totals.margemAlvoBps
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                }`}
              >
                {(totals.margemBps / 100).toFixed(1)} %
              </span>
            </div>
            <div className="col-span-2 flex justify-between gap-8 border-t pt-2 text-base font-medium">
              <span>TOTAL c/ IVA</span>
              <span className="font-mono tabular-nums">{formatCents(totals.total)}</span>
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving} size="lg">
            {isSaving ? "A guardar..." : "Guardar orçamento"}
          </Button>
        </div>
      </section>
    </div>
  );
}
