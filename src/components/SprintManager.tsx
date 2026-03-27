import { useState } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Plus, Calendar, Target, Trash2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function SprintManager() {
  const { sprints, addSprint, updateSprint, setActiveSprint, removeSprint, activeSprint, userStories, activities, workflowColumns } = useSprint();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [goal, setGoal] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setName(""); setStartDate(""); setEndDate(""); setGoal(""); setErrors({}); setEditId(null);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nome da sprint é obrigatório";
    if (!startDate) e.startDate = "Data de início é obrigatória";
    if (!endDate) e.endDate = "Data de término é obrigatória";
    if (startDate && endDate && startDate >= endDate) e.endDate = "Data fim deve ser posterior à data início";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (editId) {
      updateSprint(editId, { name: name.trim(), startDate, endDate, goal: goal.trim() });
      toast.success("Sprint atualizada!");
    } else {
      addSprint({ name: name.trim(), startDate, endDate, goal: goal.trim() });
      toast.success("Sprint criada e ativada!");
    }
    resetForm();
    setOpen(false);
  };

  const openEdit = (sprintId: string) => {
    const s = sprints.find((sp) => sp.id === sprintId);
    if (!s) return;
    setEditId(s.id);
    setName(s.name);
    setStartDate(s.startDate);
    setEndDate(s.endDate);
    setGoal(s.goal);
    setErrors({});
    setOpen(true);
  };

  const handleRemoveSprint = (sprintId: string) => {
    const sprintHUs = userStories.filter((hu) => hu.sprintId === sprintId);
    if (sprintHUs.length > 0) {
      toast.error(`Não é possível excluir: esta Sprint possui ${sprintHUs.length} HU(s) vinculada(s). Remova-as primeiro.`);
      return;
    }
    removeSprint(sprintId);
    toast.info("Sprint removida");
  };

  const getSprintProgress = (sprintId: string) => {
    const sprintHUs = userStories.filter((hu) => hu.sprintId === sprintId);
    if (sprintHUs.length === 0) return { totalPoints: 0, completedPoints: 0, percent: 0 };
    const lastCol = workflowColumns[workflowColumns.length - 1]?.key;
    const totalPoints = sprintHUs.reduce((s, hu) => s + hu.storyPoints, 0);
    const completedPoints = sprintHUs.filter((hu) => hu.status === lastCol).reduce((s, hu) => s + hu.storyPoints, 0);
    const percent = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;
    return { totalPoints, completedPoints, percent };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">Sprints</h2>
          <Badge variant="secondary">{sprints.length}</Badge>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Nova Sprint</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                {editId ? "Editar Sprint" : "Criar Sprint"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome <span className="text-destructive">*</span></Label>
                <Input value={name} onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }} placeholder="Sprint 1" className="mt-1" />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Início <span className="text-destructive">*</span></Label>
                  <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setErrors((p) => ({ ...p, startDate: "" })); }} className="mt-1" />
                  {errors.startDate && <p className="text-xs text-destructive mt-1">{errors.startDate}</p>}
                </div>
                <div>
                  <Label>Fim <span className="text-destructive">*</span></Label>
                  <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setErrors((p) => ({ ...p, endDate: "" })); }} className="mt-1" />
                  {errors.endDate && <p className="text-xs text-destructive mt-1">{errors.endDate}</p>}
                </div>
              </div>
              <div>
                <Label>Objetivo da Sprint</Label>
                <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="O que esperamos entregar nessa sprint?" className="mt-1" />
              </div>
              <Button type="submit" className="w-full gap-2">
                <Zap className="h-4 w-4" /> {editId ? "Salvar Alterações" : "Iniciar Sprint"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 flex-wrap">
        {sprints.map((sprint) => {
          const progress = getSprintProgress(sprint.id);
          const sprintHUs = userStories.filter((hu) => hu.sprintId === sprint.id);
          return (
            <Card
              key={sprint.id}
              className={`cursor-pointer transition-all hover:shadow-md min-w-[280px] group ${
                sprint.isActive ? "ring-2 ring-primary shadow-md" : "opacity-70 hover:opacity-100"
              }`}
              onClick={() => setActiveSprint(sprint.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{sprint.name}</span>
                  <div className="flex items-center gap-1">
                    {sprint.isActive && <Badge className="bg-primary text-primary-foreground text-[10px]">Ativa</Badge>}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); openEdit(sprint.id); }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); handleRemoveSprint(sprint.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(sprint.startDate).toLocaleDateString("pt-BR")} — {new Date(sprint.endDate).toLocaleDateString("pt-BR")}
                </div>
                {sprint.goal && (
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground mt-1.5">
                    <Target className="h-3 w-3 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{sprint.goal}</span>
                  </div>
                )}
                {/* Progress bar */}
                {sprintHUs.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{progress.completedPoints}/{progress.totalPoints} pts</span>
                      <span className="font-semibold">{progress.percent}%</span>
                    </div>
                    <Progress value={progress.percent} className="h-1.5" />
                    <div className="text-[10px] text-muted-foreground">
                      {sprintHUs.length} HU{sprintHUs.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {sprints.length === 0 && (
          <Card className="border-dashed w-full">
            <CardContent className="py-10 text-center text-muted-foreground">
              <Zap className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">Nenhuma Sprint criada</p>
              <p className="text-sm mt-1">Crie sua primeira Sprint para começar a gerenciar o backlog</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
