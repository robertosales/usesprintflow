import { useSprint } from "@/contexts/SprintContext";
import { KANBAN_COLUMNS, KanbanStatus } from "@/types/sprint";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Clock, ArrowRight } from "lucide-react";

export function KanbanBoard() {
  const { activities, userStories, developers, updateActivityStatus, activeSprint } = useSprint();

  const sprintStories = activeSprint
    ? userStories.filter((hu) => hu.sprintId === activeSprint.id)
    : [];
  const sprintActivities = activities.filter((a) =>
    sprintStories.some((hu) => hu.id === a.huId)
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Kanban Board</h2>
      {!activeSprint ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            Selecione uma Sprint ativa para ver o Kanban
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
          {KANBAN_COLUMNS.map((col) => {
            const colActivities = sprintActivities.filter((a) => a.status === col.key);
            return (
              <div key={col.key} className="min-w-[250px] flex-shrink-0">
                <div className={`rounded-t-lg px-3 py-2 ${col.colorClass}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{col.label}</span>
                    <Badge variant="secondary" className="text-xs h-5 min-w-5 flex items-center justify-center">
                      {colActivities.length}
                    </Badge>
                  </div>
                </div>
                <div className={`rounded-b-lg border border-t-0 min-h-[300px] p-2 space-y-2 ${col.colorClass} bg-opacity-30`}>
                  {colActivities.map((act) => {
                    const hu = userStories.find((h) => h.id === act.huId);
                    const dev = developers.find((d) => d.id === act.assigneeId);
                    return (
                      <Card key={act.id} className="shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="font-mono text-[10px] px-1.5">{hu?.code}</Badge>
                          </div>
                          <p className="text-sm font-medium leading-tight">{act.title}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{dev?.name?.split(" ")[0] || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{act.hours}h</span>
                            </div>
                          </div>
                          <Select
                            value={act.status}
                            onValueChange={(v) => updateActivityStatus(act.id, v as KanbanStatus)}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <div className="flex items-center gap-1">
                                <ArrowRight className="h-3 w-3" />
                                <SelectValue />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {KANBAN_COLUMNS.map((c) => (
                                <SelectItem key={c.key} value={c.key} className="text-xs">
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
