import React, { useState, useMemo } from "react";
import {
  Check,
  RefreshCw,
  AlertCircle,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Minus
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PreviewRow {
  rhm: string;
  projeto: string;
  situacao: string;
  situacaoSistema: string | null;
  tipoAcao: "novo" | "atualizacao" | "sem_alteracao" | "erro_validacao";
  status: "pendente" | "validando" | "atualizando" | "sucesso" | "erro";
  diferenca?: string;
  mensagemErro?: string;
}

interface ImportacaoPreviewTableProps {
  rows: PreviewRow[];
  onConfirm: (selected: PreviewRow[]) => void;
  onCancel: () => void;
  loading: boolean;
  progressMap: Map<string, PreviewRow["status"]>;
}

const TIPO_ACAO_CONFIG = {
  novo: {
    label: "Novo",
    icon: CheckCircle2,
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
    chipClass: "bg-emerald-50 text-emerald-700 border-emerald-100"
  },
  atualizacao: {
    label: "Atualização",
    icon: RefreshCw,
    badgeClass: "bg-blue-50 text-blue-700 border-blue-100",
    chipClass: "bg-blue-50 text-blue-700 border-blue-100"
  },
  sem_alteracao: {
    label: "Sem alteração",
    icon: Minus,
    badgeClass: "bg-gray-50 text-gray-600 border-gray-200",
    chipClass: "bg-gray-50 text-gray-600 border-gray-200"
  },
  erro_validacao: {
    label: "Erro",
    icon: XCircle,
    badgeClass: "bg-red-50 text-red-700 border-red-100",
    chipClass: "bg-red-50 text-red-700 border-red-100"
  },
};

const ROW_STATUS_CONFIG = {
  pendente: { label: "Pendente", icon: Clock, className: "text-gray-400" },
  validando: { label: "Validando", icon: Loader2, className: "text-blue-500" },
  atualizando: { label: "Migrando", icon: Loader2, className: "text-blue-500" },
  sucesso: { label: "Concluído", icon: CheckCircle2, className: "text-emerald-500" },
  erro: { label: "Falhou", icon: AlertCircle, className: "text-red-500" },
};

function labelSituacao(sit: string) {
  if (!sit) return "—";
  return sit.charAt(0).toUpperCase() + sit.slice(1).toLowerCase();
}

export function ImportacaoPreviewTable({
  rows,
  onConfirm,
  onCancel,
  loading,
  progressMap,
}: ImportacaoPreviewTableProps) {
  const [selectedRhms, setSelectedRhms] = useState<Set<string>>(new Set());

  // Simulação de enriquecimento (na vdd já vem pronto do hook)
  const loadingEnrich = false;

  const enriched = useMemo(() => {
    return rows.map((r) => ({
      ...r,
      status: progressMap.get(r.rhm) || r.status || "pendente",
    }));
  }, [rows, progressMap]);

  const displayRows = enriched;

  const counts = useMemo(
    () => ({
      novos: displayRows.filter((r) => r.tipoAcao === "novo").length,
      atualizacoes: displayRows.filter((r) => r.tipoAcao === "atualizacao").length,
      semAlteracao: displayRows.filter((r) => r.tipoAcao === "sem_alteracao").length,
      erros: displayRows.filter((r) => r.tipoAcao === "erro_validacao").length,
      selecionados: selectedRhms.size,
    }),
    [displayRows, selectedRhms],
  );

  const selectableRhms = useMemo(
    () => displayRows.filter((r) => r.tipoAcao !== "erro_validacao").map((r) => r.rhm),
    [displayRows],
  );

  const allSelected =
    selectableRhms.length > 0 && selectableRhms.every((rhm) => selectedRhms.has(rhm));
  const someSelected = selectedRhms.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelectedRhms(new Set());
    } else {
      setSelectedRhms(new Set(selectableRhms));
    }
  }

  function toggleRow(rhm: string) {
    setSelectedRhms((prev) => {
      const next = new Set(prev);
      if (next.has(rhm)) next.delete(rhm);
      else next.add(rhm);
      return next;
    });
  }

  function handleMigrarSelecionados() {
    const selected = enriched.filter((r) => selectedRhms.has(r.rhm));
    onConfirm(selected);
  }

  function handleMigrarTodos() {
    const all = enriched.filter((r) => r.tipoAcao !== "erro_validacao");
    setSelectedRhms(new Set(all.map((r) => r.rhm)));
    onConfirm(all);
  }

  if (loadingEnrich) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-sm text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="font-medium">Comparando com o sistema… aguarde</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Grid de Indicadores ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryChip
          label="Novos"
          count={counts.novos}
          config={TIPO_ACAO_CONFIG.novo}
        />
        <SummaryChip
          label="Atualizações"
          count={counts.atualizacoes}
          config={TIPO_ACAO_CONFIG.atualizacao}
        />
        <SummaryChip
          label="Sem alteração"
          count={counts.semAlteracao}
          config={TIPO_ACAO_CONFIG.sem_alteracao}
        />
        <SummaryChip
          label="Erros"
          count={counts.erros}
          config={TIPO_ACAO_CONFIG.erro_validacao}
        />
      </div>

      {/* ── Tabela ── */}
      <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
          <Table>
            <TableHeader className="sticky top-0 bg-gray-50/90 backdrop-blur-sm z-10 border-b border-gray-100">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-12 text-center">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Selecionar todos"
                    className="translate-y-[2px]"
                  />
                </TableHead>
                <TableHead className="w-24 text-xs font-bold text-gray-500 uppercase tracking-wider"># RHM</TableHead>
                <TableHead className="min-w-[140px] text-xs font-bold text-gray-500 uppercase tracking-wider">Projeto</TableHead>
                <TableHead className="min-w-[130px] text-xs font-bold text-gray-500 uppercase tracking-wider">Planilha</TableHead>
                <TableHead className="min-w-[130px] text-xs font-bold text-gray-500 uppercase tracking-wider">Sistema</TableHead>
                <TableHead className="min-w-[150px] text-xs font-bold text-gray-500 uppercase tracking-wider">Ação</TableHead>
                <TableHead className="min-w-[120px] text-xs font-bold text-gray-500 uppercase tracking-wider">Progresso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.map((row) => {
                const acaoCfg = TIPO_ACAO_CONFIG[row.tipoAcao];
                const statusCfg = ROW_STATUS_CONFIG[row.status];
                const AcaoIcon = acaoCfg.icon;
                const StatusIcon = statusCfg.icon;
                const isSelectable = row.tipoAcao !== "erro_validacao";
                const isSelected = selectedRhms.has(row.rhm);
                const isProcessing = row.status === "validando" || row.status === "atualizando";

                return (
                  <TableRow
                    key={row.rhm}
                    className={cn(
                      "transition-colors border-gray-50",
                      isSelected && "bg-blue-50/30 hover:bg-blue-50/50",
                      !isSelectable && "opacity-60 bg-gray-50/30",
                    )}
                  >
                    <TableCell className="text-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => isSelectable && toggleRow(row.rhm)}
                        disabled={!isSelectable || loading}
                        className="translate-y-[2px]"
                      />
                    </TableCell>

                    <TableCell className="font-mono text-sm font-bold text-gray-700">#{row.rhm}</TableCell>

                    <TableCell className="text-sm font-medium text-gray-600 max-w-[180px] truncate" title={row.projeto}>
                      {row.projeto}
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-50 font-medium px-2 py-0.5 rounded-full text-[10px] uppercase">
                        {labelSituacao(row.situacao)}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {row.situacaoSistema ? (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100 font-medium px-2 py-0.5 rounded-full text-[10px] uppercase">
                          {labelSituacao(row.situacaoSistema)}
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">Inexistente</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] uppercase tracking-wide gap-1.5 px-2.5 py-1 rounded-md font-bold", acaoCfg.badgeClass)}
                      >
                        <AcaoIcon className="h-3 w-3 shrink-0" />
                        {acaoCfg.label}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <span className={cn("flex items-center gap-2 text-xs font-bold uppercase tracking-tight", statusCfg.className)}>
                        <StatusIcon className={cn("h-4 w-4 shrink-0", isProcessing && "animate-spin")} />
                        {statusCfg.label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Footer / Ações ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100 mt-4">
        <div className="flex items-center gap-3">
          <Button
            className="bg-[#1a6fa8] hover:bg-[#1a6fa8]/90 text-white rounded-lg px-6 shadow-sm transition-all active:scale-95"
            onClick={handleMigrarSelecionados}
            disabled={loading || counts.selecionados === 0}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Migrar Selecionados ({counts.selecionados})
          </Button>

          <Button
            variant="outline"
            className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-6 transition-all"
            onClick={handleMigrarTodos}
            disabled={loading || selectableRhms.length === 0}
          >
            Migrar Todos ({selectableRhms.length})
          </Button>

          <Button
            variant="ghost"
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
        </div>

        <div className="bg-gray-50 px-4 py-2 rounded-full border border-gray-100 shadow-inner">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
            {counts.selecionados} de {selectableRhms.length} selecionado(s)
          </span>
        </div>
      </div>
    </div>
  );
}

function SummaryChip({
  label,
  count,
  config,
}: {
  label: string;
  count: number;
  config: any;
}) {
  const Icon = config.icon;
  return (
    <div className={cn("rounded-xl border p-4 transition-all hover:shadow-md", config.chipClass)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-2xl font-black leading-none">{count}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</p>
        </div>
        <Icon className="h-5 w-5 opacity-40 shrink-0" />
      </div>
    </div>
  );
}
