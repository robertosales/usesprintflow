import { useState } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, Calendar, Target, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function SprintManager() {
  const { sprints, addSprint, setActiveSprint, removeSprint, activeSprint } = useSprint();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [goal, setGoal] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    addSprint({ name: name.trim(), startDate, endDate, goal: goal.trim() });
    setName(""); setStartDate(""); setEndDate(""); setGoal(""); setErrors({});
    setOpen(false);
    toast.success("Sprint criada e ativada!");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">Sprints</h2>
          <Badge variant="secondary">{sprints.length}</Badge>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Nova Sprint</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Criar Sprint
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
                <Zap className="h-4 w-4" /> Iniciar Sprint
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 flex-wrap">
        {sprints.map((sprint) => (
          <Card
            key={sprint.id}
            className={`cursor-pointer transition-all hover:shadow-md min-w-[240px] ${
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
                    className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); removeSprint(sprint.id); toast.info("Sprint removida"); }}
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
            </CardContent>
          </Card>
        ))}
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
