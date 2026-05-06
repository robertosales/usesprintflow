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
              {hu.description && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">{hu.description}</p>
              )}
              {activeImps.length > 0 && (
                <div className="space-y-1">
                  {activeImps.map((imp) => (
                    <div key={imp.id} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-amber-50 border border-amber-100">
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-semibold text-amber-700">
                            {IMPEDIMENT_CRITICALITY_LABELS[imp.criticality]} — {imp.reason}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onResolveImpediment(imp.id); }}
                        className="text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold whitespace-nowrap"
                      >
                        Resolver
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 gap-1" onClick={(e) => { e.stopPropagation(); onAddTask(); }}>
                  <Plus className="h-3 w-3" /> Atividade
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 gap-1" onClick={(e) => { e.stopPropagation(); onImpediment(); }}>
                  <ShieldAlert className="h-3 w-3" /> Impedimento
                </Button>
              </div>
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onClick={onAddTask} className="gap-2 text-xs">
          <Plus className="h-3.5 w-3.5" /> Nova atividade
        </ContextMenuItem>
        <ContextMenuItem onClick={onImpediment} className="gap-2 text-xs">
          <ShieldAlert className="h-3.5 w-3.5" /> Registrar impedimento
        </ContextMenuItem>
        {moveOptions && moveOptions.length > 0 && onMove && (
          <ContextMenuSub>
            <ContextMenuSubTrigger className="gap-2 text-xs">
              <ArrowRightLeft className="h-3.5 w-3.5" /> Mover para
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {moveOptions.map((opt) => (
                <ContextMenuItem key={opt.key} onClick={() => onMove(opt.key)} className="text-xs">
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

  const sprintStories = useMemo(() => {
    const base = sprintId
      ? userStories.filter((h) => h.sprintId === sprintId)
      : userStori