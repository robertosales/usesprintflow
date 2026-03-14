import { useState } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ListTodo, Plus, Trash2, AlertCircle, AlertTriangle, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTotalHoursForHU, isOverdue, hasActiveImpediment } from "@/types/sprint";
import { toast } from "sonner";

export function ActivityManager() {
  const { activities, addActivity, removeActivity, userStories, developers, activeSprint } = useSprint();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [huId, setHuId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [hours, setHours] = useState("4");
  const [startDate, setStartDate] = useState("");

  const sprintStories = activeSprint
    ? userStories.filter((hu) => hu.sprintId === activeSprint.id)
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !huId || !assigneeId || !startDate) return;

    const numHours = Number(hours);
    const currentHours = getTotalHoursForHU(activities, huId);
    if (currentHours + numHours > 24) {
      toast.error(`Esta HU já possui ${currentHours}h. Máximo é 24h. Disponível: ${24 - currentHours}h`);
      return;
    }

    addActivity({ title, description, huId, assigneeId, hours: numHours, startDate });
    setTitle(""); setDescription(""); setHuId(""); setAssigneeId(""); setHours("4"); setStartDate("");
    setOpen(false);
    toast.success("Atividade criada com sucesso!");
  };

  const sprintActivities = activeSprint
    ? activities.filter((a) => sprintStories.some((hu) => hu.id === a.huId))
    : [];

  const overdueCount = sprintActivities.filter(isOverdue).length;
  const blockedCount = sprintActivities.filter(hasActiveImpediment).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Atividades</h2>
          <Badge variant="secondary">{sprintActivities.length}</Badge>
          {overdueCount > 0 && (
            <Badge variant="destructive" className="gap-0.5">
              <AlertTriangle className="h-3 w-3" /> {overdueCount} atrasada{overdueCount > 1 ? "s" : ""}
            </Badge>
          )}
          {blockedCount > 0 && (
            <Badge className="gap-0.5 bg-warning text-warning-foreground">
              <ShieldAlert className="h-3 w-3" /> {blockedCount} impedimento{blockedCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1" disabled={sprintStories.length === 0 || developers.length === 0}>
              <Plus className="h-4 w-4" /> Nova Atividade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Atividade</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Descrição da atividade" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes" />
              </div>
              <div>
                <Label>User Story</Label>
                <Select value={huId} onValueChange={setHuId}>
                  <SelectTrigger><SelectValue placeholder="Selecione a HU" /></SelectTrigger>
                  <SelectContent>
                    {sprintStories.map((hu) => {
                      const used = getTotalHoursForHU(activities, hu.id);
                      return (
                        <SelectItem key={hu.id} value={hu.id}>
                          {hu.code} - {hu.title} ({used}/24h)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {huId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Horas disponíveis: {24 - getTotalHoursForHU(activities, huId)}h
                  </p>
                )}
              </div>
              <div>
                <Label>Responsável</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o dev" /></SelectTrigger>
                  <SelectContent>
                    {developers.map((dev) => (
                      <SelectItem key={dev.id} value={dev.id}>{dev.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Horas estimadas</Label>
                  <Input type="number" min="1" max="24" value={hours} onChange={(e) => setHours(e.target.value)} />
                </div>
                <div>
                  <Label>Data início</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full">Criar Atividade</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {(sprintStories.length === 0 || developers.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-muted-foreground flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {developers.length === 0 ? "Cadastre desenvolvedores primeiro" : "Crie User Stories primeiro"}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {sprintActivities.map((act) => {
          const hu = userStories.find((h) => h.id === act.huId);
          const dev = developers.find((d) => d.id === act.assigneeId);
          const overdue = isOverdue(act);
          const blocked = hasActiveImpediment(act);
          return (
            <Card key={act.id} className={`group ${overdue ? "border-destructive border-2" : ""} ${blocked ? "ring-2 ring-warning" : ""}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs">{hu?.code}</Badge>
                      <span className="text-sm font-medium">{act.title}</span>
                      {overdue && (
                        <Badge variant="destructive" className="text-[10px] gap-0.5">
                          <AlertTriangle className="h-2.5 w-2.5" /> Atrasado
                        </Badge>
                      )}
                      {blocked && (
                        <Badge className="text-[10px] gap-0.5 bg-warning text-warning-foreground">
                          <ShieldAlert className="h-2.5 w-2.5" /> Impedimento
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{dev?.name || "N/A"}</span>
                      <span>{act.hours}h</span>
                      <span className={overdue ? "text-destructive font-medium" : ""}>{act.startDate} → {act.endDate}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    onClick={() => removeActivity(act.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
