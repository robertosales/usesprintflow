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
  Flag,
  Layers,
  GripVertical,
  Zap,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { ImpedimentDialog } from "@/components/ImpedimentManager";
import { QuickActivityDialog } from "@/components/QuickActivityDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
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

function daysLeft(endDate?: string): number | null {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  return diff;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: "Crítica", color: "#dc2626", bg: "#fef2f2" },
  high: { label: "Alta", color: "#ea580c", bg: "#fff7ed" },
  medium: { label: "Média", color: "#ca8a04", bg: "#fefce8" },
  low: { label: "Baixa", color: "#16a34a", bg: "#f0fdf4" },
};

// ── DnD Card (sortable) ───────────────────────────────────────────────────────
function DragCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
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
  const priority = hu.priority ? PRIORITY_CONFIG[hu.priority] : null;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={[
            "group relative bg-card rounded-xl border border-border/50",
            "shadow-[0_1px_2px_rgba(0,0,0,0.05),0_2px_8px_rgba(0,0,0,0.04)]",
            "hover:shadow-[0_2px_6px_rgba(0,0,0,0.08),0_6px_20px_rgba(0,0,0,0.06)]",
            "transition-all duration-200 overflow-hidden",
            "cursor-grab active:cursor-grabbing select-none",
            blocked ? "ring-1 ring-amber-400/60" : "",
            overdue && !blocked ? "ring-1 ring-red-400/40" : "",
          ].join(" ")}
        >
          {/* Barra de cor lateral esquerda */}
          <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ backgroundColor: accentHex }} />

          {/* Grip handle (visível no hover) */}
          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Corpo do card */}
          <div className="pl-4 pr-3 pt-3 pb-2.5">
            {/* Epic tag */}
            {epic && (
              <div className="mb-2">
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 tracking-wide"
                  style={{
                    backgroundColor: hexAlpha(epic.color, 0.12),
                    color: epic.color,
                  }}
                >
                  {epic.name}
                </span>
              </div>
            )}

            {/* Título */}
            <p className="text-[13px] font-medium leading-snug text-foreground mb-2.5 pr-5">
              {hu.title}
            </p>

            {/* Badges de estado */}
            {(blocked || overdue || isBug) && (
              <div className="flex flex-wrap gap-1 mb-2">
                {blocked && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                    <ShieldAlert className="h-3 w-3" /> Impedido
                  </span>
                )}
                {overdue && !blocked && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200">
                    <AlertTriangle className="h-3 w-3" /> Atrasado
                  </span>
                )}
                {isBug && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200">
                    <Bug className="h-3 w-3" /> Bug
                  </span>
                )}
              </div>
            )}

            {/* Barra de progresso */}
            {estH > 0 && (
              <div className="mb-2.5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-muted-foreground">{totalH}h / {estH}h</span>
                  <span className={`text-[10px] font-semibold ${over ? "text-red-500" : "text-muted-foreground"}`}>
                    {pct}%
                  </span>
                </div>
                <div className="h-1 bg-border/40 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: over ? "#ef4444" : accentHex }}
                  />
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-muted-foreground/60">{hu.code}</span>
                {hu.sizeReference && <SizeBadge size={hu.sizeReference} />}
                {priority && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                    style={{ backgroundColor: priority.bg, color: priority.color }}
                  >
                    {priority.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {huActs.length > 0 && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Zap className="h-3 w-3" />{huActs.length}
                  </span>
                )}
                {assignee && (
                  <div
                    className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: accentHex }}
                    title={assignee.name}
                  >
                    {initials(assignee.name)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expand button */}
          <button
            onClick={(e) => { e.stopPropagation(); onExpand(); }}
            className="w-full flex items-center justify-center py-1 border-t border-border/30 hover:bg-muted/30 transition-colors"
          >
            {expanded
              ? <ChevronDown className="h-3 w-3 text-muted-foreground/40" />
              : <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
          </button>

          {/* Expanded area */}
          {expanded && (
            <div className="px-4 pb-3 pt-1 border-t border-border/20 space-y-2">
              {/* Impedimentos ativos */}
              {activeImps.length > 0 && (
                <div className="space-y-1">
                  {activeImps.map((imp) => (
                    <div key={imp.id} className="flex items-start justify-between gap-2 text-[11px] bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-amber-700">
                          {IMPEDIMENT_CRITICALITY_LABELS[imp.criticality] ?? imp.criticality}
                        </span>
                        <span className="text-amber-600 ml-1 truncate">{imp.reason}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onResolveImpediment(imp.id); }}
                        className="flex-shrink-0 text-amber-600 hover:text-amber-800 transition-colors"
                        title="Resolver impedimento"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Ações */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); onImpediment(); }}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  <ShieldAlert className="h-3 w-3" /> Impedimento
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onAddTask(); }}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-background text-muted-foreground border border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <Zap className="h-3 w-3" /> Atividade
                </button>
              </div>
            </div>
          )}
        </div>
      </ContextMenuTrigger>

      {/* Context menu */}
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onExpand}>
          {expanded ? "Recolher card" : "Expandir card"}
        </ContextMenuItem>
        <ContextMenuItem onClick={onImpediment}>
          <ShieldAlert className="h-3.5 w-3.5 mr-2 text-amber-500" />
          Registrar impedimento
        </ContextMenuItem>
        <ContextMenuItem onClick={onAddTask}>
          <Zap className="h-3.5 w-3.5 mr-2" />
          Adicionar atividade
        </ContextMenuItem>
        {moveOptions && moveOptions.length > 0 && onMove && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />
              Mover para
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-44">
              {moveOptions.map((opt) => (
                <ContextMenuItem key={opt.key} onClick={() => onMove(opt.key)}>
                  {opt.label}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ── KanbanBoard ───────────────────────────────────────────────────────────────
export function KanbanBoard({
  sprintId,
  onOpenHU,
  onOpenWorkflow,
}: {
  sprintId: string | null;
  onOpenHU?: (hu: UserStory) => void;
  onOpenWorkflow?: () => void;
}) {
  const {
    userStories,
    workflowColumns,
    updateUserStoryStatus,
    reorderUserStories,
    addImpediment,
    resolveImpediment,
  } = useSprint();
  const { role } = useAuth();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [impedimentHuId, setImpedimentHuId] = useState<string | null>(null);
  const [quickActivityHuId, setQuickActivityHuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmMove, setConfirmMove] = useState<{ huId: string; toKey: string } | null>(null);
  const [expandedCols, setExpandedCols] = useState<Set<string>>(new Set(workflowColumns.map((c) => c.key)));

  const canMove = role === "admin" || role === "scrum_master" || role === "developer";

  // Cards do sprint atual, filtrados por busca e ordenados por position
  const sprintStories = useMemo(() => {
    const base = sprintId
      ? userStories.filter((h) => h.sprintId === sprintId)
      : userStories;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return base
      .filter((h) => h.title.toLowerCase().includes(q) || h.code.toLowerCase().includes(q))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [userStories, sprintId, searchQuery]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over) { setDragOverCol(null); return; }
      const overId = String(over.id);
      const isCol = workflowColumns.some((c) => c.key === overId);
      if (isCol) { setDragOverCol(overId); return; }
      const overHu = sprintStories.find((h) => h.id === overId);
      setDragOverCol(overHu?.status ?? null);
    },
    [workflowColumns, sprintStories],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setDragOverCol(null);
      if (!over || !canMove) return;

      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);
      if (activeIdStr === overIdStr) return;

      const draggedHu = sprintStories.find((h) => h.id === activeIdStr);
      if (!draggedHu) return;

      const isOverCol = workflowColumns.some((c) => c.key === overIdStr);
      const overHu = sprintStories.find((h) => h.id === overIdStr);
      const targetColKey = isOverCol ? overIdStr : (overHu?.status ?? null);
      if (!targetColKey) return;

      if (draggedHu.status === targetColKey) {
        // ── MESMA COLUNA: reordenar verticalmente ──────────────────────────
        const colItems = sprintStories
          .filter((h) => h.status === draggedHu.status)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

        const oldIdx = colItems.findIndex((h) => h.id === activeIdStr);
        const newIdx = colItems.findIndex((h) => h.id === overIdStr);
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;

        const reordered = arrayMove(colItems, oldIdx, newIdx);
        const updates = reordered.map((h, idx) => ({ id: h.id, position: idx }));
        reorderUserStories(updates);
      } else {
        // ── COLUNA DIFERENTE: pedir confirmação ────────────────────────────
        setConfirmMove({ huId: draggedHu.id, toKey: targetColKey });
      }
    },
    [canMove, sprintStories, workflowColumns, reorderUserStories],
  );

  const activeHu = activeId ? sprintStories.find((h) => h.id === activeId) : null;

  return (
    <>
      {/* Barra de busca */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar HU..."
            className="w-full pl-8 pr-8 py-1.5 text-sm bg-background border border-border/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 min-h-0">
          {workflowColumns.map((col) => {
            const colHex = getColumnHex(col);
            const colItems = sprintStories
              .filter((h) => h.status === col.key)
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            const isExpanded = expandedCols.has(col.key);
            const isOver = dragOverCol === col.key;

            return (
              <div
                key={col.key}
                className={[
                  "flex flex-col flex-shrink-0 rounded-xl transition-all duration-200",
                  "border border-border/40 bg-muted/30",
                  isExpanded ? "w-[280px]" : "w-12",
                  isOver ? "ring-2 ring-primary/30 bg-primary/5" : "",
                ].join(" ")}
              >
                {/* Cabeçalho da coluna */}
                <div
                  className="flex items-center justify-between px-3 py-2.5 cursor-pointer select-none"
                  onClick={() =>
                    setExpandedCols((prev) => {
                      const next = new Set(prev);
                      next.has(col.key) ? next.delete(col.key) : next.add(col.key);
                      return next;
                    })
                  }
                >
                  {isExpanded ? (
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: colHex }} />
                        <span className="text-xs font-semibold text-foreground truncate">{col.label}</span>
                        <span className="text-[10px] font-medium text-muted-foreground bg-background/60 rounded-full px-1.5 py-0.5 border border-border/40">
                          {colItems.length}
                          {col.wipLimit ? `/${col.wipLimit}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {onOpenWorkflow && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onOpenWorkflow(); }}
                            className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
                            title="Configurar workflow"
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center w-full gap-1.5 py-1">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: colHex }} />
                      <span
                        className="text-[10px] font-semibold text-muted-foreground"
                        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", letterSpacing: "0.05em" }}
                      >
                        {col.label}
                      </span>
                      <span className="text-[9px] text-muted-foreground/60">{colItems.length}</span>
                    </div>
                  )}
                </div>

                {/* Lista de cards */}
                {isExpanded && (
                  <SortableContext
                    items={colItems.map((h) => h.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col gap-2 px-2 pb-3 min-h-[60px]">
                      {colItems.map((hu) => {
                        const moveOptions = workflowColumns
                          .filter((c) => c.key !== hu.status)
                          .map((c) => ({ key: c.key, label: c.label }));
                        return (
                          <DragCard key={hu.id} id={hu.id}>
                            <HUCard
                              hu={hu}
                              accentHex={colHex}
                              expanded={expandedCards.has(hu.id)}
                              onExpand={() =>
                                setExpandedCards((prev) => {
                                  const next = new Set(prev);
                                  next.has(hu.id) ? next.delete(hu.id) : next.add(hu.id);
                                  return next;
                                })
                              }
                              onImpediment={() => setImpedimentHuId(hu.id)}
                              onResolveImpediment={(impId) => resolveImpediment(hu.id, impId)}
                              onAddTask={() => setQuickActivityHuId(hu.id)}
                              moveOptions={moveOptions}
                              onMove={(key) => setConfirmMove({ huId: hu.id, toKey: key })}
                            />
                          </DragCard>
                        );
                      })}
                      {colItems.length === 0 && (
                        <div className="flex items-center justify-center h-16 rounded-lg border border-dashed border-border/40 text-xs text-muted-foreground/50">
                          Arraste um card aqui
                        </div>
                      )}
                    </div>
                  </SortableContext>
                )}
              </div>
            );
          })}
        </div>

        {/* Ghost card durante o drag */}
        <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}>
          {activeHu && (
            <div className="rotate-1 opacity-90 scale-[1.02] shadow-xl">
              <HUCard
                hu={activeHu}
                accentHex={getColumnHex(
                  workflowColumns.find((c) => c.key === activeHu.status) ?? workflowColumns[0],
                )}
                expanded={false}
                onExpand={() => {}}
                onImpediment={() => {}}
                onResolveImpediment={() => {}}
                onAddTask={() => {}}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Diálogo de impedimento */}
      {impedimentHuId && (
        <ImpedimentDialog
          huId={impedimentHuId}
          open={!!impedimentHuId}
          onClose={() => setImpedimentHuId(null)}
        />
      )}

      {/* Diálogo de atividade rápida */}
      {quickActivityHuId && (
        <QuickActivityDialog
          huId={quickActivityHuId}
          open={!!quickActivityHuId}
          onClose={() => setQuickActivityHuId(null)}
        />
      )}

      {/* Confirmação de mover para outra coluna */}
      {confirmMove && (
        <AlertDialog open={!!confirmMove} onOpenChange={() => setConfirmMove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Mover HU para outra coluna
              </AlertDialogTitle>
              <AlertDialogDescription>
                Deseja mover esta HU para a coluna{" "}
                <strong>{workflowColumns.find((c) => c.key === confirmMove.toKey)?.label}</strong>?
                Esta ação irá alterar o status da HU.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmMove(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  await updateUserStoryStatus(confirmMove.huId, confirmMove.toKey as any);
                  setConfirmMove(null);
                  toast.success("HU movida com sucesso!");
                }}
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
