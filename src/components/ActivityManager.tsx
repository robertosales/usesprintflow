import { useState } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ListTodo,
  Plus,
  Trash2,
  AlertCircle,
  Pencil,
  CheckCircle2,
  RotateCcw,
  MessageCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTotalHoursForHU, ActivityType, ACTIVITY_TYPE_LABELS } from "@/types/sprint";
import { toast } from "sonner";
import { ActivityComments } from "@/components/ActivityComments";
import { FileUploader } from "@/components/FileUploader";

export function ActivityManager() {
  const {
    activities,
    addActivity,
    removeActivity,
    updateActivity,
    closeActivity,
    reopenActivity,
    userStories,
    developers,
    activeSprint,
  } = useSprint();
  const { currentTeamId, hasPermission } = useAuth();
  const canUpdate = hasPermission("update_tasks");

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("task");
  const [huId, setHuId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [hours, setHours] = useState("4");
  const [startDate, setStartDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<string | null>(null);

  // NOVO: tipos SEM limite de horas por atividade
  //const isSemLimite = activityType === "architecture" || activityType === "scrum" || activityType === "requirements";

  const sprintStories = activeSprint ? userStories.filter((hu) => hu.sprintId === activeSprint.id) : [];

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Título é obrigatório";
    if (!huId) e.huId = "Selecione uma User Story";
    if (!assigneeId) e.assigneeId = "Selecione um responsável";
    if (!startDate) e.startDate = "Data de início é obrigatória";
    if (!hours || Number(hours) < 1) e.hours = "Horas deve ser no mínimo 1";

    // 🔥 ALTERADO: regra por atividade (8h)
    if (activityType === "task" && Number(hours) > 8) {
      e.hours = "Máximo de 8 horas para tarefas do tipo Task";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setActivityType("task");
    setHuId("");
    setAssigneeId("");
    setHours("4");
    setStartDate("");
    setErrors({});
    setEditId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const numHours = Number(hours);

    if (editId) {
      updateActivity(editId, {
        title: title.trim(),
        description: description.trim(),
        activityType,
        huId,
        assigneeId,
        hours: numHours,
        startDate,
      });
      toast.success("Atividade atualizada!");
    } else {
      const currentHours = getTotalHoursForHU(activities, huId);

      // 🔥 MANTIDO: controle de HU (não alterado)
      if (currentHours + numHours > 24) {
        toast.error(`HU já possui ${currentHours}h alocadas. Disponível: ${24 - currentHours}h`);
        return;
      }

      addActivity({
        title: title.trim(),
        description: description.trim(),
        activityType,
        huId,
        assigneeId,
        hours: numHours,
        startDate,
      });
      toast.success("Atividade criada!");
    }

    resetForm();
    setOpen(false);
  };

  const openEdit = (actId: string) => {
    const act = activities.find((a) => a.id === actId);
    if (!act) return;
    setEditId(act.id);
    setTitle(act.title);
    setDescription(act.description);
    setActivityType(act.activityType);
    setHuId(act.huId);
    setAssigneeId(act.assigneeId);
    setHours(String(act.hours));
    setStartDate(act.startDate);
    setErrors({});
    setOpen(true);
  };

  const handleRemoveActivity = (actId: string) => {
    removeActivity(actId);
    toast.info("Atividade removida");
  };

  const sprintActivities = activeSprint ? activities.filter((a) => sprintStories.some((hu) => hu.id === a.huId)) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <ListTodo className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">Atividades</h2>
          <Badge variant="secondary">{sprintActivities.length}</Badge>
        </div>

        {canUpdate && (
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5" disabled={sprintStories.length === 0 || developers.length === 0}>
                <Plus className="h-4 w-4" /> Nova Atividade
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-primary" />
                  {editId ? "Editar Atividade" : "Nova Atividade"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>
                    Título <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setErrors((p) => ({ ...p, title: "" }));
                    }}
                    placeholder="Descrição da atividade"
                    className="mt-1"
                  />
                  {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detalhes técnicos, observações..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>
                    Tipo <span className="text-destructive">*</span>
                  </Label>
                  <Select value={activityType} onValueChange={(v) => setActivityType(v as ActivityType)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACTIVITY_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>
                    User Story <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={huId}
                    onValueChange={(v) => {
                      setHuId(v);
                      setErrors((p) => ({ ...p, huId: "" }));
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione a HU" />
                    </SelectTrigger>
                    <SelectContent>
                      {sprintStories.map((hu) => {
                        const used = getTotalHoursForHU(activities, hu.id);
                        return (
                          <SelectItem key={hu.id} value={hu.id}>
                            {hu.code} — {hu.title} ({used}/24h)
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {errors.huId && <p className="text-xs text-destructive mt-1">{errors.huId}</p>}
                </div>

                <div>
                  <Label>
                    Responsável <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={assigneeId}
                    onValueChange={(v) => {
                      setAssigneeId(v);
                      setErrors((p) => ({ ...p, assigneeId: "" }));
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {developers.map((dev) => (
                        <SelectItem key={dev.id} value={dev.id}>
                          {dev.name} — {dev.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.assigneeId && <p className="text-xs text-destructive mt-1">{errors.assigneeId}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>
                      Horas estimadas <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max={activityType === "task" ? 8 : undefined}
                      value={hours}
                      onChange={(e) => {
                        setHours(e.target.value);
                        setErrors((p) => ({ ...p, hours: "" }));
                      }}
                      className="mt-1"
                    />
                    {errors.hours && <p className="text-xs text-destructive mt-1">{errors.hours}</p>}
                  </div>

                  <div>
                    <Label>
                      Data início <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setErrors((p) => ({ ...p, startDate: "" }));
                      }}
                      className="mt-1"
                    />
                    {errors.startDate && <p className="text-xs text-destructive mt-1">{errors.startDate}</p>}
                  </div>
                </div>

                <Button type="submit" className="w-full gap-2">
                  <Plus className="h-4 w-4" /> {editId ? "Salvar Alterações" : "Criar Atividade"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {(sprintStories.length === 0 || developers.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium">
              {developers.length === 0 ? "Cadastre membros do time primeiro" : "Crie User Stories primeiro"}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {sprintActivities.map((act) => {
          const hu = userStories.find((h) => h.id === act.huId);
          const dev = developers.find((d) => d.id === act.assigneeId);
          const typeInfo = ACTIVITY_TYPE_LABELS[act.activityType || "task"];
          const isClosed = !!act.isClosed;
          const isExpanded = expandedComments === act.id;

          return (
            <Card key={act.id} className={`group hover:shadow-md transition-shadow ${isClosed ? "opacity-60" : ""}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs font-bold">
                        {hu?.code}
                      </Badge>
                      <Badge className={`text-[10px] border ${typeInfo.color}`}>{typeInfo.label}</Badge>
                      {isClosed && (
                        <Badge className="bg-success/15 text-success border-success/30 text-[10px]">✓ Concluída</Badge>
                      )}
                    </div>

                    <span className={`text-sm font-semibold ${isClosed ? "line-through" : ""}`}>{act.title}</span>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{dev?.name || "N/A"}</span>
                      <span>{act.hours}h</span>
                      <span>
                        {new Date(act.startDate).toLocaleDateString("pt-BR")} →{" "}
                        {new Date(act.endDate).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Comentários"
                      onClick={() => setExpandedComments(isExpanded ? null : act.id)}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </Button>

                    {!isClosed ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-success"
                        title="Concluir atividade"
                        onClick={() => {
                          closeActivity(act.id);
                          toast.success("Atividade concluída!");
                        }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Reabrir atividade"
                        onClick={() => {
                          reopenActivity(act.id);
                          toast.info("Atividade reaberta");
                        }}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(act.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleRemoveActivity(act.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {isExpanded && currentTeamId && (
                  <div className="mt-3 space-y-3 border-t pt-3">
                    <FileUploader entityType="activity" entityId={act.id} teamId={currentTeamId} />
                    <ActivityComments activityId={act.id} teamId={currentTeamId} />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
