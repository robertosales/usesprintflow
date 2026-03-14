import { useState } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Plus, Trash2, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTotalHoursForHU } from "@/types/sprint";

const PRIORITY_COLORS: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-info/10 text-info",
  alta: "bg-warning/10 text-warning",
  critica: "bg-destructive/10 text-destructive",
};

export function UserStoryManager() {
  const { userStories, addUserStory, removeUserStory, activities, activeSprint } = useSprint();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [storyPoints, setStoryPoints] = useState("3");
  const [priority, setPriority] = useState<"baixa" | "media" | "alta" | "critica">("media");

  const sprintStories = activeSprint
    ? userStories.filter((hu) => hu.sprintId === activeSprint.id)
    : userStories;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !activeSprint) return;
    addUserStory({ title, description, storyPoints: Number(storyPoints), priority, sprintId: activeSprint.id });
    setTitle(""); setDescription(""); setStoryPoints("3"); setPriority("media");
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">User Stories (HUs)</h2>
          <Badge variant="secondary">{sprintStories.length}</Badge>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1" disabled={!activeSprint}>
              <Plus className="h-4 w-4" /> Nova HU
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova User Story</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Como usuário, eu quero..." />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes da história" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Story Points</Label>
                  <Select value={storyPoints} onValueChange={setStoryPoints}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 5, 8, 13, 21].map((p) => (
                        <SelectItem key={p} value={String(p)}>{p} pts</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full">Criar HU</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!activeSprint && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-muted-foreground">
            Crie uma Sprint primeiro para adicionar User Stories
          </CardContent>
        </Card>
      )}

      {activeSprint && sprintStories.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <BookOpen className="h-10 w-10 mb-2 opacity-50" />
            <p>Nenhuma User Story cadastrada</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {sprintStories.map((hu) => {
          const totalHours = getTotalHoursForHU(activities, hu.id);
          const huActivities = activities.filter((a) => a.huId === hu.id);
          return (
            <Card key={hu.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-xs">{hu.code}</Badge>
                      <Badge className={PRIORITY_COLORS[hu.priority]}>{hu.priority}</Badge>
                      <Badge variant="secondary">{hu.storyPoints} pts</Badge>
                    </div>
                    <h3 className="font-medium">{hu.title}</h3>
                    {hu.description && <p className="text-sm text-muted-foreground mt-1">{hu.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {totalHours}/24h utilizadas
                      </span>
                      <span>{huActivities.length} atividade(s)</span>
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
                    onClick={() => removeUserStory(hu.id)}
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
