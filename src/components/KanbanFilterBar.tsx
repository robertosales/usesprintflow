import { useState, useMemo } from "react";
import { X, BookmarkPlus, ChevronDown, SlidersHorizontal } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface KanbanFiltros {
  membro: string;     // "all" | developer.id
  tipo: string;       // "all" | story type
  prioridade: string; // "all" | priority
  status: string;     // "all" | column key
}

export const KANBAN_FILTROS_DEFAULT: KanbanFiltros = {
  membro: "all",
  tipo: "all",
  prioridade: "all",
  status: "all",
};

export interface KanbanViewSalva {
  id: string;
  label: string;
  icon: string;
  filtros: KanbanFiltros;
}

const VIEWS_BUILTIN: KanbanViewSalva[] = [
  { id: "meus",       label: "Meus cards",   icon: "👤", filtros: { ...KANBAN_FILTROS_DEFAULT } },
  { id: "bugs",       label: "Bugs",         icon: "🐛", filtros: { ...KANBAN_FILTROS_DEFAULT, tipo: "bug" } },
  { id: "alta_prio",  label: "Alta Prior.",  icon: "🔥", filtros: { ...KANBAN_FILTROS_DEFAULT, prioridade: "alta" } },
  { id: "em_exec",    label: "Em Execução",  icon: "⚡",   filtros: { ...KANBAN_FILTROS_DEFAULT, status: "in_progress" } },
];

const LS_KEY = "kanban_views_salvas";

function loadViews(): KanbanViewSalva[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as KanbanViewSalva[]; }
  catch { return []; }
}
function saveViews(v: KanbanViewSalva[]) { localStorage.setItem(LS_KEY, JSON.stringify(v)); }

// ─── Helpers visuais ─────────────────────────────────────────────────────────

const CHIP_COLORS: Record<keyof KanbanFiltros, string> = {
  membro:     "text-emerald-400 border-emerald-400/40 bg-emerald-400/10",
  tipo:       "text-violet-400 border-violet-400/40 bg-violet-400/10",
  prioridade: "text-amber-400 border-amber-400/40 bg-amber-400/10",
  status:     "text-cyan-400 border-cyan-400/40 bg-cyan-400/10",
};

const CHIP_LABELS: Record<keyof KanbanFiltros, string> = {
  membro:     "Membro",
  tipo:       "Tipo",
  prioridade: "Prioridade",
  status:     "Status",
};

// ─── Componente principal ─────────────────────────────────────────────────────

