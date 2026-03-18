import { useState, useCallback } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { KANBAN_COLUMNS, KanbanStatus, isOverdue, hasActiveImpediment, ACTIVITY_TYPE_LABELS, IMPEDIMENT_CRITICALITY_LABELS, IMPEDIMENT_TYPE_LABELS } from "@/types/sprint";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Clock, AlertTriangle, ShieldAlert, CheckCircle2, ExternalLink, Link2, GripVertical } from "lucide-react";
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
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

function DraggableCard({ activity, children }: { activity: { id: string }; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
  });
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

export function KanbanBoard() {
  const { activities, userStories, developers, updateActivityStatus, resolveImpediment, activeSprint } = useSprint();
  const [impedimentDialog, setImpedimentDialog] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const sprintStories = activeSprint
    ? userStories.filter((hu) => hu.sprintId === activeSprint.id)
    : [];
  const sprintActivities = activities.filter((a) =>
    sprintStories.some((hu) => hu.id === a.huId)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activityId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    const targetColumn = KANBAN_COLUMNS.find((c) => c.key === overId);
    if (targetColumn) {
      const act = activities.find((a) => a.id === activityId);
      if (act && act.status !== targetColumn.key) {
        updateActivityStatus(activityId, targetColumn.key);
        toast.success(`Movido para ${targetColumn.label}`);
      }
      return;
    }

    // Dropped on another card - find which column that card is in
    const targetActivity = activities.find((a) => a.id === overId);
    if (targetActivity) {
      const act = activities.find((a) => a.id === activityId);
      if (act && act.status !== targetActivity.status) {
        updateActivityStatus(activityId, targetActivity.status);
        const col = KANBAN_COLUMNS.find((c) => c.key === targetActivity.status);
        toast.success(`Movido para ${col?.label}`);
      }
    }
  };

  const activeActivity = activeId ? sprintActivities.find((a) => a.id === activeId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">Board</h2>
        {activeSprint && (
          <Badge variant="outline" className="text-xs font-mono">
            {activeSprint.name} • {sprintActivities.length} itens
          </Badge>
        )}
      </div>

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
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
            {KANBAN_COLUMNS.map((col) => {
              const colActivities = sprintActivities.filter((a) => a.status === col.key);
              return (
                <div key={col.key} className="min-w-[280px] w-[280px] flex-shrink-0">
                  <div className={`rounded-t-lg px-3 py-2.5 ${col.colorClass} border border-b-0`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${col.dotColor}`} />
                        <span className="text-xs font-semibold uppercase tracking-wider">{col.label}</span>
                      </div>
                      <span className="text-xs font-bold bg-background/80 rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                        {colActivities.length}
                      </span>
                    </div>
                  </div>
                  <DroppableColumn id={col.key}>
                    {colActivities.map((act) => (
                      <DraggableCard key={act.id} activity={act}>
                        <ActivityCard
                          act={act}
                          onImpediment={() => setImpedimentDialog(act.id)}
                          onResolveImpediment={(impId) => {
                            resolveImpediment(act.id, impId);
                            toast.success("Impedimento resolvido!");
                          }}
                        />
                      </DraggableCard>
                    ))}
                  </DroppableColumn>
                </div>
              );
            })}
          </div>

          <DragOverlay>
            {activeActivity && (
              <div className="opacity-90 rotate-2 scale-105">
                <ActivityCard
                  act={activeActivity}
                  onImpediment={() => {}}
                  onResolveImpediment={() => {}}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <ImpedimentDialog
        activityId={impedimentDialog}
        open={!!impedimentDialog}
        onClose={() => setImpedimentDialog(null)}
      />
    </div>
  );
}

function ActivityCard({
  act,
  onImpediment,
  onResolveImpediment,
}: {
  act: ReturnType<typeof useSprint>["activities"][0];
  onImpediment: () => void;
  onResolveImpediment: (impId: string) => void;
}) {
  const { userStories, developers } = useSprint();
  const hu = userStories.find((h) => h.id === act.huId);
  const dev = developers.find((d) => d.id === act.assigneeId);
  const overdue = isOverdue(act);
  const blocked = hasActiveImpediment(act);
  const activeImpediments = (act.impediments || []).filter((i) => !i.resolvedAt);
  const typeInfo = ACTIVITY_TYPE_LABELS[act.activityType || "task"];

  return (
    <Card
      className={`shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
        overdue ? "border-destructive border-2 bg-destructive/5" : ""
      } ${blocked ? "ring-2 ring-warning" : ""}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="font-mono text-[10px] px-1.5">{hu?.code}</Badge>
          <Badge className={`text-[10px] px-1.5 border ${typeInfo.color}`}>{typeInfo.label}</Badge>
          {overdue && (
            <Badge variant="destructive" className="text-[10px] px-1.5 gap-0.5">
              <AlertTriangle className="h-2.5 w-2.5" /> Atrasado
            </Badge>
          )}
          {blocked && (
            <Badge className="text-[10px] px-1.5 gap-0.5 bg-warning text-warning-foreground">
              <ShieldAlert className="h-2.5 w-2.5" /> Bloqueado
            </Badge>
          )}
        </div>

        <p className="text-sm font-medium leading-tight">{act.title}</p>

        {overdue && (
          <p className="text-[10px] text-destructive font-medium">
            Prazo: {new Date(act.endDate).toLocaleDateString("pt-BR")}
          </p>
        )}

        {activeImpediments.length > 0 && (
          <div className="space-y-1">
            {activeImpediments.map((imp) => (
              <div key={imp.id} className="flex items-start gap-1 text-[10px] bg-warning/10 rounded p-1.5 border border-warning/20">
                <ShieldAlert className="h-3 w-3 text-warning shrink-0 mt-0.5" />
                <div className="flex-1 space-y-0.5">
                  <span className="block">{imp.reason}</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge className={`text-[8px] px-1 ${IMPEDIMENT_CRITICALITY_LABELS[imp.criticality].color}`}>
                      {IMPEDIMENT_CRITICALITY_LABELS[imp.criticality].label}
                    </Badge>
                    {imp.hasTicket && imp.ticketId && (
                      <Badge variant="outline" className="text-[8px] px-1 gap-0.5">
                        <Link2 className="h-2 w-2" />{imp.ticketId}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-success hover:bg-success/10"
                  onClick={(e) => { e.stopPropagation(); onResolveImpediment(imp.id); }}
                >
                  <CheckCircle2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[8px] font-bold">
              {dev?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
            </div>
            <span className="text-[11px] text-muted-foreground">{dev?.name?.split(" ")[0] || "N/A"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-3 w-3" />{act.hours}h
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-warning hover:bg-warning/10"
              title="Reportar Impedimento"
              onClick={(e) => { e.stopPropagation(); onImpediment(); }}
            >
              <ShieldAlert className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
