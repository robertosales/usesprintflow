import { useState, useMemo, useCallback, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Columns3, AlertCircle } from "lucide-react";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { useDemandas } from "../hooks/useDemandas";
import { DemandaCard } from "./DemandaCard";
import { DemandaDetail } from "./DemandaDetail";
import { JustificativaDialog } from "./JustificativaDialog";
import { ALL_SITUACOES, SITUACAO_LABELS, REQUIRES_JUSTIFICATIVA, SITUACOES_CORRETIVA, SITUACOES_EVOLUTIVA_PREFIX } from "../types/demanda";
import type { Demanda } from "../types/demanda";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { SkeletonList } from "@/shared/components/common/SkeletonList";
import { EmptyState } from "@/shared/components/common/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { EVIDENCIAS_OBRIGATORIAS } from "../services/evidencias.service";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const BOARD_COLUMNS = ['nova', 'execucao_dev', 'teste', 'aguardando_homologacao'] as const;

function getFlowOrder(demanda: Demanda): string[] {
  if (demanda.tipo === 'evolutiva') {
    return [...SITUACOES_EVOLUTIVA_PREFIX, ...Array.from(SITUACOES_CORRETIVA).slice(1)];
  }
  return [...SITUACOES_CORRETIVA];
}

function isForwardMove(demanda: Demanda, targetStatus: string): boolean {
  const flow = getFlowOrder(demanda);
  const currentIdx = flow.indexOf(demanda.situacao);
  const targetIdx = flow.indexOf(targetStatus);
  if (currentIdx < 0 || targetIdx < 0) return false;
  return targetIdx > currentIdx;
}

