import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { UserStory } from "@/types/sprint";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Bug, Plus, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { QuickActivityDialog } from "./QuickActivityDialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";

interface Props {
  hu: UserStory;
  colHex?: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 border-slate-300",
  medium: "bg-blue-100 text-blue-700 border-blue-300",
  high: "bg-amber-100 text-amber-700 border-amber-300",
  critical: "bg-red-100 text-red-700 border-red-300",
};

export function KanbanCard({ hu, colHex }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: hu.id });
  const { developers, epics, activities, workflowColumns, updateUserStoryStatus, addImpediment } = useSprint() as any;
  const [quickOpen, setQuickOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    ...(colHex
      ? {
          background: `color-mix(in srgb, ${colHex} 8%, var(--card))`,
          borderLeft: `3px solid ${colHex}`,
        }
      : {}),
  };

  const assignee = hu.assigneeId ? developers.find((d: any) => d.id === hu.assigneeId) : null;
  const epic = hu.epicId ? epics.find((e: any) => e.id === hu.epicId) : null;
  const huActivities = (activities ?? []).filter((a: any) => a.huId === hu.id);
  const hasOpenBug = huActivities.some((a: any) => a.activityType === "bug" && !a.isClosed);
  const initials = assignee?.name
    ? assignee.name.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <>
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card
          ref={setNodeRef}
          style={style}
          className="p-3 hover:shadow-md transition-shadow bg-card border group relative"
        >
          {/* Drag handle area: header + title */}
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-mono text-muted-foreground">{hu.code}</span>
                {hasOpenBug && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Bug className="h-3 w-3 text-red-500 fill-red-500/30" />
                      </TooltipTrigger>
                      <TooltipContent>Bug em aberto</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {hu.priority && (
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 h-4 ${PRIORITY_COLORS[hu.priority] ?? ""}`}
                >
                  {hu.priority}
                </Badge>
              )}
            </div>
            {epic && (
              <div className="mb-1 flex items-center gap-1">
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{ background: epic.color }}
                />
                <span className="text-[10px] text-muted-foreground truncate">{epic.name}</span>
              </div>
            )}
            <p className="text-xs font-medium text-foreground line-clamp-3 leading-snug">
              {hu.title}
            </p>
          </div>

          {/* Lista de atividades expandida */}
          {expanded && huActivities.length > 0 && (
            <div className="mt-2 flex flex-col gap-1 border-t pt-2">
              {huActivities.map((a: any) => {
                const dev = developers.find((d: any) => d.id === a.assigneeId);
                const devInitials = dev?.name
                  ? dev.name.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase()
                  : null;
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                  >
                    <span className="truncate flex-1">{a.title}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {a.hours != null && <span>{a.hours}h</span>}
                      {devInitials && (
                        <span className="font-semibold text-foreground/70">{devInitials}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer: hours + avatar + add button */}
          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              {hu.estimatedHours != null && <span>{hu.estimatedHours}h</span>}
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-60 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuickOpen(true);
                }}
                title="Adicionar atividade ou bug"
              >
                <Plus className="h-3 w-3" />
              </Button>
              {assignee ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-5 w-5">
                        {assignee.avatarUrl || assignee.avatar ? (
                          <AvatarImage src={assignee.avatarUrl ?? assignee.avatar} alt={assignee.name} />
                        ) : null}
                        <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>{assignee.name}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Avatar className="h-5 w-5 opacity-50">
                  <AvatarFallback className="text-[8px]">?</AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        </Card>
      </ContextMenuTrigger>

      {/* Context menu corrigido com submenus */}
      <ContextMenuContent className="w-52">
        {/* Toggle de expansao de atividades */}
        {huActivities.length > 0 && (
          <>
            <ContextMenuItem onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Recolher tarefas" : "Ver tarefas"}
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}

        {/* Adicionar tarefa */}
        <ContextMenuItem onClick={() => setQuickOpen(true)}>
          Adicionar tarefa
        </ContextMenuItem>

        {/* Reportar impedimento */}
        <ContextMenuItem
          onClick={() => {
            if (typeof addImpediment === "function") {
              addImpediment(hu.id, {
                description: "Impedimento reportado via Kanban",
                reportedAt: new Date().toISOString(),
              });
            }
          }}
        >
          <AlertTriangle className="h-3.5 w-3.5 mr-2 text-amber-500" />
          Reportar impedimento
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Mover para - submenu lateral */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />
            Mover para
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            {(workflowColumns ?? []).map((c: any) => (
              <ContextMenuItem
                key={c.key}
                disabled={c.key === hu.status}
                onClick={() => updateUserStoryStatus(hu.id, c.key)}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full mr-2 shrink-0"
                  style={{ background: c.hex ?? "#6b7280" }}
                />
                {c.label}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>

    {quickOpen && (
      <QuickActivityDialog
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        huId={hu.id}
      />
    )}
    </>
  );
}
