import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { useDemandas } from "../hooks/useDemandas";
import { DemandaCard } from "./DemandaCard";
import { DemandaDetail } from "./DemandaDetail";
import { JustificativaDialog } from "./JustificativaDialog";
import { ALL_SITUACOES, SITUACAO_LABELS, REQUIRES_JUSTIFICATIVA } from "../types/demanda";
import type { Demanda } from "../types/demanda";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { SkeletonList } from "@/shared/components/common/SkeletonList";
import { EmptyState } from "@/shared/components/common/EmptyState";
import { Columns3 } from "lucide-react";

// Only show main board columns matching the reference image
const BOARD_COLUMNS = ['nova', 'execucao_dev', 'teste', 'aguardando_homologacao'] as const;

export function SustentacaoBoard() {
  const { demandas, loading, error, moveTo, update, remove, reload } = useDemandas();
  const [selected, setSelected] = useState<Demanda | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Demanda | null>(null);
  const [justTarget, setJustTarget] = useState<{ demanda: Demanda; status: string } | null>(null);
  const [showAllColumns, setShowAllColumns] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterSla, setFilterSla] = useState('all');
  const [filterProjeto, setFilterProjeto] = useState('all');
  const [filterResponsavel, setFilterResponsavel] = useState('all');
  const debouncedSearch = useDebounce(search, 300);

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

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('demanda-id');
    const demanda = demandas.find(d => d.id === id);
    if (!demanda || demanda.situacao === status) return;
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
        <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
          <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Responsável" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
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

      <p className="text-[10px] text-muted-foreground text-center">Arraste os cards para alterar a situação</p>

      <DemandaDetail
        demanda={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onUpdate={update}
        onMoveTo={moveTo}
      />

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
    </div>
  );
}
