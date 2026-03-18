import { useState } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Plus, Trash2, Clock, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTotalHoursForHU } from "@/types/sprint";
import { toast } from "sonner";

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  baixa: { label: "Baixa", color: "bg-muted text-muted-foreground" },
  media: { label: "Média", color: "bg-info/15 text-info border border-info/30" },
  alta: { label: "Alta", color: "bg-warning/15 text-warning border border-warning/30" },
  critica: { label: "Crítica", color: "bg-destructive/15 text-destructive border border-destructive/30" },
};

export function UserStoryManager() {
  const { userStories, addUserStory, removeUserStory, activities, activeSprint } = useSprint();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [storyPoints, setStoryPoints] = useState("3");
  const [priority, setPriority] = useState<"baixa" | "media" | "alta" | "critica">("media");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sprintStories = activeSprint
    ? userStories.filter((hu) => hu.sprintId === activeSprint.id)
    : userStories;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Título é obrigatório";
    if (!activeSprint) e.sprint = "Selecione uma sprint ativa";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !activeSprint) return;
    addUserStory({ title: title.trim(), description: description.trim(), storyPoints: Number(storyPoints), priority, sprintId: activeSprint.id });
    setTitle(""); setDescription(""); setStoryPoints("3"); setPriority("media"); setErrors({});
    setOpen(false);
    toast.success("User Story criada!");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">User Stories (Backlog)</h2>
          <Badge variant="secondary">{sprintStories.length}</Badge>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" disabled={!activeSprint}>
              <Plus className="h-4 w-4" /> Nova HU
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Nova User Story
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Título <span className="text-destructive">*</span></Label>
                <Input value={title} onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: "" })); }} placeholder="Como usuário, eu quero..." className="mt-1" />
                {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
              </div>
              <div>
                <Label>Descrição / Critérios de Aceite</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Critérios de aceite, regras de negócio..." className="mt-1" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Story Points <span className="text-destructive">*</span></Label>
                  <Select value={storyPoints} onValueChange={setStoryPoints}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 5, 8, 13, 21].map((p) => (
                        <SelectItem key={p} value={String(p)}>{p} pts</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioridade <span className="text-destructive">*</span></Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full gap-2">
                <Plus className="h-4 w-4" /> Criar User Story
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!activeSprint && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium">Crie uma Sprint primeiro</p>
            <p className="text-sm mt-1">As User Stories são vinculadas a uma Sprint ativa</p>
          </CardContent>
        </Card>
      )}

      {activeSprint && sprintStories.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <BookOpen className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">Backlog vazio</p>
            <p className="text-sm mt-1">Adicione as User Stories desta Sprint</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {sprintStories.map((hu) => {
          const totalHours = getTotalHoursForHU(activities, hu.id);
          const huActivities = activities.filter((a) => a.huId === hu.id);
          const completedActs = huActivities.filter((a) => a.status === "pronto_para_publicacao");
          const pInfo = PRIORITY_MAP[hu.priority];
          return (
            <Card key={hu.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs font-bold">{hu.code}</Badge>
                      <Badge className={`${pInfo.color} text-xs`}>{pInfo.label}</Badge>
                      <Badge variant="secondary" className="text-xs">{hu.storyPoints} pts</Badge>
                      {huActivities.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {completedActs.length}/{huActivities.length} atividades
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm">{hu.title}</h3>
                    {hu.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{hu.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {totalHours}/24h
                      </span>
                    </div>
                    {totalHours > 0 && (
                      <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${totalHours > 24 ? "bg-destructive" : "bg-primary"}`}
                          style={{ width: `${Math.min((totalHours / 24) * 100, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    onClick={() => { removeUserStory(hu.id); toast.info("User Story removida"); }}
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
