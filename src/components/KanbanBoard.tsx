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
          className={`flex flex-col items-center justify-center gap-1.5 h-20 rounded-xl border-2 border-dashed
            text-xs transition-all duration-200
            ${
              active
                ? "border-primary/50 bg-primary/5 text-primary scale-[1.01]"
                : "border-border/30 text-muted-foreground/40"
            }`}
        >
          {active ? (
            <>
              <Layers className="h-4 w-4" />
              <span>Soltar aqui</span>
            </>
          ) : (
            <>
              <Layers className="h-4 w-4 opacity-40" />
              <span>Vazio</span>
            </>
          )}
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
                    backgroundColor: epic.color + "1a",
                    color: epic.color,
                    border: `1px solid ${epic.color}35`,
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: epic.color }} />
                  {epic.name}
                </span>
              </div>
            )}

            {/* Título */}
            <p className="text-[13px] font-semibold leading-snug text-foreground line-clamp-2 mb-3 pr-4">{hu.title}</p>

            {/* Linha inferior: código + badges */}
            <div className="flex items-center justify-between gap-1.5">
              {/* Código */}
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: accentHex }}
                />
                {hu.code}
              </span>

              {/* Badges de status */}
              <div className="flex items-center gap-1 flex-wrap justify-end">
                {priority && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                    style={{ backgroundColor: priority.bg, color: priority.color }}
                  >
                    {priority.label}
                  </span>
                )}
                <SizeBadge sizeReference={hu.sizeReference} storyPoints={hu.storyPoints} />
                {isBug && (
                  <span className="flex items-center gap-0.5 text-[10px] bg-red-50 text-red-600 border border-red-200 rounded-md px-1.5 py-0.5 font-semibold dark:bg-red-950 dark:text-red-400 dark:border-red-800">
                    <Bug className="h-2.5 w-2.5" />
                    BUG
                  </span>
                )}
                {overdue && (
                  <span title="Atrasada" className="flex items-center">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                  </span>
                )}
                {blocked && (
                  <span title="Impedimento ativo" className="flex items-center">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                  </span>
                )}
              </div>
            </div>

            {/* Assignee + horas */}
            {(assignee || estH > 0) && (
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/40">
                {assignee ? (
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                      style={{
                        backgroundColor: hexAlpha(accentHex, 0.15),
                        color: accentHex,
                        boxShadow: `0 0 0 1.5px ${hexAlpha(accentHex, 0.3)}`,
                      }}
                    >
                      {initials(assignee.name)}
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate max-w-[80px]">
                      {assignee.name.split(" ")[0]}
                    </span>
                  </div>
                ) : (
                  <div />
                )}

                {estH > 0 && (
                  <span
                    className={`flex items-center gap-0.5 text-[11px] font-mono tabular-nums
                      ${over ? "text-red-500 font-semibold" : "text-muted-foreground"}`}
                  >
                    <Clock className="h-2.5 w-2.5 shrink-0" />
                    {totalH}/{estH}h
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Impedimentos ativos */}
          {activeImps.length > 0 && (
            <div className="px-3 pb-2.5 space-y-1.5">
              {activeImps.slice(0, 1).map((imp) => (
                <div
                  key={imp.id}
                  className="flex items-center gap-1.5 text-[11px] bg-amber-50 dark:bg-amber-950/40
                    rounded-lg px-2.5 py-1.5 border border-amber-200 dark:border-amber-800"
                >
                  <ShieldAlert className="h-3 w-3 text-amber-500 shrink-0" />
                  <span className="flex-1 truncate text-amber-800 dark:text-amber-300">{imp.reason}</span>
                  <button
                    className="text-emerald-600 hover:text-emerald-500 transition-colors shrink-0"
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
                <p className="text-[10px] text-amber-600 dark:text-amber-400 px-1">
                  +{activeImps.length - 1} impedimento(s)
                </p>
              )}
            </div>
          )}

          {/* Tarefas expandidas */}
          {expanded && huActs.length > 0 && (
            <div className="px-3 pb-2.5 pt-1.5 space-y-1 bg-muted/40 border-t border-border/40">
              {huActs.map((act) => {
                const dev = developers.find((d) => d.id === act.assigneeId);
                const typeIcon = act.activityType === "bug" ? "🐛" : act.activityType === "architecture" ? "🏗️" : "📋";
                return (
                  <div key={act.id} className="flex items-center gap-2 py-0.5 text-xs">
                    <span className="text-muted-foreground">{typeIcon}</span>
                    <span className="flex-1 truncate text-muted-foreground">{act.title}</span>
                    {dev && (
                      <span className="text-[9px] text-muted-foreground/60 shrink-0 font-mono">
                        {initials(dev.name)}
                      </span>
                    )}
                    <span className="font-mono text-[10px] text-muted-foreground/60 shrink-0">{act.hours}h</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Barra de progresso */}
          {estH > 0 && (
            <div className="h-[3px] bg-muted/60">
              <div
                className="h-full transition-all duration-500 rounded-r-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: over ? "#ef4444" : pct > 80 ? "#f59e0b" : accentHex,
                  opacity: 0.75,
                }}
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
      className="flex-shrink-0 w-10 flex flex-col items-center rounded-xl border border-border/50 bg-card
        shadow-[0_1px_2px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-md hover:scale-[1.03]
        transition-all duration-200 py-3 gap-3"
      style={{ borderTop: `3px solid ${accentHex}` }}
    >
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span
        className="text-[11px] font-bold flex-1 text-center leading-tight"
        style={{
          writingMode: "vertical-lr",
          transform: "rotate(180deg)",
          color: accentHex,
          letterSpacing: "0.05em",
        }}
      >
        {col.label}
      </span>
      <span
        className="text-[10px] font-bold rounded-full min-w-[18px] text-center py-0.5 px-1"
        style={{ backgroundColor: hexAlpha(accentHex, 0.15), color: accentHex }}
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
  wipLimit,
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
  wipLimit?: number;
}) {
  const overWip = wipLimit && hus.length > wipLimit;
  const wipPct = wipLimit ? Math.min((hus.length / wipLimit) * 100, 100) : 0;

  return (
    <div
      className={[
        "flex-shrink-0 w-[272px] flex flex-col rounded-xl border bg-card",
        "transition-all duration-200",
        dragOver
          ? "border-primary/40 shadow-[0_0_0_2px_rgba(1,105,111,0.15),0_4px_16px_rgba(0,0,0,0.1)]"
          : "border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
        overWip ? "border-orange-300 dark:border-orange-700" : "",
      ].join(" ")}
      style={{ borderTop: `3px solid ${accentHex}` }}
    >
      {/* Cabeçalho da coluna */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/40">
        <button onClick={onCollapse} className="p-0.5 rounded hover:bg-muted transition-colors" title="Retrair coluna">
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        <span className="flex-1 text-[11px] font-bold tracking-widest uppercase truncate" style={{ color: accentHex }}>
          {col.label}
        </span>

        {/* Contador com indicador WIP */}
        <div className="flex items-center gap-1">
          <span
            className={`text-[11px] font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center
              ${overWip ? "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400" : ""}`}
            style={!overWip ? { backgroundColor: hexAlpha(accentHex, 0.12), color: accentHex } : {}}
          >
            {hus.length}
          </span>
          {wipLimit && <span className="text-[10px] text-muted-foreground/60">/{wipLimit}</span>}
        </div>

        {onAddCard && (
          <button
            onClick={onAddCard}
            title="Adicionar HU nesta coluna"
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Configurações da coluna"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* WIP limit bar */}
      {wipLimit && (
        <div className="h-[2px] bg-muted/60">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${wipPct}%`,
              backgroundColor: overWip ? "#f97316" : hexAlpha(accentHex, 0.5),
            }}
          />
        </div>
      )}

      {/* Aviso WIP excedido */}
      {overWip && (
        <div
          className="mx-2 mt-2 flex items-center gap-1.5 text-[11px] text-orange-600 dark:text-orange-400
          bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-lg px-2.5 py-1.5"
        >
          <Zap className="h-3 w-3 shrink-0" />
          Limite WIP excedido ({hus.length}/{wipLimit})
        </div>
      )}

      {/* Cards */}
      <div className="p-2 overflow-y-auto flex-1 scrollbar-thin" style={{ maxHeight: "calc(100vh - 280px)" }}>
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

// ── Sprint progress bar ────────────────────────────────────────────────────────
function SprintProgressBar({
  name,
  done,
  total,
  open,
  endDate,
}: {
  name: string;
  done: number;
  total: number;
  open: number;
  endDate?: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const days = daysLeft(endDate);
  const isUrgent = days !== null && days <= 3;

  return (
    <div className="flex items-center gap-3 px-1">
      {/* Nome + dias */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[12px] font-bold text-foreground">{name}</span>
        {days !== null && (
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full
              ${
                isUrgent
                  ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                  : "bg-muted text-muted-foreground"
              }`}
          >
            {days < 0 ? `${Math.abs(days)}d atrasada` : days === 0 ? "Hoje" : `${days}d restantes`}
          </span>
        )}
      </div>

      {/* Barra de progresso */}
      <div className="flex-1 flex items-center gap-2 max-w-[220px]">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              backgroundColor: pct === 100 ? "#16a34a" : pct > 70 ? "#01696f" : "#0d9488",
            }}
          />
        </div>
        <span className="text-[11px] font-mono text-muted-foreground shrink-0 tabular-nums">
          {done}/{total}
        </span>
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
    updateSprint,
  } = useSprint();
  const { hasPermission } = useAuth();
  const canMove = hasPermission("move_kanban");
  const canCreate = hasPermission("create_backlog");
  const canCloseSprint = hasPermission("manage_sprints") || hasPermission("create_backlog");

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedHU, setExpandedHU] = useState<string | null>(null);
  const [impedimentDialog, setImpedimentDialog] = useState<string | null>(null);
  const [quickTaskHU, setQuickTaskHU] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [confirmCloseSprint, setConfirmCloseSprint] = useState(false);
  const [closingSprint, setClosingSprint] = useState(false);

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

  const huStats = useMemo(() => {
    if (!activeSprint) return { done: 0, total: 0, open: 0 };
    const lastCol = workflowColumns[workflowColumns.length - 1]?.key;
    const done = sprintStories.filter((h) => h.status === lastCol || h.status === "done").length;
    return { done, total: sprintStories.length, open: sprintStories.length - done };
  }, [activeSprint, sprintStories, workflowColumns]);

  const handleCloseSprint = async () => {
    if (!activeSprint) return;
    setClosingSprint(true);
    try {
      await updateSprint(activeSprint.id, { isActive: false });
      toast.success(`Sprint "${activeSprint.name}" encerrada com sucesso`);
      setConfirmCloseSprint(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao encerrar sprint");
    } finally {
      setClosingSprint(false);
    }
  };

  // Empty state — sem sprint ativa
  if (!activeSprint) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-2">
          <Layers className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="font-semibold text-foreground">Nenhuma Sprint ativa</p>
        <p className="text-sm text-muted-foreground max-w-[28ch]">
          Crie e ative uma Sprint na aba Backlog para usar o Board.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-1 flex-wrap">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar HU..."
            className="w-52 pl-9 pr-8 h-8 rounded-lg border border-border bg-card text-sm
              placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2
              focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Sprint progress */}
        <div className="flex-1 min-w-0">
          <SprintProgressBar
            name={activeSprint.name}
            done={huStats.done}
            total={huStats.total}
            open={huStats.open}
            endDate={activeSprint.endDate}
          />
        </div>

        {/* Encerrar sprint */}
        {canCloseSprint && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5
              hover:text-destructive shrink-0 text-xs"
            onClick={() => setConfirmCloseSprint(true)}
            title="Encerrar sprint atual"
          >
            <Flag className="h-3.5 w-3.5" />
            Encerrar
          </Button>
        )}
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragOver={(e) => {
          const overId = e.over?.id as string | undefined;
          if (!overId) {
            setDragOverCol(null);
            return;
          }
          const col = workflowColumns.find((c) => c.key === overId);
          if (col) {
            setDragOverCol(col.key);
            return;
          }
          const hu = sprintStories.find((h) => h.id === overId);
          if (hu) setDragOverCol(hu.status);
        }}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-2.5 overflow-x-auto pb-4 flex-1 items-start">
          {workflowColumns.map((col) => {
            const accentHex = getColumnHex(col);
            const hus = sprintStories.filter((h) => h.status === col.key);
            const wipLimit = (col as any).wipLimit as number | undefined;

            if (collapsed.has(col.key)) {
              return (
                <CollapsedColumn
                  key={col.key}
                  col={col}
                  count={hus.length}
                  accentHex={accentHex}
                  onClick={() => toggle(col.key)}
                />
              );
            }

            return (
              <ExpandedColumn
                key={col.key}
                col={col}
                hus={hus}
                accentHex={accentHex}
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
                wipLimit={wipLimit}
                onAddCard={
                  canCreate
                    ? () => {
                        toast.info("Use a aba Backlog para criar HUs e associá-las à sprint.");
                      }
                    : undefined
                }
              />
            );
          })}
        </div>

        {/* Ghost card durante drag */}
        <DragOverlay dropAnimation={{ duration: 160, easing: "cubic-bezier(0.16,1,0.3,1)" }}>
          {activeHU && (
            <div className="w-[272px] opacity-90 rotate-1 scale-[1.02] pointer-events-none">
              <HUCard
                hu={activeHU}
                accentHex={getColumnHex(workflowColumns.find((c) => c.key === activeHU.status) ?? workflowColumns[0])}
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

      {/* Dialog: Impedimento */}
      {impedimentDialog && (
        <ImpedimentDialog huId={impedimentDialog} open={!!impedimentDialog} onClose={() => setImpedimentDialog(null)} />
      )}

      {/* Dialog: Tarefa rápida */}
      {quickTaskHU && (
        <QuickActivityDialog huId={quickTaskHU} open={!!quickTaskHU} onClose={() => setQuickTaskHU(null)} />
      )}

      {/* Confirmar encerramento da sprint */}
      <AlertDialog open={confirmCloseSprint} onOpenChange={setConfirmCloseSprint}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar Sprint?</AlertDialogTitle>
            <AlertDialogDescription>
              A sprint <strong>{activeSprint.name}</strong> será marcada como encerrada.{" "}
              {huStats.open > 0 && (
                <span className="text-destructive font-medium">{huStats.open} HU(s) ainda não concluídas. </span>
              )}
              Você poderá criar uma nova sprint no Backlog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closingSprint}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseSprint}
              disabled={closingSprint}
              className="bg-destructive hover:bg-destructive/90"
            >
              {closingSprint ? "Encerrando..." : "Encerrar Sprint"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
