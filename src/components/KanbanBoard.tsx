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
} from "lucide-react";
import { toast } from "sonner";
import { ImpedimentDialog } from "@/components/ImpedimentManager";
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

// ─── DroppableColumn ────────────────────────────────────────────────────────
function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-b-lg border border-t-0 min-h-[400px] p-2 space-y-2 transition-colors ${
        isOver ? "bg-primary/5 border-primary/30" : "bg-muted/30"
      }`}
    >
      {children}
    </div>
  );
}

// ─── DraggableCard ──────────────────────────────────────────────────────────
function DraggableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

// ─── BoardFilters ────────────────────────────────────────────────────────────
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
}: {
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
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative flex-1 min-w-[180px] max-w-[280px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar HU..."
          className="pl-8 h-8 text-xs"
        />
      </div>

      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
        <SelectTrigger className="h-8 w-[130px] text-xs">
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
          <SelectTrigger className="h-8 w-[140px] text-xs">
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

      {developers.length > 0 && (
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
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
      )}

      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={clearFilters}>
          <X className="h-3 w-3" /> Limpar
        </Button>
      )}
    </div>
  );
}

// ─── KanbanBoard (export principal) ─────────────────────────────────────────
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

  const toggleColumn = (key: string) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [epicFilter, setEpicFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

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
      stories = stories.filter((hu) => hu.title.toLowerCase().includes(q) || hu.code.toLowerCase().includes(q));
    }
    if (priorityFilter !== "all") {
      stories = stories.filter((hu) => hu.priority === priorityFilter);
    }
    if (epicFilter !== "all") {
      stories = stories.filter((hu) => hu.epicId === epicFilter);
    }
    if (assigneeFilter !== "all") {
      stories = stories.filter((hu) => {
        if (hu.assigneeId === assigneeFilter) return true;
        const huActs = activities.filter((a) => a.huId === hu.id);
        return huActs.some((a) => a.assigneeId === assigneeFilter);
      });
    }
    return stories;
  }, [activeSprint, userStories, search, priorityFilter, epicFilter, assigneeFilter, activities]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !canMove) return;

    const huId = active.id as string;
    const overId = over.id as string;

    const targetColumn = workflowColumns.find((c) => c.key === overId);
    if (targetColumn) {
      const hu = sprintStories.find((h) => h.id === huId);
      if (hu && hu.status !== targetColumn.key) {
        updateUserStoryStatus(huId, targetColumn.key);
        toast.success(`HU movida para ${targetColumn.label}`);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">Board — User Stories</h2>
        {activeSprint && (
          <Badge variant="outline" className="text-xs font-mono">
            {activeSprint.name} • {sprintStories.length} HUs
          </Badge>
        )}
      </div>

      {/* Filtros */}
      {activeSprint && (
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
      )}

      {!activeSprint ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg font-medium mb-1">Nenhuma Sprint ativa</p>
            <p className="text-sm">Crie e ative uma Sprint na aba Backlog para usar o Board</p>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-thin">
            {workflowColumns.map((col) => {
              const colHUs = sprintStories.filter((hu) => (hu.status || workflowColumns[0]?.key) === col.key);
              const isCollapsed = collapsedColumns.has(col.key);
              return (
                <div
                  key={col.key}
                  className={`flex-shrink-0 transition-all duration-300 ease-in-out ${
                    isCollapsed ? "w-[48px]" : "min-w-[300px] w-[300px]"
                  }`}
                >
                  {isCollapsed ? (
                    <div
                      className={`rounded-lg border h-full cursor-pointer ${col.colorClass} flex flex-col items-center gap-2 pt-3 pb-2 px-1`}
                      onClick={() => toggleColumn(col.key)}
                      title={`Expandir: ${col.label}`}
                    >
                      <ChevronRight className="h-4 w-4 shrink-0" />
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${col.dotColor}`} />
                      <span className="text-xs font-bold bg-background/80 rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                        {colHUs.length}
                      </span>
                      <span
                        className="text-[11px] font-semibold uppercase tracking-wider mt-1"
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
                    <>
                      <div className={`rounded-t-lg px-3 py-2.5 ${col.colorClass} border border-b-0`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleColumn(col.key)}
                              className="p-0.5 rounded hover:bg-background/30 transition-colors shrink-0"
                              title="Retrair coluna"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <div className={`h-2.5 w-2.5 rounded-full ${col.dotColor}`} />
                            <span className="text-xs font-semibold uppercase tracking-wider">{col.label}</span>
                          </div>
                          <span className="text-xs font-bold bg-background/80 rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                            {colHUs.length}
                          </span>
                        </div>
                      </div>
                      <DroppableColumn id={col.key}>
                        {colHUs.map((hu) => (
                          <DraggableCard key={hu.id} id={hu.id}>
                            <HUCard
                              hu={hu}
                              expanded={expandedHU === hu.id}
                              onToggleExpand={() => setExpandedHU(expandedHU === hu.id ? null : hu.id)}
                              onImpediment={() => setImpedimentDialog(hu.id)}
                              onResolveImpediment={(impId) => {
                                resolveImpediment(hu.id, impId);
                                toast.success("Impedimento resolvido!");
                              }}
                            />
                          </DraggableCard>
                        ))}
                      </DroppableColumn>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <DragOverlay>
            {activeHU && (
              <div className="opacity-90 rotate-2 scale-105">
                <HUCard
                  hu={activeHU}
                  expanded={false}
                  onToggleExpand={() => {}}
                  onImpediment={() => {}}
                  onResolveImpediment={() => {}}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <ImpedimentDialog huId={impedimentDialog} open={!!impedimentDialog} onClose={() => setImpedimentDialog(null)} />
    </div>
  );
}

