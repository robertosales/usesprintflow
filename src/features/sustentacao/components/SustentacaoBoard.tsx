import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Columns3, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { useDemandas } from "../hooks/useDemandas";
import { useWorkflowSteps } from "../hooks/useWorkflowSteps";
import { DemandaCard } from "./DemandaCard";
import { DemandaDetail } from "./DemandaDetail";
import { JustificativaDialog } from "./JustificativaDialog";
import {
  ALL_SITUACOES,
  SITUACAO_LABELS,
  SITUACAO_COLORS,
  FLOW_PRINCIPAL,
  REQUIRES_JUSTIFICATIVA,
  isDemandaIniciada,
} from "../types/demanda";
import type { Demanda } from "../types/demanda";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { SkeletonList } from "@/shared/components/common/SkeletonList";
import { EmptyState } from "@/shared/components/common/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Colunas fixas do board na ordem correta do fluxo
const BOARD_COLUMNS = [
  "fila_atendimento",
  "planejamento_elaboracao",
  "planejamento_ag_aprovacao",
  "planejamento_aprovada",
  "em_execucao",
  "bloqueada",
  "hom_ag_homologacao",
  "hom_homologada",
  "rejeitada",
  "fila_producao",
  "ag_aceite_final",
  "cancelada",
];

// Cores para cabeçalho das colunas
const COL_COLORS: Record<string, string> = {
  fila_atendimento: "bg-slate-100 text-slate-700 border-slate-300",
  planejamento_elaboracao: "bg-blue-100 text-blue-700 border-blue-300",
  planejamento_ag_aprovacao: "bg-indigo-100 text-indigo-700 border-indigo-300",
  planejamento_aprovada: "bg-violet-100 text-violet-700 border-violet-300",
  em_execucao: "bg-amber-100 text-amber-700 border-amber-300",
  bloqueada: "bg-red-100 text-red-700 border-red-300",
  hom_ag_homologacao: "bg-cyan-100 text-cyan-700 border-cyan-300",
  hom_homologada: "bg-teal-100 text-teal-700 border-teal-300",
  rejeitada: "bg-rose-100 text-rose-800 border-rose-300",
  fila_producao: "bg-orange-100 text-orange-700 border-orange-300",
  ag_aceite_final: "bg-emerald-100 text-emerald-700 border-emerald-300",
  cancelada: "bg-gray-200 text-gray-700 border-gray-300",
};

// Labels curtos para cabeçalho (evita texto longo nas colunas)
const COL_LABELS: Record<string, string> = {
  fila_atendimento: "Fila Atendimento",
  planejamento_elaboracao: "Em Elaboração",
  planejamento_ag_aprovacao: "Ag. Aprovação",
  planejamento_aprovada: "Aprovada p/ Exec",
  em_execucao: "Em Execução",
  bloqueada: "Bloqueada",
  hom_ag_homologacao: "Ag. Homologação",
  hom_homologada: "Homologada",
  rejeitada: "Rejeitada",
  fila_producao: "Fila Produção",
  ag_aceite_final: "Ag. Aceite Final",
  cancelada: "Cancelada",
};

function resolveLabel(status: string): string {
  return COL_LABELS[status] || SITUACAO_LABELS[status] || status;
}

function isForwardMove(demanda: Demanda, targetStatus: string): boolean {
  if (targetStatus === "bloqueada" || targetStatus === "rejeitada") return true;
  if (targetStatus === "cancelada") return true;
  if (demanda.situacao === "rejeitada") return targetStatus === "em_execucao";
  if (demanda.situacao === "bloqueada") return false;

  const flow = Array.from(FLOW_PRINCIPAL);
  const currentIdx = flow.indexOf(demanda.situacao as any);
  const targetIdx = flow.indexOf(targetStatus as any);
  if (currentIdx < 0 || targetIdx < 0) return false;
  return targetIdx > currentIdx;
}

