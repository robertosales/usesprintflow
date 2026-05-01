import { useState, useMemo, useCallback } from "react";
import { SizeBadge } from "@/components/SizeBadge";
import { useSprint } from "@/contexts/SprintContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  isHUOverdue,
  hasActiveImpediment,
  getColumnHex,
  IMPEDIMENT_CRITICALITY_LABELS,
  UserStory,
  WorkflowColumn,
} from "@/types/sprint";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronDown,
  Plus,
  Settings2,
  Search,
  X,
  Bug,
  ArrowRightLeft,
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

// ── helpers ──────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function hexAlpha(hex: string, a: number) {
  const c = hex.replace("#", "");
  return `rgba(${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)},${a})`;
}

// ── DnD primitives ────────────────────────────────────────────────────────────
function DroppableZone({
  id,
  children,
  empty,
  over,
}: {
  id: string;
  children: React.ReactNode;
  empty: boolean;
  over: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const active = over || isOver;
  return (
    <div ref={setNodeRef} className="flex flex-col gap-2 min-h-[60px]">
      {empty ? (
        <div
          className={`flex items-center justify-center h-14 rounded-lg border-2 border-dashed text-xs transition-colors
            ${active ? "border-primary/50 bg-primary/5 text-primary" : "border-border/30 text-muted-foreground/50"}`}
        >
          {active ? "Soltar aqui" : "—"}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function DragCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

// ── HU Card ───────────────────────────────────────────────────────────────────
function HUCard({
  hu,
  accentHex,
  expanded,
  onExpand,
  onImpediment,
  onResolveImpediment,
  onAddTask,
  moveOptions,
  onMove,
}: {
  hu: UserStory;
  accentHex: string;
  expanded: boolean;
  onExpand: () => void;
  onImpediment: () => void;
  onResolveImpediment: (id: string) => void;
  onAddTask: () => void;
  moveOptions?: { key: string; label: string }[];
  onMove?: (key: string) => void;
}) {
  const { activities, developers, epics } = useSprint();
  const huActs = activities.filter((a) => a.huId === hu.id);
  const overdue = isHUOverdue(hu, activities);
  const blocked = hasActiveImpediment(hu);
  const activeImps = (hu.impediments ?? []).filter((i) => !i.resolvedAt);
  const totalH = huActs.reduce((s, a) => s + a.hours, 0);
  const estH = hu.estimatedHours ?? 0;
  const pct = estH > 0 ? Math.min(Math.round((totalH / estH) * 100), 100) : 0;
  const over = estH > 0 && totalH > estH;
  const isBug = hu.status === "bug";
  const epic = hu.epicId ? epics.find((e) => e.id === hu.epicId) : null;
  const assignee = hu.assigneeId ? developers.find((d) => d.id === hu.assigneeId) : null;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={[
            "bg-white rounded-lg border border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
            "hover:shadow-[0_3px_10px_rgba(0,0,0,0.1)] transition-all duration-150 overflow-hidden",
            "cursor-grab active:cursor-grabbing select-none",
            blocked ? "ring-1 ring-amber-400/50" : "",
          ].join(" ")}
        >
          {/* top accent line */}
          <div className="h-0.5" style={{ backgroundColor: accentHex }} />

          {/* body */}
          <div className="p-3">
            {/* title */}
            <p className="text-[13px] font-semibold leading-snug text-gray-800 line-clamp-2 mb-2">{hu.title}</p>

            {/* epic tag */}
            {epic && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 mb-2"
                style={{ backgroundColor: epic.color + "18", color: epic.color, border: `1px solid ${epic.color}40` }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: epic.color }} />
                {epic.name}
              </span>
            )}

            {/* HU code row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="font-mono font-medium">{hu.code}</span>
              </div>

              <div className="flex items-center gap-1">
                <SizeBadge sizeReference={hu.sizeReference} storyPoints={hu.storyPoints} />
                {isBug && (
                  <span className="flex items-center gap-0.5 text-[10px] bg-red-50 text-red-600 border border-red-200 rounded px-1.5 py-0.5">
                    <Bug className="h-2.5 w-2.5" /> BUG
                  </span>
                )}
                {overdue && <AlertTriangle className="h-3 w-3 text-red-400" />}
                {blocked && <ShieldAlert className="h-3 w-3 text-amber-500" />}
              </div>
            </div>

            {/* assignee + hours */}
            {(assignee || estH > 0) && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                {assignee ? (
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{ backgroundColor: hexAlpha(accentHex, 0.15), color: accentHex }}
                    >
                      {initials(assignee.name)}
                    </div>
                    <span className="text-[11px] text-gray-500">{assignee.name.split(" ")[0]}</span>
                  </div>
                ) : (
                  <div />
                )}
                {estH > 0 && (
                  <span
                    className={`flex items-center gap-0.5 text-[11px] font-mono ${over ? "text-red-500" : "text-gray-400"}`}
                  >
                    <Clock className="h-2.5 w-2.5" />
                    {totalH}/{estH}h
                  </span>
                )}
              </div>
            )}

            {/* sprint tag (using HU tags) */}
            {(hu.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {hu.tags!.slice(0, 3).map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: i % 2 === 0 ? "#fff3e0" : "#e8f5e9",
                      color: i % 2 === 0 ? "#e65100" : "#2e7d32",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* impedimentos ativos */}
          {activeImps.length > 0 && (
            <div className="mx-3 mb-2 space-y-1">
              {activeImps.slice(0, 1).map((imp) => (
                <div
                  key={imp.id}
                  className="flex items-center gap-1.5 text-[11px] bg-amber-50 rounded px-2 py-1 border border-amber-200"
                >
                  <ShieldAlert className="h-3 w-3 text-amber-500 shrink-0" />
                  <span className="flex-1 truncate text-amber-800">{imp.reason}</span>
                  <button
                    className="text-emerald-600 hover:text-emerald-700 transition-colors"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onResolveImpediment(imp.id);
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {activeImps.length > 1 && (
                <p className="text-[10px] text-amber-600 px-1">+{activeImps.length - 1} impedimento(s)</p>
              )}
            </div>
          )}

          {/* tasks expandidas */}
          {expanded && huActs.length > 0 && (
            <div className="px-3 pb-2 space-y-1 bg-gray-50 border-t border-gray-100">
              {huActs.map((act) => {
                const dev = developers.find((d) => d.id === act.assigneeId);
                return (
                  <div key={act.id} className="flex items-center gap-2 py-0.5 text-xs">
                    <span className="text-gray-400">
                      {act.activityType === "bug" ? "🐛" : act.activityType === "architecture" ? "🏗️" : "📋"}
                    </span>
                    <span className="flex-1 truncate text-gray-600">{act.title}</span>
                    {dev && <span className="text-[9px] text-gray-400 shrink-0">{initials(dev.name)}</span>}
                    <span className="font-mono text-[10px] text-gray-400 shrink-0">{act.hours}h</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* progress bar */}
          {estH > 0 && (
            <div className="h-0.5 bg-gray-100">
              <div
                className={`h-full transition-all ${over ? "bg-red-400" : pct > 80 ? "bg-amber-400" : "bg-emerald-400"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        <ContextMenuItem onClick={onExpand}>{expanded ? "Recolher tarefas" : "Ver tarefas"}</ContextMenuItem>
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
                  {opt.key === hu.status && <span className="ml-auto text-[10px] text-muted-foreground">atual</span>}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ── Collapsed column strip ────────────────────────────────────────────────────
function CollapsedColumn({
  col,
  count,
  onClick,
  accentHex,
}: {
  col: WorkflowColumn;
  count: number;
  onClick: () => void;
  accentHex: string;
}) {
  return (
    <div
      onClick={onClick}
      title={`Expandir: ${col.label}`}
      className="flex-shrink-0 w-10 flex flex-col items-center rounded-xl border border-border/60 bg-white
        shadow-[0_1px_3px_rgba(0,0,0,0.06)] cursor-pointer hover:shadow-md transition-all duration-200 py-3 gap-3"
      style={{ borderTop: `3px solid ${accentHex}` }}
    >
      <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
      <span
        className="text-[11px] font-bold flex-1 text-center leading-tight"
        style={{
          writingMode: "vertical-lr",
          transform: "rotate(180deg)",
          color: accentHex,
          letterSpacing: "0.04em",
        }}
      >
        {col.label}
      </span>
      <span
        className="text-[10px] font-bold rounded-full min-w-[18px] text-center py-0.5 px-1"
        style={{ backgroundColor: hexAlpha(accentHex, 0.12), color: accentHex }}
      >
        {count}
      </span>
    </div>
  );
}

// ── Expanded column ───────────────────────────────────────────────────────────
function ExpandedColumn({
  col,
  hus,
  accentHex,
  dragOver,
  onCollapse,
  expandedHU,
  setExpandedHU,
  setImpedimentDialog,
  setQuickTaskHU,
  resolveImpediment,
  updateUserStoryStatus,
  workflowColumns,
  canMove,
  onAddCard,
}: {
  col: WorkflowColumn;
  hus: UserStory[];
  accentHex: string;
  dragOver: boolean;
  onCollapse: () => void;
  expandedHU: string | null;
  setExpandedHU: (id: string | null) => void;
  setImpedimentDialog: (id: string) => void;
  setQuickTaskHU: (id: string) => void;
  resolveImpediment: (huId: string, impId: string) => void;
  updateUserStoryStatus: (id: string, status: string) => void;
  workflowColumns: WorkflowColumn[];
  canMove: boolean;
  onAddCard?: () => void;
}) {
  return (
    <div
      className={[
        "flex-shrink-0 w-[280px] flex flex-col rounded-xl border border-border/60 bg-white",
        "shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all duration-200",
        dragOver ? "ring-2 ring-primary/30 shadow-md" : "",
      ].join(" ")}
      style={{ borderTop: `3px solid ${accentHex}` }}
    >
      {/* header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
        <button
          onClick={onCollapse}
          className="p-0.5 rounded hover:bg-gray-100 transition-colors"
          title="Retrair coluna"
        >
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </button>

        <span className="flex-1 text-[12px] font-bold tracking-wide uppercase truncate" style={{ color: accentHex }}>
          {col.label}
        </span>

        <span
          className="text-[11px] font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center"
          style={{ backgroundColor: hexAlpha(accentHex, 0.12), color: accentHex }}
        >
          {hus.length}
        </span>

        {onAddCard && (
          <button
            onClick={onAddCard}
            title="Adicionar HU nesta coluna"
            className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
        <button className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* cards */}
      <div className="p-2 overflow-y-auto flex-1" style={{ maxHeight: "calc(100vh - 260px)" }}>
        <DroppableZone id={col.key} empty={hus.length === 0} over={dragOver}>
          {hus.map((hu) => (
            <div key={hu.id} className="mb-2">
              <DragCard id={hu.id}>
                <HUCard
                  hu={hu}
                  accentHex={accentHex}
                  expanded={expandedHU === hu.id}
                  onExpand={() => setExpandedHU(expandedHU === hu.id ? null : hu.id)}
                  onImpediment={() => setImpedimentDialog(hu.id)}
                  onResolveImpediment={(impId) => {
                    resolveImpediment(hu.id, impId);
                    toast.success("Impedimento resolvido!");
                  }}
                  onAddTask={() => setQuickTaskHU(hu.id)}
                  moveOptions={workflowColumns.map((c) => ({ key: c.key, label: c.label }))}
                  onMove={(key) => {
                    if (!canMove) {
                      toast.error("Sem permissão para mover HUs.");
                      return;
                    }
                    if (hu.status === key) return;
                    updateUserStoryStatus(hu.id, key);
                    toast.success(`Movida para "${workflowColumns.find((c) => c.key === key)?.label ?? key}"`);
                  }}
                />
              </DragCard>
            </div>
          ))}
        </DroppableZone>
      </div>
    </div>
  );
}

// ── Main Board ────────────────────────────────────────────────────────────────
export function KanbanBoard() {
  const {
    activities,
    userStories,
    developers,
    epics,
    updateUserStoryStatus,
    resolveImpediment,
    activeSprint,
    workflowColumns,
    addUserStory,
  } = useSprint();
  const { hasPermission } = useAuth();
  const canMove = hasPermission("move_kanban");
  const canCreate = hasPermission("create_backlog");

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedHU, setExpandedHU] = useState<string | null>(null);
  const [impedimentDialog, setImpedimentDialog] = useState<string | null>(null);
  const [quickTaskHU, setQuickTaskHU] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const toggle = useCallback(
    (key: string) =>
      setCollapsed((prev) => {
        const n = new Set(prev);
        n.has(key) ? n.delete(key) : n.add(key);
        return n;
      }),
    [],
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const sprintStories = useMemo(() => {
    if (!activeSprint) return [];
    let s = userStories.filter((hu) => hu.sprintId === activeSprint.id);
    if (search) {
      const q = search.toLowerCase();
      s = s.filter((hu) => hu.title.toLowerCase().includes(q) || hu.code.toLowerCase().includes(q));
    }
    return s;
  }, [activeSprint, userStories, search]);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    setDragOverCol(null);
    if (!over || !canMove) return;
    const hu = sprintStories.find((h) => h.id === active.id);
    if (!hu) return;
    const colKey =
      workflowColumns.find((c) => c.key === over.id)?.key ?? sprintStories.find((h) => h.id === over.id)?.status;
    if (colKey && hu.status !== colKey) {
      updateUserStoryStatus(hu.id, colKey);
      toast.success(`HU movida para "${workflowColumns.find((c) => c.key === colKey)?.label ?? colKey}"`);
    }
  };

  const activeHU = activeId ? sprintStories.find((h) => h.id === activeId) : null;

  if (!activeSprint) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3 text-gray-400">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="opacity-40"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
        <p className="font-medium text-gray-500">Nenhuma Sprint ativa</p>
        <p className="text-sm">Crie e ative uma Sprint na aba Backlog para usar o Board.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* top bar */}
      <div className="flex items-center gap-3 px-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full pl-9 pr-3 h-9 rounded-lg border border-gray-200 bg-white text-sm
              placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Badge variant="outline" className="text-xs font-mono gap-1 h-9 px-3">
          {activeSprint.name}
          <span className="text-muted-foreground">· {sprintStories.length} HUs</span>
        </Badge>
      </div>

      {/* board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-2 pb-4 overflow-x-auto flex-1" style={{ minHeight: 120 }}>
          {workflowColumns.map((col) => {
            const hex = getColumnHex(col);
            const hus = sprintStories.filter((hu) => (hu.status || workflowColumns[0]?.key) === col.key);
            const isCollapsed = collapsed.has(col.key);

            if (isCollapsed) {
              return (
                <CollapsedColumn
                  key={col.key}
                  col={col}
                  count={hus.length}
                  accentHex={hex}
                  onClick={() => toggle(col.key)}
                />
              );
            }
            return (
              <ExpandedColumn
                key={col.key}
                col={col}
                hus={hus}
                accentHex={hex}
                dragOver={dragOverCol === col.key}
                onCollapse={() => toggle(col.key)}
                expandedHU={expandedHU}
                setExpandedHU={setExpandedHU}
                setImpedimentDialog={setImpedimentDialog}
                setQuickTaskHU={setQuickTaskHU}
                resolveImpediment={resolveImpediment}
                updateUserStoryStatus={updateUserStoryStatus}
                workflowColumns={workflowColumns}
                canMove={canMove}
                onAddCard={
                  canCreate && activeSprint
                    ? () => {
                        const title = window.prompt("Título da nova HU:");
                        if (!title || !title.trim()) return;
                        addUserStory({
                          title: title.trim(),
                          description: "",
                          storyPoints: 0,
                          priority: "media",
                          sprintId: activeSprint.id,
                          status: col.key,
                          customFields: {},
                        } as any)
                          .then(() => toast.success(`HU criada em "${col.label}"`))
                          .catch(() => toast.error("Erro ao criar HU"));
                      }
                    : undefined
                }
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeHU &&
            (() => {
              const col = workflowColumns.find((c) => c.key === activeHU.status);
              const hex = col ? getColumnHex(col) : "#94a3b8";
              return (
                <div className="rotate-2 scale-105 shadow-2xl pointer-events-none opacity-90">
                  <HUCard
                    hu={activeHU}
                    accentHex={hex}
                    expanded={false}
                    onExpand={() => {}}
                    onImpediment={() => {}}
                    onResolveImpediment={() => {}}
                    onAddTask={() => {}}
                  />
                </div>
              );
            })()}
        </DragOverlay>
      </DndContext>

      <ImpedimentDialog huId={impedimentDialog} open={!!impedimentDialog} onClose={() => setImpedimentDialog(null)} />
      {quickTaskHU && (
        <QuickActivityDialog open={!!quickTaskHU} onClose={() => setQuickTaskHU(null)} huId={quickTaskHU} />
      )}
    </div>
  );
}
