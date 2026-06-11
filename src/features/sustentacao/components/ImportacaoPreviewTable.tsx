/**
 * ImportacaoPreviewTable — redesign UX/UI sênior
 *
 * Layout refatorado: topbar, summary cards com accent bar, toolbar de filtros/busca,
 * tabela com ID chip + dot badges, paginação no rodapé.
 * Lógica de negócio (enriquecimento, seleção, migração) mantida intacta.
 */

import { useState, useMemo, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2, XCircle, RefreshCw, PlusCircle,
  MinusCircle, Clock, Loader2, ChevronLeft, ChevronRight,
  Search, ArrowLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// ─── Tipos ───────────────────────────────────────────────────────────────

export interface PreviewRow {
  rhm:                        string;
  projeto:                    string;
  teamId:                     string;
  /** UUID de public.projects — resolvido na leitura do arquivo para gravar a FK */
  projectId?:                 string | null;
  situacao?:                  string;
  tipo:                       string;
  sla?:                       string;
  descricao?:                 string;
  data_previsao_encerramento?: string;
  prazo_inicio_atendimento?:  string;
  prazo_solucao?:             string;
  tipo_defeito?:              string;
  originada_diagnostico?:     boolean;
}

export type RowStatus =
  | "pendente" | "validando" | "atualizando"
  | "criado"   | "atualizado" | "ignorado" | "erro";

export type TipoAcao = "novo" | "atualizacao" | "sem_alteracao" | "erro_validacao";

interface SystemRecord { situacao: string; }

interface EnrichedRow extends PreviewRow {
  situacaoSistema: string | null;
  tipoAcao:        TipoAcao;
  diferenca:       string | null;
  status:          RowStatus;
}

// ─── Labels ───────────────────────────────────────────────────────────────

const SITUACAO_LABELS: Record<string, string> = {
  fila_atendimento:          "Fila Atendimento",
  planejamento_elaboracao:   "Em Elaboração",
  planejamento_ag_aprovacao: "Ag. Aprovação",
  planejamento_aprovada:     "Aprovada p/ Exec",
  em_execucao:               "Em Execução",
  bloqueada:                 "Bloqueada",
  hom_ag_homologacao:        "Ag. Homologação",
  hom_homologada:            "Homologada",
  rejeitada:                 "Rejeitada",
  fila_producao:             "Fila Produção",
  ag_aceite_final:           "Ag. Aceite Final",
  cancelada:                 "Cancelada",
  fila_concluida:            "Concluída",
};

function labelSituacao(s: string | null | undefined): string {
  if (!s) return "—";
  return SITUACAO_LABELS[s] ?? s;
}

// ─── Config de badges ─────────────────────────────────────────────────────

const TIPO_ACAO_CONFIG: Record<
  TipoAcao,
  { label: string; icon: React.ElementType; dot: string; pill: string }
> = {
  novo:           { label: "Novo",              icon: PlusCircle,  dot: "bg-emerald-500", pill: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  atualizacao:    { label: "Atualizar situação", icon: RefreshCw,   dot: "bg-sky-500",     pill: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20" },
  sem_alteracao:  { label: "Sem alteração",      icon: MinusCircle, dot: "bg-muted-foreground/40", pill: "bg-muted text-muted-foreground border-border" },
  erro_validacao: { label: "Erro",               icon: XCircle,     dot: "bg-destructive", pill: "bg-destructive/10 text-destructive border-destructive/20" },
};

const ROW_STATUS_CONFIG: Record<
  RowStatus,
  { label: string; icon: React.ElementType; cls: string }
> = {
  pendente:    { label: "Pendente",   icon: Clock,        cls: "text-amber-600 dark:text-amber-400" },
  validando:   { label: "Validando…", icon: Loader2,      cls: "text-amber-500 dark:text-amber-400" },
  atualizando: { label: "Migrando…",  icon: Loader2,      cls: "text-sky-500 dark:text-sky-400" },
  criado:      { label: "Criado",     icon: CheckCircle2, cls: "text-emerald-600 dark:text-emerald-400" },
  atualizado:  { label: "Atualizado", icon: CheckCircle2, cls: "text-sky-600 dark:text-sky-400" },
  ignorado:    { label: "Ignorado",   icon: MinusCircle,  cls: "text-muted-foreground" },
  erro:        { label: "Erro",       icon: XCircle,      cls: "text-destructive" },
};

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
type PageSize = typeof PAGE_SIZE_OPTIONS[number];

// ─── Filtros ──────────────────────────────────────────────────────────────

type FilterAcao = "todos" | TipoAcao;

const FILTER_OPTIONS: { key: FilterAcao; label: string }[] = [
  { key: "todos",         label: "Todos" },
  { key: "novo",          label: "Novos" },
  { key: "atualizacao",   label: "Atualizações" },
  { key: "sem_alteracao", label: "Sem alteração" },
  { key: "erro_validacao",label: "Erros" },
];

// ─── Props ────────────────────────────────────────────────────────────────

interface Props {
  rows:         PreviewRow[];
  onConfirm:    (selected: PreviewRow[]) => void;
  onCancel:     () => void;
  loading:      boolean;
  progressMap?: Map<string, RowStatus>;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ImportacaoPreviewTable({
  rows, onConfirm, onCancel, loading, progressMap = new Map(),
}: Props) {
  const [enriched,      setEnriched]      = useState<EnrichedRow[]>([]);
  const [loadingEnrich, setLoadingEnrich] = useState(true);
  const [selectedRhms,  setSelectedRhms]  = useState<Set<string>>(new Set());

  // ─── Filtros / busca ────────────────────────────────────────────────────
  const [searchQuery,  setSearchQuery]  = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterAcao>("todos");

  // ─── Paginação ──────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState<PageSize>(20);

  // ─── Enriquecimento (compara com BD) ────────────────────────────────────

  useEffect(() => {
    if (rows.length === 0) { setLoadingEnrich(false); return; }
    async function enrich() {
      setLoadingEnrich(true);
      try {
        const byTeam = new Map<string, string[]>();
        for (const row of rows) {
          const list = byTeam.get(row.teamId) ?? [];
          list.push(row.rhm);
          byTeam.set(row.teamId, list);
        }
        const systemMap = new Map<string, SystemRecord>();
        for (const [teamId, rhms] of byTeam) {
          const { data } = await supabase
            .from("demandas" as any)
            .select("rhm, situacao")
            .eq("team_id", teamId)
            .in("rhm", rhms);
          if (data) for (const d of data as any[])
            systemMap.set(`${teamId}:${d.rhm}`, { situacao: d.situacao });
        }
        const result: EnrichedRow[] = rows.map((row) => {
          const sys = systemMap.get(`${row.teamId}:${row.rhm}`) ?? null;
          let tipoAcao: TipoAcao;
          let diferenca: string | null = null;
          if (!sys) {
            tipoAcao = "novo";
          } else if (sys.situacao !== row.situacao) {
            tipoAcao  = "atualizacao";
            diferenca = `"${labelSituacao(sys.situacao)}" → "${labelSituacao(row.situacao)}"`;
          } else {
            tipoAcao = "sem_alteracao";
          }
          return { ...row, situacaoSistema: sys?.situacao ?? null, tipoAcao, diferenca, status: "pendente" };
        });
        setEnriched(result);
        setSelectedRhms(new Set(
          result
            .filter((r) => r.tipoAcao === "novo" || r.tipoAcao === "atualizacao")
            .map((r) => r.rhm),
        ));
        setCurrentPage(1);
      } finally { setLoadingEnrich(false); }
    }
    enrich();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const displayRows = useMemo(
    () => enriched.map((r) => ({ ...r, status: progressMap.get(r.rhm) ?? r.status })),
    [enriched, progressMap],
  );

  // ─── Filtragem + busca ──────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let result = displayRows;
    if (activeFilter !== "todos") result = result.filter((r) => r.tipoAcao === activeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase().replace(/^#/, "");
      result = result.filter(
        (r) => r.rhm.toLowerCase().includes(q) || r.projeto.toLowerCase().includes(q),
      );
    }
    return result;
  }, [displayRows, activeFilter, searchQuery]);

  // ─── Paginação derivada ──────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage   = Math.min(currentPage, totalPages);
  const pagedRows  = useMemo(
    () => filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredRows, safePage, pageSize],
  );

  const counts = useMemo(() => ({
    novos:        displayRows.filter((r) => r.tipoAcao === "novo").length,
    atualizacoes: displayRows.filter((r) => r.tipoAcao === "atualizacao").length,
    semAlteracao: displayRows.filter((r) => r.tipoAcao === "sem_alteracao").length,
    erros:        displayRows.filter((r) => r.tipoAcao === "erro_validacao").length,
    selecionados: selectedRhms.size,
  }), [displayRows, selectedRhms]);

  const selectableRhms = useMemo(
    () => displayRows.filter((r) => r.tipoAcao !== "erro_validacao").map((r) => r.rhm),
    [displayRows],
  );

  const allSelected  = selectableRhms.length > 0 && selectableRhms.every((r) => selectedRhms.has(r));
  const someSelected = selectedRhms.size > 0 && !allSelected;

  function toggleAll() {
    setSelectedRhms(allSelected ? new Set() : new Set(selectableRhms));
  }
  function toggleRow(rhm: string) {
    setSelectedRhms((prev) => {
      const next = new Set(prev);
      if (next.has(rhm)) next.delete(rhm); else next.add(rhm);
      return next;
    });
  }
  function handleMigrarSelecionados() {
    onConfirm(enriched.filter((r) => selectedRhms.has(r.rhm)));
  }
  function handleMigrarTodos() {
    const all = enriched.filter((r) => r.tipoAcao !== "erro_validacao");
    setSelectedRhms(new Set(all.map((r) => r.rhm)));
    onConfirm(all);
  }
  function handlePageSizeChange(size: PageSize) {
    setPageSize(size);
    setCurrentPage(1);
  }
  function handleFilterChange(f: FilterAcao) {
    setActiveFilter(f);
    setCurrentPage(1);
  }

  // ─── Loading state ──────────────────────────────────────────────────────

  if (loadingEnrich) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        <p className="text-sm text-muted-foreground font-medium">Comparando com o sistema…</p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-0 bg-background">

      {/* ════════════════════════════════════════
          TOPBAR
      ════════════════════════════════════════ */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-border bg-card sticky top-0 z-20">
        {/* Breadcrumb + meta */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5 text-sm">
            <button
              onClick={onCancel}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Sustentação</span>
            </button>
            <span className="text-muted-foreground/50">/</span>
            <span className="font-semibold text-foreground">Prévia da Importação</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {displayRows.length} registros detectados · processado agora
          </p>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-4 text-sm rounded-lg"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="h-8 px-4 text-sm rounded-lg bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-semibold"
            onClick={handleMigrarSelecionados}
            disabled={loading || counts.selecionados === 0}
          >
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Migrando…</>
            ) : (
              `✓  Confirmar (${counts.selecionados})`
            )}
          </Button>
        </div>
      </div>

      {/* ════════════════════════════════════════
          SUMMARY CARDS
      ════════════════════════════════════════ */}
      <div className="grid grid-cols-4 gap-3 px-6 pt-5 pb-4">
        <SummaryCard
          count={counts.novos}
          label="Novos"
          sub="registros a criar"
          accentColor="bg-emerald-500"
          cardCls="bg-emerald-500/5 border-emerald-500/20"
          valueCls="text-emerald-600 dark:text-emerald-400"
          subCls="text-emerald-600/60 dark:text-emerald-400/60"
        />
        <SummaryCard
          count={counts.atualizacoes}
          label="Atualizações"
          sub="situação a alterar"
          accentColor="bg-sky-500"
          cardCls="bg-sky-500/5 border-sky-500/20"
          valueCls="text-sky-600 dark:text-sky-400"
          subCls="text-sky-600/60 dark:text-sky-400/60"
        />
        <SummaryCard
          count={counts.semAlteracao}
          label="Sem alteração"
          sub="situação já idêntica"
          accentColor="bg-muted-foreground/30"
          cardCls="bg-muted/50 border-border"
          valueCls="text-muted-foreground"
          subCls="text-muted-foreground/60"
        />
        <SummaryCard
          count={counts.erros}
          label="Erros"
          sub="nenhum erro crítico"
          accentColor="bg-destructive"
          cardCls="bg-destructive/5 border-destructive/20"
          valueCls="text-destructive"
          subCls="text-destructive/60"
        />
      </div>

      {/* ════════════════════════════════════════
          TOOLBAR (busca + filtros + contador)
      ════════════════════════════════════════ */}
      <div className="flex items-center gap-3 px-6 pb-3 flex-wrap">
        {/* Busca */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Buscar #ID, projeto…"
            className="pl-8 h-8 text-sm rounded-lg bg-muted/40 border-border focus-visible:ring-teal-500"
          />
        </div>

        {/* Pills de filtro */}
        <div className="flex items-center gap-1.5">
          {FILTER_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleFilterChange(key)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border font-medium transition-colors",
                activeFilter === key
                  ? "bg-teal-600 text-white border-teal-600 dark:bg-teal-500 dark:border-teal-500"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Contador à direita */}
        <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
          Exibindo <strong>{filteredRows.length}</strong> de <strong>{displayRows.length}</strong> registros
          {counts.selecionados > 0 && (
            <> · <strong className="text-teal-600 dark:text-teal-400">{counts.selecionados} selecionado(s)</strong></>
          )}
        </span>
      </div>

      {/* ════════════════════════════════════════
          TABELA
      ════════════════════════════════════════ */}
      <div className="flex-1 overflow-x-auto border-t border-border">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/60 border-b border-border hover:bg-muted/60">
              <TableHead className="w-10 pl-5 py-3">
                <Checkbox
                  checked={allSelected}
                  data-state={someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"}
                  onCheckedChange={toggleAll}
                  aria-label={`Selecionar todos (${selectableRhms.length})`}
                />
              </TableHead>
              <TableHead className="w-[100px] text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-3">#ID</TableHead>
              <TableHead className="w-[200px] text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Projeto</TableHead>
              <TableHead className="w-[150px] text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status Planilha</TableHead>
              <TableHead className="w-[150px] text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status Sistema</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Resultado da Migração</TableHead>
              <TableHead className="w-[140px] text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ação</TableHead>
              <TableHead className="w-[120px] text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pr-5">Progresso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-sm text-muted-foreground">
                  Nenhum registro encontrado para os filtros aplicados.
                </TableCell>
              </TableRow>
            )}
            {pagedRows.map((row, i) => {
              const acfg         = TIPO_ACAO_CONFIG[row.tipoAcao];
              const scfg         = ROW_STATUS_CONFIG[row.status];
              const AIcon        = acfg.icon;
              const SIcon        = scfg.icon;
              const isSelectable = row.tipoAcao !== "erro_validacao";
              const isSelected   = selectedRhms.has(row.rhm);
              const isProcessing = row.status === "validando" || row.status === "atualizando";

              return (
                <TableRow
                  key={row.rhm}
                  className={cn(
                    "border-b border-border/50 transition-colors group",
                    i % 2 === 1 && "bg-muted/20",
                    isSelected    && "bg-teal-500/5 dark:bg-teal-500/10",
                    !isSelectable && "opacity-50",
                    row.tipoAcao === "atualizacao" && "border-l-2 border-l-amber-400 dark:border-l-amber-500",
                    isSelected && row.tipoAcao !== "atualizacao" && "border-l-2 border-l-teal-500",
                  )}
                >
                  {/* Checkbox */}
                  <TableCell className="pl-5 py-3.5">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => isSelectable && toggleRow(row.rhm)}
                      disabled={!isSelectable || loading}
                    />
                  </TableCell>

                  {/* ID Chip */}
                  <TableCell className="py-3.5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted border border-border font-mono text-xs font-semibold text-foreground">
                      #{row.rhm}
                    </span>
                  </TableCell>

                  {/* Projeto (2 linhas) */}
                  <TableCell className="py-3.5">
                    <p className="text-sm font-medium text-foreground truncate leading-tight" title={row.projeto}>
                      {row.projeto}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{row.tipo}</p>
                  </TableCell>

                  {/* Status Planilha — dot + label */}
                  <TableCell className="py-3.5">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      {labelSituacao(row.situacao)}
                    </span>
                  </TableCell>

                  {/* Status Sistema — dot + label */}
                  <TableCell className="py-3.5">
                    {row.situacaoSistema ? (
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                        {labelSituacao(row.situacaoSistema)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Não existe</span>
                    )}
                  </TableCell>

                  {/* Resultado da Migração */}
                  <TableCell className="text-xs py-3.5 pr-2">
                    {row.tipoAcao === "atualizacao" ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground font-medium">
                          {labelSituacao(row.situacaoSistema)}
                        </span>
                        <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">→</span>
                        <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-semibold">
                          {labelSituacao(row.situacao)}
                        </span>
                      </div>
                    ) : row.tipoAcao === "novo" ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">Criado com:</span>
                        <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold">
                          {labelSituacao(row.situacao)}
                        </span>
                      </span>
                    ) : row.tipoAcao === "sem_alteracao" ? (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <span className="text-[10px] uppercase tracking-wide">Mantida:</span>
                        <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border font-medium">
                          {labelSituacao(row.situacao)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Ação */}
                  <TableCell className="py-3.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] px-2.5 py-1 rounded-full border font-medium",
                        acfg.pill,
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", acfg.dot)} />
                      {acfg.label}
                    </Badge>
                  </TableCell>

                  {/* Progresso */}
                  <TableCell className="py-3.5 pr-5">
                    <span className={cn(
                      "flex items-center gap-1.5 text-xs font-medium whitespace-nowrap",
                      scfg.cls,
                    )}>
                      <SIcon className={cn("h-3.5 w-3.5 shrink-0", isProcessing && "animate-spin")} />
                      {scfg.label}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ════════════════════════════════════════
          RODAPÉ — legenda + paginação + ações
      ════════════════════════════════════════ */}
      <div className="border-t border-border bg-muted/10">

        {/* Legenda */}
        {counts.atualizacoes > 0 && (
          <div className="px-6 pt-2.5 pb-1">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-3.5 rounded-sm bg-amber-400 dark:bg-amber-500 shrink-0" />
              Linhas destacadas terão a situação do sistema substituída pela situação da planilha.
            </p>
          </div>
        )}

        {/* Paginação */}
        {displayRows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5">
            {/* Por página + range */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                Mostrando <strong>{(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredRows.length)}</strong> de <strong>{filteredRows.length}</strong>
              </span>
              <div className="flex items-center gap-1 border-l border-border pl-3">
                <span className="text-xs text-muted-foreground">Por página:</span>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <button
                    key={size}
                    onClick={() => handlePageSizeChange(size)}
                    className={cn(
                      "text-xs px-2 py-0.5 rounded transition-colors",
                      pageSize === size
                        ? "bg-teal-600 text-white font-semibold dark:bg-teal-500"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Navegação numérica */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Anterior
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = totalPages <= 5 ? i + 1
                  : safePage <= 3 ? i + 1
                  : safePage >= totalPages - 2 ? totalPages - 4 + i
                  : safePage - 2 + i;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "text-xs w-8 h-7 rounded-md border transition-colors font-medium",
                      safePage === page
                        ? "bg-teal-600 text-white border-teal-600 dark:bg-teal-500 dark:border-teal-500"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
                    )}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Próximo <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Ações de migração */}
        <div className="flex flex-wrap items-center gap-2 px-6 pb-4 pt-1 border-t border-border/50">
          <Button
            className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white h-8 px-4 rounded-lg text-sm font-semibold"
            onClick={handleMigrarSelecionados}
            disabled={loading || counts.selecionados === 0}
          >
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Migrando…</>
            ) : (
              `Migrar Selecionados (${counts.selecionados})`
            )}
          </Button>

          <Button
            variant="outline"
            className="h-8 px-4 rounded-lg text-sm font-medium"
            onClick={handleMigrarTodos}
            disabled={loading || selectableRhms.length === 0}
          >
            Migrar Todos ({selectableRhms.length})
          </Button>

          <p className="ml-auto text-[11px] text-muted-foreground italic hidden sm:block">
            A planilha é a fonte oficial. Em divergência, a situação do sistema é sobrescrita.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── SummaryCard ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  count:       number;
  label:       string;
  sub:         string;
  accentColor: string;
  cardCls:     string;
  valueCls:    string;
  subCls:      string;
}

function SummaryCard({ count, label, sub, accentColor, cardCls, valueCls, subCls }: SummaryCardProps) {
  return (
    <div className={cn("relative h-24 rounded-xl border flex flex-col justify-center pl-7 pr-4 overflow-hidden", cardCls)}>
      {/* Accent bar lateral */}
      <span className={cn("absolute left-0 inset-y-0 w-1 rounded-l-xl", accentColor)} />
      <p className={cn("text-3xl font-bold leading-none tabular-nums", valueCls)}>{count}</p>
      <p className="text-[12px] font-semibold text-foreground mt-2 leading-tight">{label}</p>
      <p className={cn("text-[10px] mt-0.5 leading-tight", subCls)}>{sub}</p>
    </div>
  );
}