export function SustentacaoBoard() {
  const { demandas, loading, error, moveTo, update, remove, reload } = useDemandas();
  const { steps: workflowSteps, loading: wfLoading } = useWorkflowSteps();

  const [selected, setSelected] = useState<Demanda | null>(null);
  const [selectedInitialTab, setSelectedInitialTab] = useState<string | undefined>(undefined);
  const [pendingMoveTarget, setPendingMoveTarget] = useState<string | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Demanda | null>(null);
  const [justTarget, setJustTarget] = useState<{ demanda: Demanda; status: string } | null>(null);
  const [evidenceTarget, setEvidenceTarget] = useState<{ demanda: Demanda; status: string; missing: string[] } | null>(
    null,
  );
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [evidenceCache, setEvidenceCache] = useState<Record<string, number>>({});

  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterSla, setFilterSla] = useState("all");
  const [filterProjeto, setFilterProjeto] = useState("all");
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (demandas.length === 0) return;
    const ids = demandas.map((d) => d.id);
    supabase
      .from("demanda_evidencias" as any)
      .select("demanda_id, fase")
      .in("demanda_id", ids)
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        (data || []).forEach((row: any) => {
          const key = `${row.demanda_id}:${row.fase}`;
          counts[key] = (counts[key] || 0) + 1;
        });
        setEvidenceCache(counts);
      });
  }, [demandas]);

  const projetos = useMemo(() => [...new Set(demandas.map((d) => d.projeto).filter(Boolean))], [demandas]);

  const filtered = useMemo(
    () =>
      demandas.filter((d) => {
        if (
          debouncedSearch &&
          !d.rhm.toLowerCase().includes(debouncedSearch.toLowerCase()) &&
          !d.projeto.toLowerCase().includes(debouncedSearch.toLowerCase())
        )
          return false;
        if (filterTipo !== "all" && d.tipo !== filterTipo) return false;
        if (filterSla !== "all" && d.sla !== filterSla) return false;
        if (filterProjeto !== "all" && d.projeto !== filterProjeto) return false;
        return true;
      }),
    [demandas, debouncedSearch, filterTipo, filterSla, filterProjeto],
  );

  // Sempre usa BOARD_COLUMNS como base; se o hook retornar steps extras não mapeados, ignora.
  // Isso garante que o board nunca fique vazio por dependência do hook.
  const columns = useMemo(() => {
    if (workflowSteps.length > 0) {
      // Filtra apenas os steps que existem em BOARD_COLUMNS para manter a ordem correta
      const known = new Set(BOARD_COLUMNS);
      const fromHook = workflowSteps.map((s) => s.key).filter((k) => known.has(k));
      // Garante que todos de BOARD_COLUMNS estejam presentes (adiciona os faltantes no fim)
      const extra = BOARD_COLUMNS.filter((c) => !fromHook.includes(c));
      return [...fromHook, ...extra];
    }
    return BOARD_COLUMNS;
  }, [workflowSteps]);

  const toggleColumn = (status: string) =>
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });

  const validateDrop = (demanda: Demanda, targetStatus: string): { error?: string; evidenceMissing?: string[] } => {
    if (demanda.situacao === targetStatus) return {};
    if (!isForwardMove(demanda, targetStatus))
      return { error: "Movimentação não permitida: apenas avanço sequencial é permitido." };
    if (targetStatus === "planejamento_ag_aprovacao") {
      const total = Object.keys(evidenceCache)
        .filter((k) => k.startsWith(`${demanda.id}:`))
        .reduce((sum, k) => sum + (evidenceCache[k] || 0), 0);
      if (total === 0)
        return { evidenceMissing: ["Obrigatório anexar ao menos uma evidência antes de avançar para Ag. Aprovação."] };
    }
    return {};
  };

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("demanda-id");
    const demanda = demandas.find((d) => d.id === id);
    if (!demanda || demanda.situacao === status) return;

    const validation = validateDrop(demanda, status);
    if (validation.error) {
      toast.error(validation.error);
      return;
    }
    if (validation.evidenceMissing) {
      setEvidenceTarget({ demanda, status, missing: validation.evidenceMissing });
      return;
    }
    if ((REQUIRES_JUSTIFICATIVA as readonly string[]).includes(status)) {
      setJustTarget({ demanda, status });
      return;
    }
    await moveTo(demanda, status);
  };

  if (loading || wfLoading) return <SkeletonList count={6} />;
  if (error)
    return (
      <div className="text-center py-10 text-destructive">
        {error}
        <button onClick={reload} className="underline ml-2">
          Tentar novamente
        </button>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">Board Kanban</h2>
          <p className="text-sm text-muted-foreground">
            Exibe todas as demandas. Clique no ícone do cabeçalho para retrair/expandir colunas.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filterProjeto} onValueChange={setFilterProjeto}>
          <SelectTrigger className="w-[150px] h-9 text-xs">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {projetos.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="corretiva">Corretiva</SelectItem>
            <SelectItem value="evolutiva">Evolutiva</SelectItem>
            <SelectItem value="manutencao_corretiva">Manutenção Corretiva</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSla} onValueChange={setFilterSla}>
          <SelectTrigger className="w-[100px] h-9 text-xs">
            <SelectValue placeholder="SLA" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="24x7">24x7</SelectItem>
            <SelectItem value="padrao">Padrão</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por RHM ou projeto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {demandas.length === 0 && !loading && (
        <EmptyState
          icon={Columns3}
          title="Nenhuma demanda encontrada"
          description="Crie uma nova demanda ou ajuste os filtros."
        />
      )}

      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-thin" style={{ minHeight: 400 }}>
        {columns.map((status) => {
          const items = filtered.filter((d) => d.situacao === status);
          const isCollapsed = collapsedColumns.has(status);
          const colColor = COL_COLORS[status] || "bg-slate-100 text-slate-700 border-slate-300";

          return (
            <div
              key={status}
              className={`flex-shrink-0 transition-all duration-300 ease-in-out ${isCollapsed ? "w-[44px]" : "w-[260px]"}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div
                className={`rounded-lg bg-muted/40 border h-full transition-all duration-300 ${isCollapsed ? "p-1" : "p-2"}`}
              >
                {isCollapsed ? (
                  <div
                    className="flex flex-col items-center gap-2 cursor-pointer h-full pt-2"
                    onClick={() => toggleColumn(status)}
                    title={`Expandir: ${resolveLabel(status)}`}
                  >
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Badge className="text-[10px] h-5 min-w-5 flex items-center justify-center bg-info/10 text-info border-info/20">
                      {items.length}
                    </Badge>
                    <span
                      className="text-[11px] font-semibold text-muted-foreground"
                      style={{ writingMode: "vertical-lr", textOrientation: "mixed", whiteSpace: "nowrap" }}
                    >
                      {resolveLabel(status)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2 px-1 gap-1">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <button
                          onClick={() => toggleColumn(status)}
                          className="p-0.5 rounded hover:bg-muted transition-colors shrink-0"
                          title="Retrair coluna"
                        >
                          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border truncate ${colColor}`}>
                          {resolveLabel(status)}
                        </span>
                      </div>
                      <Badge className="text-[10px] h-5 min-w-5 flex items-center justify-center bg-info/10 text-info border-info/20 shrink-0">
                        {items.length}
                      </Badge>
                    </div>
                    <ScrollArea className="max-h-[calc(100vh-280px)]">
                      <div className="space-y-2">
                        {items.map((d) => (
                          <DemandaCard
                            key={d.id}
                            demanda={d}
                            onOpen={(dem) => {
                              setSelectedInitialTab(undefined);
                              setPendingMoveTarget(undefined);
                              setSelected(dem);
                            }}
                            onDelete={setDeleteTarget}
                            draggable
                            onDragStart={(e, dem) => e.dataTransfer.setData("demanda-id", dem.id)}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Arraste os cards para alterar a situação. O sistema valida progressão sequencial e evidências obrigatórias
        automaticamente.
      </p>

      {selected && (
        <div className="fixed inset-0 z-50 bg-background overflow-auto">
          <DemandaDetail
            demanda={demandas.find((d) => d.id === selected.id) || selected}
            onBack={() => {
              setSelected(null);
              setSelectedInitialTab(undefined);
              setPendingMoveTarget(undefined);
              reload();
            }}
            onUpdate={update}
            onMoveTo={moveTo}
            initialTab={selectedInitialTab}
            pendingMoveTarget={pendingMoveTarget}
          />
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            if (isDemandaIniciada(deleteTarget)) {
              toast.error("Demanda já iniciada. Use 'Cancelar Demanda' na tela de detalhes.");
              setDeleteTarget(null);
              return;
            }
            remove(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />

      <JustificativaDialog
        open={!!justTarget}
        onClose={() => setJustTarget(null)}
        onConfirm={async (j) => {
          if (justTarget) {
            await moveTo(justTarget.demanda, justTarget.status, j);
            setJustTarget(null);
          }
        }}
      />

      <Dialog open={!!evidenceTarget} onOpenChange={(o) => !o && setEvidenceTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Evidência Obrigatória Pendente
            </DialogTitle>
            <DialogDescription>
              Para avançar <strong>{evidenceTarget?.demanda.rhm}</strong>, é necessário anexar a(s) evidência(s):
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
            {evidenceTarget?.missing.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEvidenceTarget(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (evidenceTarget) {
                  setSelectedInitialTab("evidencias");
                  setPendingMoveTarget(evidenceTarget.status);
                  setSelected(evidenceTarget.demanda);
                  setEvidenceTarget(null);
                }
              }}
            >
              Abrir Demanda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
