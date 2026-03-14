import { useState } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function SprintManager() {
  const { sprints, addSprint, setActiveSprint, activeSprint } = useSprint();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [goal, setGoal] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) return;
    addSprint({ name, startDate, endDate, goal });
    setName(""); setStartDate(""); setEndDate(""); setGoal("");
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Sprints</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Nova Sprint</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Sprint</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sprint 1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Início</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                <div><Label>Fim</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
              </div>
              <div>
                <Label>Objetivo</Label>
                <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Objetivo da sprint" />
              </div>
              <Button type="submit" className="w-full">Iniciar Sprint</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 flex-wrap">
        {sprints.map((sprint) => (
          <Card
            key={sprint.id}
            className={`cursor-pointer transition-all ${sprint.isActive ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"}`}
            onClick={() => setActiveSprint(sprint.id)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{sprint.name}</span>
                {sprint.isActive && <Badge className="bg-primary text-primary-foreground text-xs">Ativa</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{sprint.startDate} → {sprint.endDate}</p>
              {sprint.goal && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{sprint.goal}</p>}
            </CardContent>
          </Card>
        ))}
        {sprints.length === 0 && (
          <Card className="border-dashed w-full">
            <CardContent className="py-6 text-center text-muted-foreground">
              Crie sua primeira Sprint para começar
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