export function KanbanFilterBar({
  filtros,
  onChange,
  stories,
  developers,
  workflowColumns,
  totalFiltrado,
  currentUserId,
}: {
  filtros: KanbanFiltros;
  onChange: (f: KanbanFiltros) => void;
  stories: any[];
  developers: any[];
  workflowColumns: any[];
  totalFiltrado: number;
  currentUserId?: string;
}) {
  const [viewsCustom, setViewsCustom] = useState<KanbanViewSalva[]>(loadViews);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  // contagens dinâmicas
  const counts = useMemo(() => {
    const membroCounts: Record<string, number> = {};
    const tipoCounts: Record<string, number> = {};
    const prioCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    stories.forEach((h: any) => {
      // membro
      const assignees: string[] = [];
      if (h.assigneeId) assignees.push(h.assigneeId);
      if (Array.isArray(h.assignees)) h.assignees.forEach((id: string) => assignees.push(id));
      assignees.forEach((id) => { membroCounts[id] = (membroCounts[id] || 0) + 1; });
      // tipo
      if (h.type) tipoCounts[h.type] = (tipoCounts[h.type] || 0) + 1;
      // prioridade
      if (h.priority) prioCounts[h.priority] = (prioCounts[h.priority] || 0) + 1;
      // status
      if (h.status) statusCounts[h.status] = (statusCounts[h.status] || 0) + 1;
    });
    return { membroCounts, tipoCounts, prioCounts, statusCounts };
  }, [stories]);

  // Chips ativos
  const activeChips = useMemo(() => {
    const chips: { key: keyof KanbanFiltros; display: string }[] = [];
    if (filtros.membro !== "all") {
      const dev = developers.find((d: any) => d.id === filtros.membro);
      chips.push({ key: "membro", display: dev?.name?.split(" ")[0] ?? filtros.membro });
    }
    if (filtros.tipo !== "all")       chips.push({ key: "tipo",       display: filtros.tipo });
    if (filtros.prioridade !== "all") chips.push({ key: "prioridade", display: filtros.prioridade });
    if (filtros.status !== "all") {
      const col = workflowColumns.find((c: any) => c.key === filtros.status);
      chips.push({ key: "status", display: col?.label ?? filtros.status });
    }
    return chips;
  }, [filtros, developers, workflowColumns]);

  function clearChip(key: keyof KanbanFiltros) {
    setActiveViewId(null);
    onChange({ ...filtros, [key]: "all" });
  }
  function clearAll() {
    setActiveViewId(null);
    onChange(KANBAN_FILTROS_DEFAULT);
  }
  function applyView(view: KanbanViewSalva) {
    // "Meus cards" usa currentUserId
    if (view.id === "meus" && currentUserId) {
      setActiveViewId(view.id);
      onChange({ ...KANBAN_FILTROS_DEFAULT, membro: currentUserId });
      return;
    }
    setActiveViewId(view.id);
    onChange(view.filtros);
  }
  function saveCurrentView() {
    if (!saveLabel.trim()) return;
    const newView: KanbanViewSalva = { id: Date.now().toString(), label: saveLabel.trim(), icon: "📌", filtros: { ...filtros } };
    const updated = [...viewsCustom, newView];
    setViewsCustom(updated);
    saveViews(updated);
    setActiveViewId(newView.id);
    setSaveLabel("");
    setShowSaveInput(false);
  }
  function deleteView(id: string) {
    const updated = viewsCustom.filter((v) => v.id !== id);
    setViewsCustom(updated);
    saveViews(updated);
    if (activeViewId === id) setActiveViewId(null);
  }

  const allViews = [...VIEWS_BUILTIN, ...viewsCustom];

  // opções de membros, tipos, prioridades e status para o popover
  const membroItems = useMemo(() => [
    { value: "all", label: "Todos", count: stories.length },
    ...developers
      .filter((d: any) => counts.membroCounts[d.id])
      .map((d: any) => ({ value: d.id, label: d.name?.split(" ")[0] + (d.name?.split(" ")[1] ? " " + d.name.split(" ")[1][0] + "." : ""), count: counts.membroCounts[d.id] ?? 0 }))
  ], [developers, counts, stories]);

  const tipoItems = useMemo(() => [
    { value: "all", label: "Todos", count: stories.length },
    ...Object.entries(counts.tipoCounts).map(([v, c]) => ({ value: v, label: v, count: c }))
  ], [counts, stories]);

  const prioItems = useMemo(() => [
    { value: "all", label: "Todas", count: stories.length },
    ...Object.entries(counts.prioCounts).map(([v, c]) => ({ value: v, label: v, count: c }))
  ], [counts, stories]);

  const statusItems = useMemo(() => [
    { value: "all", label: "Todos", count: stories.length },
    ...workflowColumns
      .filter((c: any) => counts.statusCounts[c.key])
      .map((c: any) => ({ value: c.key, label: c.label, count: counts.statusCounts[c.key] ?? 0 }))
  ], [workflowColumns, counts, stories]);

  return (
    <div className="flex flex-col gap-2 mb-4">
      {/* ── Linha 1: Visões salvas ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pr-1">Visões</span>
        {allViews.map((v) => (
          <ViewChip
            key={v.id}
            view={v}
            active={activeViewId === v.id}
            onApply={() => applyView(v)}
            onDelete={viewsCustom.find((c) => c.id === v.id) ? () => deleteView(v.id) : undefined}
          />
        ))}
        {!showSaveInput ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowSaveInput(true)}
                  className="h-7 px-2 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary text-[11px] flex items-center gap-1 transition-colors"
                >
                  <BookmarkPlus className="h-3 w-3" /> Salvar filtro
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Salva os filtros ativos como visão rápida</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={saveLabel}
              onChange={(e) => setSaveLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveCurrentView(); if (e.key === "Escape") setShowSaveInput(false); }}
              placeholder="Nome da visão..."
              className="h-7 px-2 rounded-lg border border-primary/50 bg-background text-xs text-foreground focus:outline-none w-36"
            />
            <button onClick={saveCurrentView} className="h-7 px-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium">OK</button>
            <button onClick={() => setShowSaveInput(false)} className="h-7 px-2 rounded-lg text-muted-foreground hover:text-foreground text-xs"><X className="h-3 w-3" /></button>
          </div>
        )}
      </div>

      {/* ── Linha 2: Chips ativos + add filtro ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pr-1">Filtros</span>

        {activeChips.map((chip) => (
          <span
            key={chip.key}
            className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-medium ${CHIP_COLORS[chip.key]}`}
          >
            <span className="text-muted-foreground/60 text-[10px]">{CHIP_LABELS[chip.key]}:</span>
            {chip.display}
            <button onClick={() => clearChip(chip.key)} className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary text-[11px] transition-colors">
              <SlidersHorizontal className="h-3 w-3" /> Filtrar
              <ChevronDown className="h-2.5 w-2.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-72 p-3 space-y-4">
            <FilterGroup label="Membro"     colorClass="text-emerald-400" items={membroItems}  selected={filtros.membro}     onSelect={(v) => { onChange({ ...filtros, membro: v });     setActiveViewId(null); }} />
            <FilterGroup label="Tipo"       colorClass="text-violet-400" items={tipoItems}    selected={filtros.tipo}       onSelect={(v) => { onChange({ ...filtros, tipo: v });       setActiveViewId(null); }} />
            <FilterGroup label="Prioridade" colorClass="text-amber-400"  items={prioItems}    selected={filtros.prioridade} onSelect={(v) => { onChange({ ...filtros, prioridade: v }); setActiveViewId(null); }} />
            <FilterGroup label="Status"     colorClass="text-cyan-400"   items={statusItems}  selected={filtros.status}     onSelect={(v) => { onChange({ ...filtros, status: v });     setActiveViewId(null); }} />
          </PopoverContent>
        </Popover>

        {activeChips.length > 0 && (
          <button onClick={clearAll} className="inline-flex items-center gap-1 h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3 w-3" /> Limpar
          </button>
        )}

        <span className="ml-auto text-[11px] font-mono text-muted-foreground">
          <span className="text-foreground font-semibold">{totalFiltrado}</span> card{totalFiltrado !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

// ─── ViewChip ─────────────────────────────────────────────────────────────────

function ViewChip({ view, active, onApply, onDelete }: {
  view: KanbanViewSalva; active: boolean; onApply: () => void; onDelete?: () => void;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-full border text-[11px] font-medium cursor-pointer transition-all select-none ${
        active
          ? "bg-primary/15 border-primary/60 text-primary"
          : "bg-muted/40 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
      onClick={onApply}
    >
      <span>{view.icon}</span>
      {view.label}
      {onDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity">
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

// ─── FilterGroup ──────────────────────────────────────────────────────────────

function FilterGroup({ label, colorClass, items, selected, onSelect }: {
  label: string; colorClass: string;
  items: { value: string; label: string; count: number }[];
  selected: string; onSelect: (v: string) => void;
}) {
  return (
    <div>
      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${colorClass}`}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <button
            key={item.value}
            onClick={() => onSelect(item.value)}
            className={`inline-flex items-center gap-1 h-6 px-2 rounded-full border text-[10px] transition-all ${
              selected === item.value
                ? `${colorClass} border-current bg-current/10 font-semibold`
                : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
            }`}
          >
            {item.label}
            <span className={`text-[9px] ${selected === item.value ? "opacity-80" : "opacity-50"}`}>{item.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
