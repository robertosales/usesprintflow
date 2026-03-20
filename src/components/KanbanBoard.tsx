import { useState } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { KanbanStatus, isHUOverdue, hasActiveImpediment, IMPEDIMENT_CRITICALITY_LABELS, UserStory } from "@/types/sprint";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldAlert, CheckCircle2, Clock, Target, Link2, ChevronDown, ChevronRight } from "lucide-react";
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

export function KanbanBoard() {
  const { activities, userStories, developers, updateUserStoryStatus, resolveImpediment, activeSprint } = useSprint();
  const [impedimentDialog, setImpedimentDialog] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedHU, setExpandedHU] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const sprintStories = activeSprint
    ? userStories.filter((hu) => hu.sprintId === activeSprint.id)
    : [];

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const huId = active.id as string;
    const overId = over.id as string;

    const targetColumn = KANBAN_COLUMNS.find((c) => c.key === overId);
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
        const col = KANBAN_COLUMNS.find((c) => c.key === targetHU.status);
        toast.success(`HU movida para ${col?.label}`);
      }
    }
  };

  const activeHU = activeId ? sprintStories.find((h) => h.id === activeId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">Board — User Stories</h2>
        {activeSprint && (
          <Badge variant="outline" className="text-xs font-mono">
            {activeSprint.name} • {sprintStories.length} HUs
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
              const colHUs = sprintStories.filter((hu) => (hu.status || "aguardando_desenvolvimento") === col.key);
              return (
                <div key={col.key} className="min-w-[300px] w-[300px] flex-shrink-0">
                  <div className={`rounded-t-lg px-3 py-2.5 ${col.colorClass} border border-b-0`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
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

      <ImpedimentDialog
        huId={impedimentDialog}
        open={!!impedimentDialog}
        onClose={() => setImpedimentDialog(null)}
      />
    </div>
  );
}

const PRIORITY_COLORS: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-info/15 text-info",
  alta: "bg-warning/15 text-warning",
  critica: "bg-destructive/15 text-destructive",
};
const PRIORITY_LABELS: Record<string, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica",
};

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
  const { activities, developers } = useSprint();
  const huActivities = activities.filter((a) => a.huId === hu.id);
  const overdue = isHUOverdue(hu, activities);
  const blocked = hasActiveImpediment(hu);
  const activeImpediments = (hu.impediments || []).filter((i) => !i.resolvedAt);
  const totalHours = huActivities.reduce((s, a) => s + a.hours, 0);

  return (
    <Card
      className={`shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
        overdue ? "border-destructive border-2 bg-destructive/5" : ""
      } ${blocked ? "ring-2 ring-warning" : ""}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="font-mono text-[10px] px-1.5 font-bold">{hu.code}</Badge>
          <Badge className={`text-[10px] px-1.5 ${PRIORITY_COLORS[hu.priority]}`}>{PRIORITY_LABELS[hu.priority]}</Badge>
          <Badge variant="secondary" className="text-[10px] px-1.5">{hu.storyPoints} pts</Badge>
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

        <p className="text-sm font-medium leading-tight">{hu.title}</p>

        {activeImpediments.length > 0 && (
          <div className="space-y-1">
            {activeImpediments.slice(0, 2).map((imp) => (
              <div key={imp.id} className="flex items-start gap-1 text-[10px] bg-warning/10 rounded p-1.5 border border-warning/20">
                <ShieldAlert className="h-3 w-3 text-warning shrink-0 mt-0.5" />
                <div className="flex-1 space-y-0.5">
                  <span className="block line-clamp-1">{imp.reason}</span>
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

        {/* Tasks summary */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {huActivities.length} tarefa{huActivities.length !== 1 ? "s" : ""}
            </button>
            <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-3 w-3" />{totalHours}h
            </span>
          </div>
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

        {/* Expanded tasks list */}
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
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary text-[7px] font-bold shrink-0">
                    {dev?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
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
