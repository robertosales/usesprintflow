import { useState, useRef } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Layers, Plus, Trash2, Pencil, ChevronDown, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const EPIC_COLORS = [
  "hsl(173, 58%, 39%)",
  "hsl(210, 92%, 55%)",
  "hsl(262, 52%, 55%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(142, 71%, 40%)",
  "hsl(330, 60%, 50%)",
  "hsl(200, 70%, 45%)",
];

export function EpicManager() {
  const { epics, addEpic, updateEpic, removeEpic, userStories, activeSprint, workflowColumns } = useSprint();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(EPIC_COLORS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedEpic, setExpandedEpic] = useState<string | null>(null);

  const colorInputRef = useRef<HTMLInputElement | null>(null);

  const lastCol = workflowColumns[workflowColumns.length - 1]?.key;

  const resetForm = () => {
    setName("");
    setDescription("");
    setColor(EPIC_COLORS[0]);
    setErrors({});
    setEditId(null);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nome do épico é obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (editId) {
      updateEpic(editId, { name: name.trim(), description: description.trim(), color });
      toast.success("Épico atualizado!");
    } else {
      addEpic({ name: name.trim(), description: description.trim(), color });
      toast.success("Épico criado!");
    }
    resetForm();
    setOpen(false);
  };

  const openEdit = (epicId: string) => {
    const epic = epics.find((e) => e.id === epicId);
    if (!epic) return;
    setEditId(epic.id);
    setName(epic.name);
    setDescription(epic.description);
    setColor(epic.color);
    setErrors({});
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">Épicos</h2>
          <Badge variant="secondary">{epics.length}</Badge>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Novo Épico
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                {editId ? "Editar Épico" : "Novo Épico"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>
                  Nome <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrors((p) => ({ ...p, name: "" }));
                  }}
                  placeholder="Ex: Módulo de Pagamentos"
                  className="mt-1"
                />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objetivo do épico..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* 🔥 BLOCO ATUALIZADO */}
              <div>
                <Label>Cor</Label>

                <div className="flex gap-2 mt-1.5 items-center">
                  {EPIC_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`h-7 w-7 rounded-full transition-all ${
                        color === c ? "ring-2 ring-offset-2 ring-ring scale-110" : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}

                  <button
                    type="button"
                    onClick={() => colorInputRef.current?.click()}
                    className="h-7 w-7 rounded-full border flex items-center justify-center text-xs hover:scale-105"
                  >
                    +
                  </button>

                  <input
                    ref={colorInputRef}
                    type="color"
                    className="hidden"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full gap-2">
                <Layers className="h-4 w-4" /> {editId ? "Salvar Alterações" : "Criar Épico"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {epics.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Layers className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">Nenhum épico criado</p>
            <p className="text-sm mt-1">Épicos agrupam User Stories em objetivos maiores</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {epics.map((epic) => {
            const epicHUs = userStories.filter((hu) => hu.epicId === epic.id);
            const sprintHUs = activeSprint ? epicHUs.filter((hu) => hu.sprintId === activeSprint.id) : epicHUs;
            const totalPoints = sprintHUs.reduce((s, hu) => s + hu.storyPoints, 0);
            const donePoints = sprintHUs.filter((hu) => hu.status === lastCol).reduce((s, hu) => s + hu.storyPoints, 0);
            const progress = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;
            const expanded = expandedEpic === epic.id;

            return (
              <Card key={epic.id} className="group hover:shadow-md transition-shadow overflow-hidden">
                <div className="h-1" style={{ backgroundColor: epic.color }} />
                <CardContent className="p-4">{/* restante inalterado */}</CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
