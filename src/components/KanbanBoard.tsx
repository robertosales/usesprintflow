import { useState, useMemo } from "react";
import { SizeBadge } from "@/components/SizeBadge";
import { useSprint } from "@/contexts/SprintContext";
import { useAuth } from "@/contexts/AuthContext";
import { isHUOverdue, hasActiveImpediment, IMPEDIMENT_CRITICALITY_LABELS, UserStory } from "@/types/sprint";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Link2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  X,
  Plus,
  Bug,
  ArrowRightLeft,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { ImpedimentDialog } from "@/components/ImpedimentManager";
import { QuickActivityDialog } from "@/components/QuickActivityDialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Converte hex para rgba com opacidade */
function hexAlpha(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── DnD primitives ────────────────────────────────────────────────────────────
function DroppableColumn({
  id,
  children,
  isEmpty,
  isOver,
}: {
  id: string;
  children: React.ReactNode;
  isEmpty: boolean;
  isOver: boolean;
}) {
  const { setNodeRef, isOver: dndIsOver } = useDroppable({ id });
  const over = isOver || dndIsOver;
  return (
    <div ref={setNodeRef} className="flex flex-col gap-2">
      {isEmpty ? (
        <div
          className={`flex items-center justify-center h-16 rounded-lg border-2 border-dashed text-xs transition-colors
          ${over ? "border-primary/50 bg-primary/5 text-primary" : "border-border/40 text-muted-foreground"}`}
        >
          {over ? "Soltar aqui" : "Sem HUs"}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function DraggableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

// ── Barra de progresso ────────────────────────────────────────────────────────
function WorkloadBar({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100);
  const color = pct > 100 ? "bg-destructive" : pct > 80 ? "bg-warning" : "bg-success";
  return (
    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${capped}%` }} />
    </div>
  );
}

// ── Avatares do time ──────────────────────────────────────────────────────────
function TeamAvatarFilter({
  developers,
  activeFilter,
  onToggle,
  workload,
}: {
  developers: { id: string; name: string }[];
  activeFilter: string;
  onToggle: (id: string) => void;
  workload: Record<string, { estimated: number; realized: number }>;
}) {
  if (developers.length === 0) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {developers.map((dev) => {
        const isActive = activeFilter === dev.id;
        const load = workload[dev.id] ?? { estimated: 0, realized: 0 };
        const pct = load.estimated > 0 ? Math.round((load.realized / load.estimated) * 100) : 0;
        const isOverloaded = pct > 100;
        return (
          <button
            key={dev.id}
            onClick={() => onToggle(dev.id)}
            title={`${dev.name} — ${load.realized}h / ${load.estimated}h (${pct}%)`}
            className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all border
              ${isActive ? "bg-primary/10 border-primary shadow-sm scale-105" : "border-transparent hover:bg-muted hover:border-border"}`}
          >
            <div
              className={`h-7 w-7 rounded-full text-[11px] font-bold flex items-center justify-center
              ${isActive ? "bg-primary text-primary-foreground" : isOverloaded ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}
            >
              {getInitials(dev.name)}
            </div>
            <div className="w-10">
              <WorkloadBar pct={pct} />
            </div>
            <span
              className={`text-[9px] font-medium leading-none ${isOverloaded ? "text-destructive" : "text-muted-foreground"}`}
            >
              {load.realized}h/{load.estimated}h
            </span>
          </button>
        );
      })}
      {activeFilter !== "all" && (
        <button
          onClick={() => onToggle("all")}
          className="h-6 w-6 rounded-full bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors self-start mt-1"
          title="Limpar filtro"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ── Filtros ───────────────────────────────────────────────────────────────────
function BoardFilters({
  search,
  setSearch,
  priorityFilter,
  setPriorityFilter,
  epicFilter,
  setEpicFilter,
  epics,
  hasFilters,
  clearFilters,
}: {
  search: string;
  setSearch: (v: string) => void;
  priorityFilter: string;
  setPriorityFilter: (v: string) => void;
  epicFilter: string;
  setEpicFilter: (v: string) => void;
  epics: { id: string; name: string; color: string }[];
  hasFilters: boolean;
  clearFilters: () => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap px-1">
      <div className="relative flex-1 min-w-[160px] max-w-[240px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar HU..."
          className="pl-8 h-8 text-xs bg-background"
        />
      </div>
      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
        <SelectTrigger className="h-8 w-[120px] text-xs bg-background">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="critica">Crítica</SelectItem>
          <SelectItem value="alta">Alta</SelectItem>
          <SelectItem value="media">Média</SelectItem>
          <SelectItem value="baixa">Baixa</SelectItem>
        </SelectContent>
      </Select>
      {epics.length > 0 && (
        <Select value={epicFilter} onValueChange={setEpicFilter}>
          <SelectTrigger className="h-8 w-[130px] text-xs bg-background">
            <SelectValue placeholder="Épico" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos épicos</SelectItem>
            {epics.map((ep) => (
              <SelectItem key={ep.id} value={ep.id}>
                {ep.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={clearFilters}>
          <X className="h-3 w-3" /> Limpar
        </Button>
      )}
    </div>
  );
}

// ── Prioridade ────────────────────────────────────────────────────────────────
const PRIORITY_COLORS: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground border-border",
  media: "bg-blue-50 text-blue-700 border-blue-200",
  alta: "bg-amber-50 text-amber-700 border-amber-200",
  critica: "bg-red-50 text-red-700 border-red-200",
};
const PRIORITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

// ── Card da HU ────────────────────────────────────────────────────────────────
function HUCard({
  hu,
  expanded,
  onToggleExpand,
  onImpediment,
  onResolveImpediment,
  onAddTask,
  moveOptions,
  onMove,
  accentColor,
}: {
  hu: UserStory;
  expanded: boolean;
  onToggleExpand: () => void;
  onImpediment: () => void;
  onResolveImpediment: (id: string) => void;
  onAddTask: () => void;
  moveOptions?: { key: string; label: string }[];
  onMove?: (key: string) => void;
  accentColor: string;
}) {
  const { activities, developers, epics } = useSprint();
  const huActivities = activities.filter((a) => a.huId === hu.id);
  const overdue = isHUOverdue(hu, activities);
  const blocked = hasActiveImpediment(hu);
  const activeImpediments = (hu.impediments || []).filter((i) => !i.resolvedAt);
  const totalHours = huActivities.reduce((s, a) => s + a.hours, 0);
  const epic = hu.epicId ? epics.find((e) => e.id === hu.epicId) : null;
  const assignee = hu.assigneeId ? developers.find((d) => d.id === hu.assigneeId) : null;
  const estimated = hu.estimatedHours ?? 0;
  const progressPct = estimated > 0 ? Math.min(Math.round((totalHours / estimated) * 100), 100) : 0;
  const isOver = estimated > 0 && totalHours > estimated;
  const isBugStatus = hu.status === "bug";

  const activityAssignees = huActivities
    .map((a) => developers.find((d) => d.id === a.assigneeId))
    .filter((d, i, arr) => d && arr.findIndex((x) => x?.id === d?.id) === i);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`
            bg-card rounded-lg border shadow-sm
            hover:shadow-md transition-all duration-150
            cursor-grab active:cursor-grabbing
            overflow-hidden
            ${blocked ? "ring-1 ring-warning/60" : ""}
            ${overdue && !isBugStatus ? "ring-1 ring-destructive/40" : ""}
          `}
          style={{ borderLeft: `3px solid ${accentColor}` }}
        >
          {/* ── Topo: código + badges de estado ── */}
          <div className="px-3 pt-3 pb-2 flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
              {isBugStatus && (
                <Badge className="text-[10px] px-1.5 gap-0.5 bg-red-100 text-red-700 border-red-200">
                  <Bug className="h-2.5 w-2.5" /> BUG
                </Badge>
              )}
              <Badge variant="outline" className="font-mono text-[10px] px-1.5 font-bold shrink-0">
                {hu.code}
              </Badge>
              <Badge className={`text-[10px] px-1.5 border ${PRIORITY_COLORS[hu.priority]}`}>
                {PRIORITY_LABELS[hu.priority]}
              </Badge>
              <SizeBadge sizeReference={hu.sizeReference} storyPoints={hu.storyPoints} />
              {overdue && (
                <Badge variant="destructive" className="text-[10px] px-1.5 gap-0.5">
                  <AlertTriangle className="h-2.5 w-2.5" /> Atrasada
                </Badge>
              )}
              {blocked && (
                <Badge className="text-[10px] px-1.5 gap-0.5 bg-amber-100 text-amber-700 border-amber-200">
                  <ShieldAlert className="h-2.5 w-2.5" /> Impedida
                </Badge>
              )}
            </div>
          </div>

          {/* ── Título ── */}
          <div className="px-3 pb-2">
            <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2">{hu.title}</p>
          </div>

          {/* ── Épico + Responsável ── */}
          <div className="px-3 pb-2 flex items-center gap-2 flex-wrap">
            {epic && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 border"
                style={{ backgroundColor: epic.color + "18", color: epic.color, borderColor: epic.color + "40" }}
              >
                <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ backgroundColor: epic.color }} />
                {epic.name}
              </span>
            )}
            {assignee && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <span
                  className="h-4 w-4 rounded-full text-[8px] font-bold flex items-center justify-center shrink-0"
                  style={{ backgroundColor: hexAlpha(accentColor, 0.15), color: accentColor }}
                >
                  {getInitials(assignee.name)}
                </span>
                {assignee.name.split(" ")[0]}
              </span>
            )}
          </div>

          {/* ── Impedimentos ativos ── */}
          {activeImpediments.length > 0 && (
            <div className="mx-3 mb-2 space-y-1">
              {activeImpediments.slice(0, 1).map((imp) => (
                <div
                  key={imp.id}
                  className="flex items-start gap-1.5 text-[11px] bg-amber-50 rounded px-2 py-1.5 border border-amber-200"
                >
                  <ShieldAlert className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
                  <span className="flex-1 line-clamp-1 text-amber-800">{imp.reason}</span>
                  <button
                    className="text-emerald-600 hover:text-emerald-700 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResolveImpediment(imp.id);
                    }}
                    title="Resolver impedimento"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {activeImpediments.length > 1 && (
                <p className="text-[10px] text-muted-foreground px-1">
                  +{activeImpediments.length - 1} impedimento{activeImpediments.length > 2 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          {/* ── Divisor ── */}
          <div className="border-t border-border/50 mx-3" />

          {/* ── Rodapé ── */}
          <div className="px-3 py-2 flex items-center justify-between gap-2">
            {/* Esquerda: tarefas + horas */}
            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
              >
                {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <span>
                  {huActivities.length} tarefa{huActivities.length !== 1 ? "s" : ""}
                </span>
              </button>
              <span
                className={`flex items-center gap-1 text-[11px] ${isOver ? "text-destructive font-semibold" : "text-muted-foreground"}`}
                title={`${totalHours}h realizadas / ${estimated}h estimadas`}
              >
                <Clock className="h-3 w-3" />
                {totalHours}h{estimated > 0 ? `/${estimated}h` : ""}
              </span>
            </div>

            {/* Direita: avatares colaboradores + ações */}
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {activityAssignees.slice(0, 3).map((dev) => (
                  <div
                    key={dev!.id}
                    className="h-5 w-5 rounded-full border-2 border-card flex items-center justify-center text-[8px] font-bold"
                    style={{ backgroundColor: hexAlpha(accentColor, 0.15), color: accentColor }}
                    title={dev!.name}
                  >
                    {getInitials(dev!.name)}
                  </div>
                ))}
                {activityAssignees.length > 3 && (
                  <div className="h-5 w-5 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                    +{activityAssignees.length - 3}
                  </div>
                )}
              </div>
              <button
                className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                title="Adicionar tarefa"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddTask();
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                className="h-6 w-6 rounded flex items-center justify-center text-amber-500 hover:bg-amber-50 transition-colors"
                title="Reportar Impedimento"
                onClick={(e) => {
                  e.stopPropagation();
                  onImpediment();
                }}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* ── Barra de progresso ── */}
          {estimated > 0 && (
            <div className="h-0.5 bg-muted">
              <div
                className={`h-full transition-all duration-500 ${isOver ? "bg-destructive" : progressPct > 80 ? "bg-amber-400" : "bg-emerald-500"}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}

          {/* ── Tarefas expandidas ── */}
          {expanded && huActivities.length > 0 && (
            <div className="px-3 py-2 space-y-1 bg-muted/30 border-t border-border/40">
              {huActivities.map((act) => {
                const dev = developers.find((d) => d.id === act.assigneeId);
                return (
                  <div key={act.id} className="flex items-center gap-2 text-xs py-1">
                    <span className="text-muted-foreground shrink-0">
                      {act.activityType === "bug" ? "🐛" : act.activityType === "architecture" ? "🏗️" : "📋"}
                    </span>
                    <span className="flex-1 truncate text-foreground/80">{act.title}</span>
                    {dev && <span className="text-[9px] text-muted-foreground shrink-0">{getInitials(dev.name)}</span>}
                    <span className="text-muted-foreground shrink-0 font-mono text-[10px]">{act.hours}h</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        <ContextMenuItem onClick={onToggleExpand}>{expanded ? "Recolher tarefas" : "Expandir tarefas"}</ContextMenuItem>
        <ContextMenuItem onClick={onAddTask}>Adicionar tarefa</ContextMenuItem>
        <ContextMenuItem onClick={onImpediment}>Reportar impedimento</ContextMenuItem>
        {moveOptions && onMove && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <ArrowRightLeft className="h-3.5 w-3.5 mr-2" /> Mover para
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="max-h-[55vh] overflow-y-auto">
              {moveOptions.map((opt) => (
                <ContextMenuItem key={opt.key} disabled={opt.key === hu.status} onClick={() => onMove(opt.key)}>
                  {opt.label}
                  {opt.key === hu.status && <span className="ml-auto text-[10px] text-muted-foreground">(atual)</span>}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ── Board principal ───────────────────────────────────────────────────────────
export function KanbanBoard() {
  const {
    activities,
    userStories,
    developers,
    updateUserStoryStatus,
    resolveImpediment,
    activeSprint,
    workflowColumns,
    epics,
  } = useSprint();
  const { hasPermission } = useAuth();
  const canMove = hasPermission("move_kanban");

  const [impedimentDialog, setImpedimentDialog] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedHU, setExpandedHU] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [quickTaskHU, setQuickTaskHU] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [epicFilter, setEpicFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const hasFilters = search !== "" || priorityFilter !== "all" || epicFilter !== "all";
  const clearFilters = () => {
    setSearch("");
    setPriorityFilter("all");
    setEpicFilter("all");
  };
  const handleAvatarToggle = (id: string) => setAssigneeFilter(assigneeFilter === id ? "all" : id);
  const toggleColumn = (key: string) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const sprintStories = useMemo(() => {
    if (!activeSprint) return [];
    let s = userStories.filter((hu) => hu.sprintId === activeSprint.id);
    if (search) {
      const q = search.toLowerCase();
      s = s.filter((hu) => hu.title.toLowerCase().includes(q) || hu.code.toLowerCase().includes(q));
    }
    if (priorityFilter !== "all") s = s.filter((hu) => hu.priority === priorityFilter);
    if (epicFilter !== "all") s = s.filter((hu) => hu.epicId === epicFilter);
    if (assigneeFilter !== "all") s = s.filter((hu) => hu.assigneeId === assigneeFilter);
    return s;
  }, [activeSprint, userStories, search, priorityFilter, epicFilter, assigneeFilter]);

  const workload = useMemo(() => {
    if (!activeSprint) return {};
    const sprintHUs = userStories.filter((hu) => hu.sprintId === activeSprint.id);
    const sprintHUIds = new Set(sprintHUs.map((hu) => hu.id));
    const result: Record<string, { estimated: number; realized: number }> = {};
    developers.forEach((dev) => {
      const estimated = sprintHUs
        .filter((hu) => hu.assigneeId === dev.id)
        .reduce((s, hu) => s + (hu.estimatedHours ?? 0), 0);
      const realized = activities
        .filter((a) => a.assigneeId === dev.id && sprintHUIds.has(a.huId))
        .reduce((s, a) => s + (a.hours ?? 0), 0);
      result[dev.id] = { estimated, realized };
    });
    return result;
  }, [activeSprint, userStories, activities, developers]);

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDragOverColumn(null);
    if (!over || !canMove) return;
    const huId = active.id as string;
    const overId = over.id as string;
    const targetCol = workflowColumns.find((c) => c.key === overId);
    if (targetCol) {
      const hu = sprintStories.find((h) => h.id === huId);
      if (hu && hu.status !== targetCol.key) {
        updateUserStoryStatus(huId, targetCol.key);
        toast.success(`HU movida para ${targetCol.label}`);
      }
      return;
    }
    const targetHU = sprintStories.find((h) => h.id === overId);
    if (targetHU) {
      const hu = sprintStories.find((h) => h.id === huId);
      if (hu && hu.status !== targetHU.status) {
        updateUserStoryStatus(huId, targetHU.status);
        const col = workflowColumns.find((c) => c.key === targetHU.status);
        toast.success(`HU movida para ${col?.label}`);
      }
    }
  };

  const activeHU = activeId ? sprintStories.find((h) => h.id === activeId) : null;

  return (
    <div className="space-y-4">
      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Board — User Stories</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Arraste os cards para mover entre colunas. Clique em ‹ › para retrair.
          </p>
        </div>
        {activeSprint && (
          <Badge variant="outline" className="text-xs font-mono">
            {activeSprint.name} · {sprintStories.length} HU{sprintStories.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* ── Time ── */}
      {activeSprint && developers.length > 0 && (
        <div className="flex items-start gap-3 flex-wrap px-3 py-2 bg-muted/20 rounded-lg border border-border/40">
          <span className="text-xs text-muted-foreground mt-2 shrink-0">Time:</span>
          <TeamAvatarFilter
            developers={developers}
            activeFilter={assigneeFilter}
            onToggle={handleAvatarToggle}
            workload={workload}
          />
        </div>
      )}

      {/* ── Filtros ── */}
      {activeSprint && (
        <BoardFilters
          search={search}
          setSearch={setSearch}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          epicFilter={epicFilter}
          setEpicFilter={setEpicFilter}
          epics={epics}
          hasFilters={hasFilters}
          clearFilters={clearFilters}
        />
      )}

      {!activeSprint ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground rounded-xl border border-dashed">
          <p className="text-base font-medium mb-1">Nenhuma Sprint ativa</p>
          <p className="text-sm">Crie e ative uma Sprint na aba Backlog para usar o Board</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 pb-4 overflow-x-auto" style={{ minHeight: 120 }}>
            {workflowColumns.map((col) => {
              const accentColor: string = (col as any).hex || "#94a3b8";
              const colHUs = sprintStories.filter((hu) => (hu.status || workflowColumns[0]?.key) === col.key);
              const isCollapsed = collapsedColumns.has(col.key);
              const isDragOver = dragOverColumn === col.key;

              return (
                <div
                  key={col.key}
                  className={`flex-shrink-0 flex flex-col transition-all duration-300 ${isCollapsed ? "w-[48px]" : "w-[280px]"}`}
                >
                  {isCollapsed ? (
                    /* ── Coluna retraída ── */
                    <div
                      className="flex flex-col items-center gap-2 rounded-xl border bg-card shadow-sm py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      style={{ borderTop: `3px solid ${accentColor}` }}
                      onClick={() => toggleColumn(col.key)}
                      title={`Expandir: ${col.label}`}
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <span
                        className="text-[11px] font-bold"
                        style={{ writingMode: "vertical-lr", color: accentColor, whiteSpace: "nowrap" }}
                      >
                        {col.label}
                      </span>
                      <span
                        className="text-[10px] font-bold rounded-full px-1.5 py-0.5"
                        style={{ backgroundColor: hexAlpha(accentColor, 0.12), color: accentColor }}
                      >
                        {colHUs.length}
                      </span>
                    </div>
                  ) : (
                    /* ── Coluna expandida ── */
                    <div
                      className={`flex flex-col rounded-xl border bg-card shadow-sm transition-all duration-200
                        ${isDragOver ? "ring-2 ring-primary/30" : ""}`}
                      style={{ borderTop: `3px solid ${accentColor}` }}
                    >
                      {/* Cabeçalho da coluna */}
                      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            onClick={() => toggleColumn(col.key)}
                            className="p-0.5 rounded hover:bg-muted transition-colors shrink-0"
                            title="Retrair coluna"
                          >
                            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full truncate"
                            style={{ backgroundColor: hexAlpha(accentColor, 0.12), color: accentColor }}
                          >
                            {col.label}
                          </span>
                        </div>
                        <span
                          className="text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 shrink-0"
                          style={{ backgroundColor: hexAlpha(accentColor, 0.1), color: accentColor }}
                        >
                          {colHUs.length}
                        </span>
                      </div>

                      {/* Cards */}
                      <div className="p-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
                        <DroppableColumn id={col.key} isEmpty={colHUs.length === 0} isOver={isDragOver}>
                          {colHUs.map((hu) => (
                            <div key={hu.id} className="mb-2">
                              <DraggableCard id={hu.id}>
                                <HUCard
                                  hu={hu}
                                  accentColor={accentColor}
                                  expanded={expandedHU === hu.id}
                                  onToggleExpand={() => setExpandedHU(expandedHU === hu.id ? null : hu.id)}
                                  onImpediment={() => setImpedimentDialog(hu.id)}
                                  onResolveImpediment={(impId) => {
                                    resolveImpediment(hu.id, impId);
                                    toast.success("Impedimento resolvido!");
                                  }}
                                  onAddTask={() => setQuickTaskHU(hu.id)}
                                  moveOptions={workflowColumns.map((c) => ({ key: c.key, label: c.label }))}
                                  onMove={(targetKey) => {
                                    if (!canMove) {
                                      toast.error("Sem permissão para mover HUs.");
                                      return;
                                    }
                                    if (hu.status === targetKey) return;
                                    updateUserStoryStatus(hu.id, targetKey);
                                    const c = workflowColumns.find((c) => c.key === targetKey);
                                    toast.success(`HU movida para ${c?.label ?? targetKey}`);
                                  }}
                                />
                              </DraggableCard>
                            </div>
                          ))}
                        </DroppableColumn>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <DragOverlay>
            {activeHU &&
              (() => {
                const col = workflowColumns.find((c) => c.key === activeHU.status);
                const color = (col as any)?.hex || "#94a3b8";
                return (
                  <div className="opacity-90 rotate-1 scale-105 shadow-2xl">
                    <HUCard
                      hu={activeHU}
                      accentColor={color}
                      expanded={false}
                      onToggleExpand={() => {}}
                      onImpediment={() => {}}
                      onResolveImpediment={() => {}}
                      onAddTask={() => {}}
                    />
                  </div>
                );
              })()}
          </DragOverlay>
        </DndContext>
      )}

      <ImpedimentDialog huId={impedimentDialog} open={!!impedimentDialog} onClose={() => setImpedimentDialog(null)} />
      {quickTaskHU && (
        <QuickActivityDialog open={!!quickTaskHU} onClose={() => setQuickTaskHU(null)} huId={quickTaskHU} />
      )}
    </div>
  );
}
