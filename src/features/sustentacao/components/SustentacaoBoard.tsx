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
import { SITUACAO_LABELS, REQUIRES_JUSTIFICATIVA, isDemandaIniciada } from "../types/demanda";
import { FLOW_PRINCIPAL, WORKFLOW_LABELS } from "./DemandaDetail";
import type { Demanda } from "../types/demanda";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { SkeletonList } from "@/shared/components/common/SkeletonList";
import { EmptyState } from "@/shared/components/common/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Colunas fixas do board — novo fluxo de 11 etapas + cancelada
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
] as const;

function resolveLabel(status: string, workflowSteps: { key: string; label: string }[]): string {
  const step = workflowSteps.find(s => s.key === status);
  return step?.label || WORKFLOW_LABELS[status] || SITUACAO_LABELS[status] || status;
}

function isForwardMove(demanda: Demanda, targetStatus: string): boolean {
  if (targetStatus === "bloqueada" || targetStatus === "rejeitada") return true;
  if (demanda.situacao === "rejeitada") return targetStatus === "em_execucao";
  const currentIdx = FLOW_PRINCIPAL.indexOf(demanda.situacao as any);
  const targetIdx  = FLOW_PRINCIPAL.indexOf(targetStatus as any);
  if (currentIdx < 0 || targetIdx < 0) return false;
  return targetIdx > currentIdx;
}

export function SustentacaoBoard() {
  const { demandas, loading, error, moveTo, update, remove, reload } = useDemandas();
  const { steps: workflowSteps, loading: wfLoading } = useWorkflowSteps();

  const [selected,           setSelected]           = useState<Demanda | null>(null);
  const [selectedInitialTab, setSelectedInitialTab] = useState<string | undefined>(undefined);
  const [pendingMoveTarget,  setPendingMoveTarget]  = useState<string | undefined>(undefined);
  const [deleteTarget,       setDeleteTarget]       = useState<Demanda | null>(null);
  const [justTarget,         setJustTarget]         = useState<{ demanda: Demanda; status: string } | null>(null);
  const [evidenceTarget,     setEvidenceTarget]     = useState<{ demanda: Demanda; status: string; missing: string[] } | null>(null);
  const [collapsedColumns,   setCollapsedColumns]   = useState<Set<string>>(new Set());
  const [evidenceCache,      setEvidenceCache]      = useState<Record<string, number>>({});

  const [search,        setSearch]        = useState("");
  const [filterTipo,    setFilterTipo]    = useState("all");
  const [filterSla,     setFilterSla]     = useState("all");
  const [filterProjeto, setFilterProjeto] = useState("all");
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (demandas.length === 0) return;
    const ids = demandas.map(d => d.id);
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

  const projetos = useMemo(
    () => [...new Set(demandas.map(d => d.projeto).filter(Boolean))],
    [demandas],
  );

  const filtered = useMemo(() => {
    return demandas.filter(d => {
      if (
        debouncedSearch &&
        !d.rhm.toLowerCase().includes(debouncedSearch.toLowerCase()) &&
        !d.projeto.toLowerCase().includes(debouncedSearch.toLowerCase())
      ) return false;
      if (filterTipo    !== "all" && d.tipo    !== filterTipo)    return false;
      if (filterSla     !== "all" && d.sla     !== filterSla)     return false;
      if (filterProjeto !== "all" && d.projeto !== filterProjeto) return false;
      return true;
    });
  }, [demandas, debouncedSearch, filterTipo, filterSla, filterProjeto]);

  const columns = useMemo(() => {
    if (workflowSteps.length > 0) return workflowSteps.map(s => s.key);
    return [...BOARD_COLUMNS];
  }, [workflowSteps]);

  const toggleColumn = (status: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status); else next.add(status);
      return next;
    });
  };

  const validateDrop = (
    demanda: Demanda,
    targetStatus: string,
  ): { error?: string; evidenceMissing?: string[] } => {
    if (demanda.situacao === targetStatus) return {};
    if (targetStatus === "bloqueada" || targetStatus === "rejeitada") return {};
    if (!isForwardMove(demanda, targetStatus)) {
      return { error: "Movimentação não permitida: apenas avanço sequencial é permitido." };
    }
    if (targetStatus === "planejamento_ag_aprovacao") {
      const key = `${demanda.id}:${demanda.situacao}`;
      if ((evidenceCache[key] || 0) === 0) {
        return {
          evidenceMissing: [
            "É obrigatório anexar ao menos uma evidência antes de avançar para Ag. Aprovação.",
          ],
        };
      }
    }
    return {};
  };

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("demanda-id");
    const demanda = demandas.find(d => d.id === id);
    if (!demanda || demanda.situacao === status) return;
    const validation = validateDrop(demanda, status);
    if (validation.error) { toast.error(validation.error); return; }
    if (validation.evidenceMissing) {
      setEvidenceTarget({ demanda, status, missing: validation.evidenceMissing });
      return;
    }
    if (REQUIRES_JUSTIFICATIVA.includes(status)) {
      setJustTarget({ demanda, status });
      return;
    }
    await moveTo(demanda, status);
  };

  if (loading || wfLoading) return <SkeletonList count={6} />;
  if (error) return (
    <div className="text-center py-10 text-destructive">
      {error}{" "}
      <button onClick={reload} className="underline ml-2">Tentar novamente</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">Board Kanban</h2>
          <p className="text-sm text-muted-foreground">
            Board único — exibe demandas 