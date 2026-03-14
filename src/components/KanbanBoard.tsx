import { useState } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { KANBAN_COLUMNS, KanbanStatus, isOverdue, hasActiveImpediment } from "@/types/sprint";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Clock, ArrowRight, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function KanbanBoard() {
  const { activities, userStories, developers, updateActivityStatus, addImpediment, resolveImpediment, activeSprint } = useSprint();
  const [impedimentDialog, setImpedimentDialog] = useState<string | null>(null);
  const [impedimentReason, setImpedimentReason] = useState("");

  const sprintStories = activeSprint
    ? userStories.filter((hu) => hu.sprintId === activeSprint.id)
    : [];
  const sprintActivities = activities.filter((a) =>
    sprintStories.some((hu) => hu.id === a.huId)
  );

  const handleAddImpediment = () => {
    if (!impedimentDialog || !impedimentReason.trim()) return;
    addImpediment(impedimentDialog, impedimentReason.trim());
    toast.warning("Impedimento registrado!");
    setImpedimentDialog(null);
    setImpedimentReason("");
  };

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
                    const overdue = isOverdue(act);
                    const blocked = hasActiveImpediment(act);
                    const activeImpediments = (act.impediments || []).filter((i) => !i.resolvedAt);

                    return (
                      <Card
                        key={act.id}
                        className={`shadow-sm hover:shadow-md transition-shadow ${
                          overdue ? "border-destructive border-2 bg-destructive/5" : ""
                        } ${blocked ? "ring-2 ring-warning" : ""}`}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="font-mono text-[10px] px-1.5">{hu?.code}</Badge>
                            {overdue && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 gap-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" /> Atrasado
                              </Badge>
                            )}
                            {blocked && (
                              <Badge className="text-[10px] px-1.5 gap-0.5 bg-warning text-warning-foreground">
                                <ShieldAlert className="h-2.5 w-2.5" /> Impedimento
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium leading-tight">{act.title}</p>

                          {overdue && (
                            <p className="text-[10px] text-destructive font-medium">
                              Prazo: {act.endDate}
                            </p>
                          )}

                          {activeImpediments.length > 0 && (
                            <div className="space-y-1">
                              {activeImpediments.map((imp) => (
                                <div key={imp.id} className="flex items-start gap-1 text-[10px] bg-warning/10 rounded p-1">
                                  <ShieldAlert className="h-3 w-3 text-warning shrink-0 mt-0.5" />
                                  <span className="flex-1">{imp.reason}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 text-success"
                                    onClick={() => {
                                      resolveImpediment(act.id, imp.id);
                                      toast.success("Impedimento resolvido!");
                                    }}
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}

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

                          <div className="flex gap-1">
                            <Select
                              value={act.status}
                              onValueChange={(v) => updateActivityStatus(act.id, v as KanbanStatus)}
                            >
                              <SelectTrigger className="h-7 text-xs flex-1">
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
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              title="Reportar Impedimento"
                              onClick={() => setImpedimentDialog(act.id)}
                            >
                              <ShieldAlert className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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

      {/* Impediment Dialog */}
      <Dialog open={!!impedimentDialog} onOpenChange={(v) => !v && setImpedimentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-warning" />
              Reportar Impedimento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Descreva o impedimento..."
              value={impedimentReason}
              onChange={(e) => setImpedimentReason(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddImpediment()}
            />
            <Button onClick={handleAddImpediment} className="w-full" disabled={!impedimentReason.trim()}>
              Registrar Impedimento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