// ─── Constantes de prioridade ────────────────────────────────────────────────
const PRIORITY_COLORS: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-info/15 text-info",
  alta: "bg-warning/15 text-warning",
  critica: "bg-destructive/15 text-destructive",
};

const PRIORITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

// ─── Helper ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─── HUCard ──────────────────────────────────────────────────────────────────
function HUCard({
  hu,
  expanded,
  onToggleExpand,
  onImpediment,
  onResolveImpediment,
}: {
  hu: UserStory;
  expanded: boolean;
  onToggleExpand: () => void;
  onImpediment: () => void;
  onResolveImpediment: (impId: string) => void;
}) {
  const { activities, developers, epics } = useSprint();
  const huActivities = activities.filter((a) => a.huId === hu.id);
  const overdue = isHUOverdue(hu, activities);
  const blocked = hasActiveImpediment(hu);
  const activeImpediments = (hu.impediments || []).filter((i) => !i.resolvedAt);
  const totalHours = huActivities.reduce((s, a) => s + a.hours, 0);
  const epic = hu.epicId ? epics.find((e) => e.id === hu.epicId) : null;

  // Responsável direto da HU (campo assigneeId)
  const assignee = hu.assigneeId ? (developers.find((d) => d.id === hu.assigneeId) ?? null) : null;

  // Assignees via activities (avatares no footer)
  const assignees = huActivities
    .map((a) => developers.find((d) => d.id === a.assigneeId))
    .filter((d, i, arr): d is NonNullable<typeof d> => !!d && arr.findIndex((x) => x?.id === d.id) === i);

  return (
    <Card
      className={`shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
        overdue ? "border-destructive border-2 bg-destructive/5" : ""
      } ${blocked ? "ring-2 ring-warning" : ""}`}
    >
      <CardContent className="p-3 space-y-2">
        {/* Badges de topo */}
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
          <Badge className={`text-[10px] px-1.5 ${PRIORITY_COLORS[hu.priority]}`}>{PRIORITY_LABELS[hu.priority]}</Badge>
          <SizeBadge sizeReference={hu.sizeReference} storyPoints={hu.storyPoints} />
          {overdue && (
            <Badge variant="destructive" className="text-[10px] px-1.5 gap-0.5">
              <AlertTriangle className="h-2.5 w-2.5" /> Atrasada
            </Badge>
          )}
          {blocked && (
            <Badge className="text-[10px] px-1.5 gap-0.5 bg-warning text-warning-foreground">
              <ShieldAlert className="h-2.5 w-2.5" /> Impedida
            </Badge>
          )}
        </div>

        {/* Título */}
        <p className="text-sm font-medium leading-tight">{hu.title}</p>

        {/* ── RESPONSÁVEL DA HU ── */}
        {assignee && (
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[7px] font-bold text-primary shrink-0">
              {getInitials(assignee.name)}
            </div>
            <span className="text-[11px] text-muted-foreground truncate">{assignee.name}</span>
          </div>
        )}

        {/* Impedimentos ativos */}
        {activeImpediments.length > 0 && (
          <div className="space-y-1">
            {activeImpediments.slice(0, 2).map((imp) => (
              <div
                key={imp.id}
                className="flex items-start gap-1 text-[10px] bg-warning/10 rounded p-1.5 border border-warning/20"
              >
                <ShieldAlert className="h-3 w-3 text-warning shrink-0 mt-0.5" />
                <div className="flex-1 space-y-0.5">
                  <span className="block line-clamp-1">{imp.reason}</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge className={`text-[8px] px-1 ${IMPEDIMENT_CRITICALITY_LABELS[imp.criticality].color}`}>
                      {IMPEDIMENT_CRITICALITY_LABELS[imp.criticality].label}
                    </Badge>
                    {imp.hasTicket && imp.ticketId && (
                      <Badge variant="outline" className="text-[8px] px-1 gap-0.5">
                        <Link2 className="h-2 w-2" />
                        {imp.ticketId}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-success hover:bg-success/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolveImpediment(imp.id);
                  }}
                >
                  <CheckCircle2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Footer: tarefas + avatares + impedimento */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {huActivities.length} tarefa{huActivities.length !== 1 ? "s" : ""}
            </button>
            <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {totalHours}h
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Avatares dos assignees via activities */}
            {assignees.length > 0 && (
              <div className="flex -space-x-1.5">
                {assignees.slice(0, 3).map((dev) => (
                  <div
                    key={dev.id}
                    className="h-5 w-5 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center text-[7px] font-bold text-primary"
                    title={dev.name}
                  >
                    {getInitials(dev.name)}
                  </div>
                ))}
                {assignees.length > 3 && (
                  <div className="h-5 w-5 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[7px] font-bold text-muted-foreground">
                    +{assignees.length - 3}
                  </div>
                )}
              </div>
            )}
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

        {/* Lista expandida de tarefas */}
        {expanded && huActivities.length > 0 && (
          <div className="space-y-1 pt-1">
            {huActivities.map((act) => {
              const dev = developers.find((d) => d.id === act.assigneeId);
              return (
                <div key={act.id} className="flex items-center gap-2 text-[11px] bg-muted/50 rounded px-2 py-1.5">
                  <Badge variant="outline" className="text-[8px] px-1">
                    {act.activityType === "bug" ? "🐛" : act.activityType === "architecture" ? "🏗️" : "📋"}
                  </Badge>
                  <span className="flex-1 truncate">{act.title}</span>
                  <div
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary text-[7px] font-bold shrink-0"
                    title={dev?.name}
                  >
                    {dev ? getInitials(dev.name) : "?"}
                  </div>
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
