import { useState, useMemo, useCallback, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useSprint } from "@/contexts/SprintContext";
import { KanbanCard } from "./KanbanCard";
import { KanbanStatus } from "@/types/sprint";
import { toast } from "sonner";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { WorkflowColumn } from "@/types/sprint";
import { Button } from "./ui/button";

// Mapa de cores padrao por coluna
const COLUMN_COLORS: Record<string, string> = {
  backlog:     "#6b7280",
  todo:        "#3b82f6",
  in_progress: "#f59e0b",
  review:      "#8b5cf6",
  done:        "#10b981",
};

function getColumnHex(col: WorkflowColumn): string {
  if (col.hex) return col.hex;
  return COLUMN_COLORS[col.key] ?? "#6b7280";
}

interface Props {
  sprintId?: string;
}

export function KanbanBoard({ sprintId }: Props) {
  const {
    userStories,
    workflowColumns,
    updateUserStoryStatus,
    reorderUserStories,
  } = useSprint() as any;

  const canMove = true;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmMove, setConfirmMove] = useState<{ huId: string; toKey: string } | null>(null);
  const [expandedCols, setExpandedCols] = useState<Set<string>>(new Set(workflowColumns.map((c) => c.key)));

  // Estado local de posicoes - atualizado otimisticamente no drag
  const [localPositions, setLocalPositions] = useState<Record<string, number>>({});

  // Sincroniza com o banco quando userStories muda (ex: outro usuario move card)
  useEffect(() => {
    setLocalPositions((prev) => {
      const next = { ...prev };
      userStories.forEach((h) => {
        if (!activeId) next[h.id] = h.position ?? 0;
      });
      return next;
    });
  }, [userStories, activeId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const sprintStories = useMemo(() => {
    const base = sprintId
      ? userStories.filter((h) => h.sprintId === sprintId)
      : userStories;
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? base.filter((h) => h.title.toLowerCase().includes(q) || h.code.toLowerCase().includes(q))
      : base;
    return [...filtered].sort(
      (a, b) => (localPositions[a.id] ?? a.position ?? 0) - (localPositions[b.id] ?? b.position ?? 0),
    );
  }, [userStories, sprintId, searchQuery, localPositions]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveId(String(event.active.id));
    },
    [],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over) { setDragOverCol(null); return; }
      const overId = String(over.id);
      const colKey = workflowColumns.find((c) => c.key === overId)?.key;
      if (colKey) { setDragOverCol(colKey); return; }
      const overHu = sprintStories.find((h) => h.id === overId);
      setDragOverCol(overHu?.status ?? null);
    },
    [workflowColumns, sprintStories],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      setDragOverCol(null);

      const { active, over } = event;
      if (!over || !canMove) return;

      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);
      if (activeIdStr === overIdStr) return;

      const draggedHu = sprintStories.find((h) => h.id === activeIdStr);
      if (!draggedHu) return;

      const targetColKey =
        workflowColumns.find((c) => c.key === overIdStr)?.key ??
        sprintStories.find((h) => h.id === overIdStr)?.status;
      if (!targetColKey) return;

      if (draggedHu.status === targetColKey) {
        // MESMA COLUNA: reordenar verticalmente
        const colItems = sprintStories.filter((h) => h.status === draggedHu.status);
        const oldIdx = colItems.findIndex((h) => h.id === activeIdStr);
        const newIdx = colItems.findIndex((h) => h.id === overIdStr);
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
        const reordered = arrayMove(colItems, oldIdx, newIdx);
        const updates = reordered.map((h, idx) => ({ id: h.id, position: idx }));
        setLocalPositions((prev) => {
          const next = { ...prev };
          updates.forEach(({ id, position }) => { next[id] = position; });
          return next;
        });
        reorderUserStories(updates);
      } else {
        // COLUNA DIFERENTE: pedir confirmacao
        setConfirmMove({ huId: draggedHu.id, toKey: targetColKey });
      }
    },
    [canMove, sprintStories, workflowColumns, reorderUserStories],
  );

  const handleConfirmMove = useCallback(async () => {
    if (!confirmMove) return;
    try {
      await updateUserStoryStatus(confirmMove.huId, confirmMove.toKey as KanbanStatus);
      toast.success("Card movido com sucesso");
    } catch {
      toast.error("Erro ao mover card");
    } finally {
      setConfirmMove(null);
    }
  }, [confirmMove, updateUserStoryStatus]);

  const activeHu = activeId ? sprintStories.find((h) => h.id === activeId) : null;

  return (
    <>
      {/* Busca */}
      <div className="mb-4 relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar card..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 items-start">
          {workflowColumns.map((col) => {
            const colHex = getColumnHex(col);
            const colItems = sprintStories.filter((h) => h.status === col.key);
            const isExpanded = expandedCols.has(col.key);
            const isOver = dragOverCol === col.key;

            return (
              <div
                key={col.key}
                className={`flex flex-col rounded-xl border transition-all duration-200 ${
                  isOver ? "ring-2 ring-offset-1" : "ring-0"
                }`}
                style={{
                  minWidth: 240,
                  width: 260,
                  background: `color-mix(in srgb, ${colHex} 5%, var(--background))`,
                  borderColor: `color-mix(in srgb, ${colHex} 30%, transparent)`,
                  ...(isOver ? { "--tw-ring-color": colHex } as React.CSSProperties : {}),
                }}
              >
                {/* Cabecalho da coluna */}
                <div
                  className="flex items-center justify-between px-3 py-2.5 rounded-t-xl cursor-pointer select-none"
                  style={{ borderBottom: `2px solid ${colHex}` }}
                  onClick={() =>
                    setExpandedCols((prev) => {
                      const next = new Set(prev);
                      if (next.has(col.key)) next.delete(col.key);
                      else next.add(col.key);
                      return next;
                    })
                  }
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isExpanded
                      ? <ChevronDown className="h-3 w-3 shrink-0" style={{ color: colHex }} />
                      : <ChevronRight className="h-3 w-3 shrink-0" style={{ color: colHex }} />}
                    <span
                      className="text-xs font-semibold truncate uppercase tracking-wider"
                      style={{ color: colHex }}
                    >
                      {col.label}
                    </span>
                  </div>
                  <span
                    className="text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-full ml-2 shrink-0"
                    style={{
                      background: `color-mix(in srgb, ${colHex} 18%, transparent)`,
                      color: colHex,
                    }}
                  >
                    {colItems.length}
                  </span>
                </div>

                {/* Lista de cards */}
                {isExpanded && (
                  <SortableContext
                    items={colItems.map((h) => h.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div
                      id={col.key}
                      className="flex flex-col gap-2 p-2 min-h-[80px] max-h-[calc(100vh-260px)] overflow-y-auto"
                    >
                      {colItems.map((hu) => {
                        const isDragging = hu.id === activeId;
                        return (
                          <div
                            key={hu.id}
                            style={{ opacity: isDragging ? 0.3 : 1, transition: "opacity 0.15s" }}
                          >
                            <KanbanCard hu={hu} colHex={colHex} />
                          </div>
                        );
                      })}

                      {/* Drop zone vazia */}
                      {colItems.length === 0 && (
                        <div
                          className="flex items-center justify-center h-16 rounded-lg border-2 border-dashed text-[11px] text-muted-foreground/50 transition-colors"
                          style={{
                            borderColor: isOver
                              ? `color-mix(in srgb, ${colHex} 50%, transparent)`
                              : undefined,
                            color: isOver ? colHex : undefined,
                          }}
                        >
                          {isOver ? "Soltar aqui" : "Sem cards"}
                        </div>
                      )}
                    </div>
                  </SortableContext>
                )}
              </div>
            );
          })}
        </div>

        {/* Overlay do card sendo arrastado */}
        <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
          {activeHu && (
            <div
              className="rotate-1 scale-105 shadow-2xl rounded-xl opacity-95 pointer-events-none"
              style={{ width: 252 }}
            >
              <KanbanCard hu={activeHu} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Dialog de confirmacao de mudanca de coluna */}
      <AlertDialog open={!!confirmMove} onOpenChange={(o) => !o && setConfirmMove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover card?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja mover este card para a coluna{" "}
              <strong>
                {workflowColumns.find((c) => c.key === confirmMove?.toKey)?.label ?? confirmMove?.toKey}
              </strong>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMove}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
