import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Columns3, AlertCircle, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
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
  getResponsavelAtivo,
} from "../types/demanda";
import type { Demanda } from "../types/demanda";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { SkeletonList } from "@/shared/components/common/SkeletonList";
import { EmptyState } from "@/shared/components/common/EmptyState";
import {
  fetchProfilesByUserIds,
  fetchDevelopersFallback,
} from "../services/profiles.service";
import { fetchEvidenceCountsByDemandaAndFase } from "../services/workflowSteps.service";
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

const COL_ACCENT: Record<string, string> = {
  fila_atendimento: "border-t-slate-400",
  planejamento_elaboracao: "border-t-blue-400",
  planejamento_ag_aprovacao: "border-t-indigo-400",
  planejamento_aprovada: "border-t-violet-400",
  em_execucao: "border-t-amber-400",
  bloqueada: "border-t-red-400",
  hom_ag_homologacao: "border-t-cyan-400",
  hom_homologada: "border-t-teal-400",
  rejeitada: "border-t-rose-400",
  fila_producao: "border-t-orange-400",
  ag_aceite_final: "border-t-emerald-400",
  cancelada: "border-t-gray-400",
};

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

const SEM_RESPONSAVEL = "__sem_responsavel__";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_RE.test(value));
}

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

// ── Props ──────────────────────────────────────────────────────────────────
interface SustentacaoBoardProps {
  /**
   * Callback chamado quando o usuário clica em "+" em uma coluna.
   * Recebe a situação da coluna para que o pai possa pré-popular o form.
   */
  onCreateDemanda?: (situacaoInicial?: string) => void;
}

