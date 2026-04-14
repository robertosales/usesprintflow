import { useState, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { useSprint } from "@/contexts/SprintContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  KanbanStatus,
  isHUOverdue,
  hasActiveImpediment,
  IMPEDIMENT_CRITICALITY_LABELS,
  UserStory,
} from "@/types/sprint";
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
} from "lucide-react";
import { toast } from "sonner";
import { ImpedimentDialog } from "@/components/ImpedimentManager";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const PRIORITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

const PRIORITY_COLORS: Record<string, string> = {
  baixa: "bg-slate-100 text-slate-600 border-slate-200",
  media: "bg-blue-100 text-blue-700 border-blue-200",
  alta: "bg-orange-100 text-orange-700 border-orange-200",
  critica: "bg-red-100 text-red-700 border-red-200",
};

// ─── Filters Bar ─────────────────────────────────────────────────────────────

interface BoardFiltersProps {
  search: string;
  setSearch: (v: string) => void;
  priorityFilter: string;
  setPriorityFilter: (v: string) => void;
  epicFilter: string;
  setEpicFilter: (v: string) => void;
  assigneeFilter: string;
  setAssigneeFilter: (v: string) => void;
  epics: { id: string; name: string; color: string }[];
  developers: { id: string; name: string }[];
  hasFilters: boolean;
  clearFilters: () => void;
}