export function SustentacaoBoard() {
  const { demandas, loading, error, moveTo, update, remove, reload } = useDemandas();
  const [selected, setSelected] = useState<Demanda | null>(null);
  const [selectedInitialTab, setSelectedInitialTab] = useState<string | undefined>(undefined);
  const [pendingMoveTarget, setPendingMoveTarget] = useState<string | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Demanda | null>(null);
  const [justTarget, setJustTarget] = useState<{ demanda: Demanda; status: string } | null>(null);
  const [evidenceTarget, setEvidenceTarget] = useState<{ demanda: Demanda; status: string; missing: string[] } | null>(null);
  const [showAllColumns, setShowAllColumns] = useState(false);

  // Evidence cache for validation
  const [evidenceCache, setEvidenceCache] = useState<Record<string, number>>({});

  // Filters
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterSla, setFilterSla] = useState('all');
  const [filterProjeto, setFilterProjeto] = useState('all');
  const [filterResponsavel, setFilterResponsavel] = useState('all');
  const debouncedSearch = useDebounce(search, 300);

  // Pre-load evidence counts for all demandas
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

  const projetos = useMemo(() => [...new Set(demandas.map(d => d.projeto).filter(Boolean))], [demandas]);

  const filtered = useMemo(() => {
    return demandas.filter(d => {
      if (debouncedSearch && !d.rhm.toLowerCase().includes(debouncedSearch.toLowerCase()) && !d.projeto.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
      if (filterTipo !== 'all' && d.tipo !== filterTipo) return false;
      if (filterSla !== 'all' && d.sla !== filterSla) return false;
      if (filterProjeto !== 'all' && d.projeto !== filterProjeto) return false;
      return true;
    });
  }, [demandas, debouncedSearch, filterTipo, filterSla, filterProjeto]);

  const columns = showAllColumns ? [...ALL_SITUACOES] : [...BOARD_COLUMNS];

  const validateDrop = (demanda: Demanda, targetStatus: string): { error?: string; evidenceMissing?: string[] } => {
    if (demanda.situacao === targetStatus) return {};

    if (targetStatus === 'bloqueada' || targetStatus === 'aguardando_retorno') {
      return {};
    }

    if (!isForwardMove(demanda, targetStatus)) {
      return { error: `Movimentação não permitida: apenas avanço sequencial é permitido.` };
    }

    const required = EVIDENCIAS_OBRIGATORIAS[demanda.situacao] || [];
    if (required.length > 0) {
      const key = `${demanda.id}:${demanda.situacao}`;
      const count = evidenceCache[key] || 0;
      if (count === 0) {
        return { evidenceMissing: required };
      }
    }

    return {};
  };

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('demanda-id');
    const demanda = demandas.find(d => d.id === id);
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

    if (REQUIRES_JUSTIFICATIVA.includes(status)) {
      setJustTarget({ demanda, status });
      return;
    }
    await moveTo(demanda, status);
  };

  if (loading) return <SkeletonList count={6} />;
  if (error) return <div className="text-center py-10 text-destructive">{error} <button onClick={reload} className="underline ml-2">Tentar novamente</button></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">Board Kanban</h2>
          <p className="text-sm text-muted-foreground">Acompanhe e gerencie as demandas por situação</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${showAllColumns ? 'bg-info/10 text-info border-info/30' : 'text-muted-foreground'}`}
            onClick={() => setShowAllColumns(!showAllColumns)}
          >
            {showAllColumns ? 'Colunas: Expandida' : 'Colunas: Resumida'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterProjeto} onValueChange={setFilterProjeto}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Projeto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {projetos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="corretiva">Corretiva</SelectItem>
            <SelectItem value="evolutiva">Evolutiva</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSla} onValueChange={setFilterSla}>
          <SelectTrigger className="w-[100px] h-9 text-xs"><SelectValue placeholder="SLA" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="24x7">24x7</SelectItem>
            <SelectItem value="padrao">Padrão</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar demanda..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
        </div>
      </div>

      {filtered.length === 0 && !loading && (
        <EmptyState icon={Columns3} title="Nenhuma demanda encontrada" description="Crie uma nova demanda ou ajuste os filtros." />
      )}

      {/* Board columns */}
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
        {columns.map(status => {
          const items = filtered.filter(d => d.situacao === status);
          return (
            <div
              key={status}
              className="flex-shrink-0 w-[260px]"
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, status)}
            >
              <div className="rounded-lg bg-muted/40 border p-2 h-full">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-semibold truncate">{SITUACAO_LABELS[status]}</span>
                  <Badge className="text-[10px] h-5 min-w-5 flex items-center justify-center bg-info/10 text-info border-info/20">{items.length}</Badge>
                </div>
                <ScrollArea className="max-h-[calc(100vh-280px)]">
                  <div className="space-y-2">
                    {items.map(d => (
                      <DemandaCard
                        key={d.id}
                        demanda={d}
                        onOpen={setSelected}
                        onDelete={setDeleteTarget}
                        draggable
                        onDragStart={(e, dem) => e.dataTransfer.setData('demanda-id', dem.id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground text-center">Arraste os cards para alterar a situação. O sistema valida progressão sequencial e evidências obrigatórias automaticamente.</p>

      {selected && (
        <div className="fixed inset-0 z-50 bg-background overflow-auto">
          <DemandaDetail
            demanda={demandas.find(d => d.id === selected.id) || selected}
            onBack={() => { setSelected(null); setSelectedInitialTab(undefined); setPendingMoveTarget(undefined); reload(); }}
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
        onConfirm={() => { if (deleteTarget) { remove(deleteTarget.id); setDeleteTarget(null); } }}
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

      {/* Evidence missing dialog */}
      <Dialog open={!!evidenceTarget} onOpenChange={(o) => !o && setEvidenceTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Evidência Obrigatória Pendente
            </DialogTitle>
            <DialogDescription>
              Para avançar a demanda <strong>{evidenceTarget?.demanda.rhm}</strong> da fase
              {" "}<strong>"{SITUACAO_LABELS[evidenceTarget?.demanda.situacao || '']}"</strong>,
              é necessário anexar a(s) evidência(s) obrigatória(s):
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
            {evidenceTarget?.missing.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEvidenceTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              if (evidenceTarget) {
                setSelectedInitialTab('evidencias');
                setPendingMoveTarget(evidenceTarget.status);
                setSelected(evidenceTarget.demanda);
                setEvidenceTarget(null);
              }
            }}>
              Abrir Demanda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