export function SustentacaoBoard({ onCreateDemanda }: SustentacaoBoardProps) {
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
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterSla, setFilterSla] = useState("all");
  const [filterProjeto, setFilterProjeto] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [profilesMap, setProfilesMap] = useState<Map<string, string>>(new Map());
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (demandas.length === 0) return;
    const ids = demandas.map((d) => d.id);
    fetchEvidenceCountsByDemandaAndFase(ids).then(setEvidenceCache);
  }, [demandas]);

  // Coleta somente o responsável ativo/principal de cada demanda.
  const teamMembers = useMemo(() => {
    const keys = new Set<string>();
    demandas.forEach((d) => {
      const responsavel = getResponsavelAtivo(d);
      if (responsavel) keys.add(responsavel);
    });
    return Array.from(keys);
  }, [demandas]);

  useEffect(() => {
    const missing = teamMembers.filter((id) => isUuid(id) && !profilesMap.has(id));
    if (missing.length === 0) return;
    (async () => {
      const next = new Map(profilesMap);
      // 1) Profiles — pode estar bloqueado por RLS para usuários de outros times
      const profMap = await fetchProfilesByUserIds(missing);
      profMap.forEach((p, id) => {
        if (p.display_name) next.set(id, p.display_name);
      });
      // 2) Fallback: developers — cobre IDs ocultos pelo RLS
      const stillMissing = missing.filter((id) => !next.has(id));
      if (stillMissing.length > 0) {
        const devMap = await fetchDevelopersFallback(stillMissing);
        devMap.forEach((name, id) => next.set(id, name));
      }
      setProfilesMap(next);
    })();
  }, [teamMembers]);

  const getInitials = (name: string) => {
    if (!name || name === "...") return "?";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const memberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    demandas.forEach((d) => {
      const responsavel = getResponsavelAtivo(d) || SEM_RESPONSAVEL;
      counts[responsavel] = (counts[responsavel] || 0) + 1;
    });
    return counts;
  }, [demandas]);

  const assigneeOptions = useMemo(() => {
    const options = teamMembers.map((id) => ({
      id,
      name: profilesMap.get(id) || id,
      count: memberCounts[id] || 0,
      unassigned: false,
    }));

    if (memberCounts[SEM_RESPONSAVEL]) {
      options.push({
        id: SEM_RESPONSAVEL,
        name: "Sem responsável",
        count: memberCounts[SEM_RESPONSAVEL],
        unassigned: true,
      });
    }

    return options.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [teamMembers, profilesMap, memberCounts]);

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
        if (assigneeFilter !== "all") {
          const responsavel = getResponsavelAtivo(d) || SEM_RESPONSAVEL;
          if (responsavel !== assigneeFilter) return false;
        }
        return true;
      }),
    [demandas, debouncedSearch, filterTipo, filterSla, filterProjeto, assigneeFilter],
  );

  const columns = useMemo(() => {
    if (workflowSteps.length > 0) {
      const known = new Set(BOARD_COLUMNS);
      const fromHook = workflowSteps.map((s) => s.key).filter((k) => known.has(k));
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
    setDragOverColumn(null);
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

  // Reuso da mesma validação para o "Mover para" do menu de contexto (botão direito).
  const handleContextMove = async (demanda: Demanda, status: string) => {
    if (demanda.situacao === status) return;
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

  const moveOptions = useMemo(
    () => columns.map((c) => ({ key: c, label: resolveLabel(c) })),
    [columns],
  );

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
      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">Board Kanban</h2>
          <p className="text-xs text-muted-foreground">
            Clique no ícone do cabeçalho para retrair/expandir colunas. Arraste para mover demandas.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {filtered.length} demanda{filtered.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border">
        <Select value={filterProjeto} onValueChange={setFilterProjeto}>
          <SelectTrigger className="w-[150px] h-8 text-xs bg-background">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos projetos</SelectItem>
            {projetos.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por RHM ou projeto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* ── Time (filtro por responsável) ── */}
      {assigneeOptions.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap p-3 bg-muted/20 rounded-lg border border-border/40">
          <span className="text-xs text-muted-foreground shrink-0 font-medium">Time:</span>
          <div className="flex items-center gap-2 flex-wrap">
            {assigneeOptions.map(({ id, name, count, unassigned }) => {
              const isActive = assigneeFilter === id;
              return (
                <button
                  key={id}
                  onClick={() => setAssigneeFilter(isActive ? "all" : id)}
                  title={`${name} — ${count} demanda${count !== 1 ? "s" : ""}`}
                  className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all border
                    ${isActive ? "bg-primary/10 border-primary shadow-sm scale-105" : "border-transparent hover:bg-muted hover:border-border"}`}
                >
                  <div
                    className={`h-7 w-7 rounded-full text-[11px] font-bold flex items-center justify-center transition-all
                    ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    {unassigned ? "?" : getInitials(name)}
                  </div>
                  <span className="text-[9px] font-medium leading-none text-muted-foreground">
                    {count}
                  </span>
                </button>
              );
            })}
            {assigneeFilter !== "all" && (
              <button
                onClick={() => setAssigneeFilter("all")}
                className="h-6 w-6 rounded-full bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                title="Limpar filtro de responsável"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {demandas.length === 0 && !loading && (
        <EmptyState
          icon={Columns3}
          title="Nenhuma demanda encontrada"
          description="Crie uma nova demanda ou ajuste os filtros."
        />
      )}

      {/* ── Board ─────────────────────────────────────────────────────────────
          Rolagem horizontal no board. Cada coluna tem scroll vertical próprio,
          então o board em si não precisa de overflow-y.
      ──────────────────────────────────────────────────────────────────────── */}
      <div className="flex gap-3 pb-4 overflow-x-auto" style={{ minHeight: 120 }}>
        {columns.map((status) => {
          const items = filtered.filter((d) => d.situacao === status);
          const isCollapsed = collapsedColumns.has(status);
          const colColor = COL_COLORS[status] || "bg-slate-100 text-slate-700 border-slate-300";
          const accentBorder = COL_ACCENT[status] || "border-t-slate-400";
          const isDragOver = dragOverColumn === status;

          return (
            <div
              key={status}
              className={`flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out ${
                isCollapsed ? "w-[56px]" : "w-[300px]"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumn(status);
              }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div
                className={`
                  flex flex-col rounded-xl border bg-muted/30 transition-all duration-200 shadow-sm
                  border-t-2 ${accentBorder}
                  ${isDragOver ? "ring-2 ring-info/40 bg-info/5" : ""}
                  ${isCollapsed ? "p-1 items-center" : "p-3"}
                `}
              >
                {isCollapsed ? (
                  /* ── Coluna retraída ── */
                  <div
                    className="flex flex-col items-center gap-2 cursor-pointer py-3"
                    onClick={() => toggleColumn(status)}
                    title={`Expandir: ${resolveLabel(status)}`}
                  >
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Badge className="text-[11px] h-5 min-w-5 flex items-center justify-center bg-info/10 text-info border-info/20">
                      {items.length}
                    </Badge>
                    <span
                      className="text-[11px] font-semibold text-muted-foreground mt-1"
                      style={{ writingMode: "vertical-lr", textOrientation: "mixed", whiteSpace: "nowrap" }}
                    >
                      {resolveLabel(status)}
                    </span>
                  </div>
                ) : (
                  /* ── Coluna expandida ── */
                  <>
                    {/* Cabeçalho da coluna */}
                    <div className="flex items-center justify-between mb-3 px-0.5 gap-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <button
                          onClick={() => toggleColumn(status)}
                          className="p-0.5 rounded hover:bg-muted transition-colors shrink-0"
                          title="Retrair coluna"
                        >
                          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border truncate ${colColor}`}>
                          {resolveLabel(status)}
                        </span>
                      </div>

                      {/* Contador + botão "+" estilo GitLab */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onCreateDemanda?.(status)}
                          className="p-1 rounded hover:bg-muted transition-colors"
                          title={`Nova demanda em "${resolveLabel(status)}"`}
                        >
                          <Plus className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                        </button>
                        <Badge className="text-xs h-5 min-w-[22px] flex items-center justify-center bg-background border shadow-sm text-foreground">
                          {items.length}
                        </Badge>
                      </div>
                    </div>

                    {/* Lista de cards com scroll vertical interno por coluna */}
                    <div
                      className="flex flex-col gap-3 overflow-y-auto pr-0.5"
                      style={{ maxHeight: "calc(100vh - 260px)" }}
                    >
                      {items.length === 0 ? (
                        <div
                          className={`
                            flex items-center justify-center h-20 rounded-lg border-2 border-dashed text-sm text-muted-foreground
                            transition-colors duration-150
                            ${isDragOver ? "border-info/50 bg-info/5 text-info" : "border-border/50"}
                          `}
                        >
                          {isDragOver ? "Soltar aqui" : "Vazio"}
                        </div>
                      ) : (
                        items.map((d) => (
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
                            moveOptions={moveOptions}
                            onMove={handleContextMove}
                          />
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground text-center pb-2">
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