function BoardFilters({
  search,
  setSearch,
  priorityFilter,
  setPriorityFilter,
  epicFilter,
  setEpicFilter,
  assigneeFilter,
  setAssigneeFilter,
  epics,
  developers,
  hasFilters,
  clearFilters,
}: BoardFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          className="pl-8 h-8 text-xs w-[180px]"
          placeholder="Buscar HU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
        <SelectTrigger className="h-8 text-xs w-[120px]">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas prioridades</SelectItem>
          {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={epicFilter} onValueChange={setEpicFilter}>
        <SelectTrigger className="h-8 text-xs w-[130px]">
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

      <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
        <SelectTrigger className="h-8 text-xs w-[130px]">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {developers.map((dev) => (
            <SelectItem key={dev.id} value={dev.id}>
              {dev.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={clearFilters}>
          <X className="h-3.5 w-3.5" />
          Limpar
        </Button>
      )}
    </div>
  );
}

// ─── HU Card ─────────────────────────────────────────────────────────────────

import { Activity } from "@/types/sprint"; // importe o tipo real

interface HUCardProps {
  hu: UserStory;
  developers: { id: string; name: string }[];
  epics: { id: string; name: string; color: string }[];
  activities: Activity[]; // ← tipo correto em vez do objeto inline
  onImpediment: () => void;
  onResolveImpediment: (id: string) => void;
  isDragging?: boolean;
}

function HUCard({
  hu,
  developers,
  epics,
  activities, // ← já vem via props ✅
  onImpediment,
  onResolveImpediment,
  isDragging = false,
}: HUCardProps) {
  const [expanded, setExpanded] = useState(false);

  const epic = epics.find((e) => e.id === hu.epicId);
  const assignee = developers.find((d) => d.id === hu.assigneeId);
  const overdue = isHUOverdue(hu, activities); // ← adicione activities aqui
  const blocked = hasActiveImpediment(hu);
  const activeImpediments = (hu.impediments || []).filter((i) => !i.resolvedAt);

  const huActivities = activities.filter((a) => a.huId === hu.id);
  const totalHours = huActivities.reduce((s, a) => s + (a.hours || 0), 0);

  return (
    <Card
      className={`cursor-grab active:cursor-grabbing transition-all duration-150 ${
        isDragging ? "opacity-50 rotate-2 scale-105" : "hover:shadow-md"
      } ${overdue ? "border-destructive/50" : ""} ${blocked ? "border-warning/50 bg-warning/5" : ""}`}
    >
      <CardContent className="p-3 space-y-2">
        {/* Top badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="font-mono text-[10px] px-1.5 font-bold">
            {hu.code}
          </Badge>
          {epic && (
            <Badge
              className="text-[8px] px-1 gap-0.5"
              style={{ backgroundColor: epic.color + "22", color: epic.color }}
            >
              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: epic.color }} />
              {epic.name}
            </Badge>
          )}
          {hu.priority && (
            <Badge className={`text-[8px] px-1 ${PRIORITY_COLORS[hu.priority] || ""}`}>
              {PRIORITY_LABELS[hu.priority] || hu.priority}
            </Badge>
          )}
          {overdue && (
            <Badge className="text-[8px] px-1 bg-destructive/10 text-destructive border-destructive/30 gap-0.5">
              <AlertTriangle className="h-2.5 w-2.5" />
              Atrasada
            </Badge>
          )}
          {blocked && (
            <Badge className="text-[8px] px-1 bg-warning/10 text-warning border-warning/30 gap-0.5">
              <ShieldAlert className="h-2.5 w-2.5" />
              Impedida
            </Badge>
          )}
        </div>

        {/* Title */}
        <p className="text-xs font-medium leading-snug line-clamp-2">{hu.title}</p>

        {/* Assignee direto da HU */}
        {assignee && (
          <div className="flex items-center gap-1.5">
            <div
              className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0"
              title={assignee.name}
            >
              {getInitials(assignee.name)}
            </div>
            <span className="text-[10px] text-muted-foreground truncate">{assignee.name}</span>
          </div>
        )}

        {/* Impedimentos ativos */}
        {activeImpediments.length > 0 && (
          <div className="space-y-1">
            {activeImpediments.slice(0, 2).map((imp) => {
              // IMPEDIMENT_CRITICALITY_LABELS pode ser Record<string, string> ou Record<string, {label,color}>
              // Normalizamos para sempre exibir uma string segura
              const critLabel = (() => {
                const val = IMPEDIMENT_CRITICALITY_LABELS[imp.criticality];
                if (!val) return String(imp.criticality);
                if (typeof val === "string") return val;
                return (val as { label: string; color: string }).label;
              })();

              // imp.reason é o campo correto; fallback para imp.description se existir
              const impText = (imp as any).reason ?? (imp as any).description ?? "";

              return (
                <div
                  key={imp.id}
                  className="flex items-start gap-1 text-[10px] bg-warning/10 rounded p-1.5 border border-warning/20"
                >
                  <ShieldAlert className="h-3 w-3 text-warning shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-semibold text-warning">{critLabel}</span>
                      {imp.hasTicket && imp.ticketId && (
                        <Badge variant="outline" className="text-[8px] px-1 gap-0.5">
                          <Link2 className="h-2 w-2" />
                          {imp.ticketId}
                        </Badge>
                      )}
                    </div>
                    {impText && <p className="text-muted-foreground line-clamp-1">{impText}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-success hover:bg-success/10 shrink-0"
                    title="Resolver impedimento"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResolveImpediment(imp.id);
                    }}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-2">
            {huActivities.length > 0 && (
              <button
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((v) => !v);
                }}
              >
                {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {huActivities.length} ativ.
              </button>
            )}
            {totalHours > 0 && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {totalHours}h
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {[...new Set(huActivities.map((a) => a.assigneeId).filter(Boolean))].slice(0, 3).map((devId) => {
              const dev = developers.find((d) => d.id === devId);
              if (!dev) return null;
              return (
                <div
                  key={devId}
                  className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[8px] font-bold flex items-center justify-center"
                  title={dev.name}
                >
                  {getInitials(dev.name)}
                </div>
              );
            })}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-warning hover:bg-warning/10"
              title="Reportar Impedimento"
              onClick={(e) => {
                e.stopPropagation();
                onImpediment();
              }}
            >
              <ShieldAlert className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Expanded activities */}
        {expanded && huActivities.length > 0 && (
          <div className="border-t pt-2 space-y-1">
            {huActivities.map((act, i) => {
              const dev = developers.find((d) => d.id === act.assigneeId);
              return (
                <div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="flex-1 truncate">{act.title}</span>
                  {dev && (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary text-[7px] font-bold shrink-0">
                      {getInitials(dev.name)}
                    </div>
                  )}
                  <span className="text-muted-foreground shrink-0">{act.hours}h</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Draggable wrapper ────────────────────────────────────────────────────────

function DraggableHUCard(props: HUCardProps & { id: string; canMove: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.id,
    disabled: !props.canMove,
  });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <HUCard {...props} isDragging={isDragging} />
    </div>
  );
}

// ─── Droppable Column ─────────────────────────────────────────────────────────

function DroppableColumn({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${className ?? ""} ${isOver ? "ring-2 ring-primary/30 ring-inset" : ""} transition-all`}
    >
      {children}
    </div>
  );
}

// ─── KanbanBoard ──────────────────────────────────────────────────────────────

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
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [epicFilter, setEpicFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const toggleColumn = (key: string) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const hasFilters = search !== "" || priorityFilter !== "all" || epicFilter !== "all" || assigneeFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setPriorityFilter("all");
    setEpicFilter("all");
    setAssigneeFilter("all");
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const sprintStories = useMemo(() => {
    if (!activeSprint) return [];
    let stories = userStories.filter((hu) => hu.sprintId === activeSprint.id);
    if (search) {
      const q = search.toLowerCase();
      stories = stories.filter((hu) => hu.title.toLowerCase().includes(q) || hu.code?.toLowerCase().includes(q));
    }
    if (priorityFilter !== "all") {
      stories = stories.filter((hu) => hu.priority === priorityFilter);
    }
    if (epicFilter !== "all") {
      stories = stories.filter((hu) => hu.epicId === epicFilter);
    }
    if (assigneeFilter !== "all") {
      stories = stories.filter((hu) => hu.assigneeId === assigneeFilter);
    }
    return stories;
  }, [activeSprint, userStories, search, priorityFilter, epicFilter, assigneeFilter]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const hu = userStories.find((h) => h.id === active.id);
    const targetStatus = over.id as KanbanStatus;
    if (!hu || hu.status === targetStatus) return;
    updateUserStoryStatus(hu.id, targetStatus).catch(() => {
      toast.error("Não foi possível mover a HU.");
    });
  };

  const activeHU = activeId ? userStories.find((h) => h.id === activeId) : null;

  if (!activeSprint) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <p className="text-muted-foreground text-sm">Nenhum sprint ativo. Inicie um sprint para visualizar o board.</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold">Board Kanban</h2>
            <p className="text-xs text-muted-foreground">
              Sprint:{" "}
              <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                {activeSprint.name} • {sprintStories.length} HUs
              </Badge>
            </p>
          </div>
        </div>

        {/* Filters */}
        <BoardFilters
          search={search}
          setSearch={setSearch}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          epicFilter={epicFilter}
          setEpicFilter={setEpicFilter}
          assigneeFilter={assigneeFilter}
          setAssigneeFilter={setAssigneeFilter}
          epics={epics}
          developers={developers}
          hasFilters={hasFilters}
          clearFilters={clearFilters}
        />

        {/* Board */}
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin" style={{ minHeight: 500 }}>
          {workflowColumns.map((col) => {
            const isCollapsed = collapsedColumns.has(col.key);
            const colStories = sprintStories.filter((hu) => hu.status === col.key);

            return (
              <div
                key={col.key}
                className={`flex-shrink-0 transition-all duration-300 ease-in-out ${
                  isCollapsed ? "w-[48px]" : "min-w-[300px] w-[300px]"
                }`}
              >
                <DroppableColumn id={col.key} className="rounded-lg bg-muted/40 border h-full">
                  {isCollapsed ? (
                    <div
                      className="flex flex-col items-center gap-2 cursor-pointer h-full pt-3 pb-2"
                      onClick={() => toggleColumn(col.key)}
                      title={`Expandir: ${col.label}`}
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Badge className="text-[10px] h-5 min-w-5 flex items-center justify-center bg-primary/10 text-primary border-primary/20">
                        {colStories.length}
                      </Badge>
                      <span
                        className="text-[11px] font-semibold text-muted-foreground"
                        style={{
                          writingMode: "vertical-lr",
                          textOrientation: "mixed",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {col.label}
                      </span>
                    </div>
                  ) : (
                    <div className="p-2 h-full flex flex-col">
                      {/* Column header */}
                      <div className="flex items-center justify-between mb-2 px-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <button
                            onClick={() => toggleColumn(col.key)}
                            className="p-0.5 rounded hover:bg-muted transition-colors shrink-0"
                            title="Retrair coluna"
                          >
                            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <span className="text-xs font-semibold truncate">{col.label}</span>
                        </div>
                        <Badge className="text-[10px] h-5 min-w-5 flex items-center justify-center bg-primary/10 text-primary border-primary/20">
                          {colStories.length}
                        </Badge>
                      </div>

                      {/* Cards */}
                      <div className="space-y-2 overflow-y-auto flex-1 max-h-[calc(100vh-280px)] pr-0.5">
                        {colStories.map((hu) => (
                          <DraggableHUCard
                            key={hu.id}
                            id={hu.id}
                            hu={hu}
                            developers={developers}
                            epics={epics}
                            activities={activities}
                            onImpediment={() => setImpedimentDialog(hu.id)}
                            onResolveImpediment={(impId) => resolveImpediment(hu.id, impId)}
                            canMove={canMove}
                          />
                        ))}
                        {colStories.length === 0 && (
                          <div className="flex items-center justify-center h-16 text-xs text-muted-foreground border-2 border-dashed rounded-lg">
                            Arraste aqui
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </DroppableColumn>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Arraste os cards para alterar a situação. Somente usuários com permissão <code>move_kanban</code> podem mover
          HUs.
        </p>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeHU && (
          <HUCard
            hu={activeHU}
            developers={developers}
            epics={epics}
            activities={activities as any}
            onImpediment={() => {}}
            onResolveImpediment={() => {}}
            isDragging
          />
        )}
      </DragOverlay>

      <ImpedimentDialog huId={impedimentDialog} open={!!impedimentDialog} onClose={() => setImpedimentDialog(null)} />
    </DndContext>
  );
}
