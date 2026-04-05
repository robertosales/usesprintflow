import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, Plus, Trash2, GripVertical, RotateCcw, Save, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { ALL_SITUACOES, SITUACAO_LABELS, SITUACAO_COLORS } from "../types/demanda";

interface SustentacaoStep {
  key: string;
  label: string;
  colorClass: string;
}

const COLOR_OPTIONS = [
  { colorClass: "bg-blue-100 border-blue-200", label: "Azul" },
  { colorClass: "bg-yellow-100 border-yellow-200", label: "Amarelo" },
  { colorClass: "bg-red-100 border-red-200", label: "Vermelho" },
  { colorClass: "bg-green-100 border-green-200", label: "Verde" },
  { colorClass: "bg-purple-100 border-purple-200", label: "Roxo" },
  { colorClass: "bg-orange-100 border-orange-200", label: "Laranja" },
  { colorClass: "bg-cyan-100 border-cyan-200", label: "Ciano" },
  { colorClass: "bg-emerald-100 border-emerald-200", label: "Esmeralda" },
  { colorClass: "bg-teal-100 border-teal-200", label: "Teal" },
  { colorClass: "bg-indigo-100 border-indigo-200", label: "Índigo" },
];

function buildDefaultSteps(): SustentacaoStep[] {
  return ALL_SITUACOES.map((sit) => ({
    key: sit,
    label: SITUACAO_LABELS[sit] || sit,
    colorClass: SITUACAO_COLORS[sit]?.split(" ").slice(0, 2).join(" ") || COLOR_OPTIONS[0].colorClass,
  }));
}

export function SustentacaoWorkflow() {
  const [draft, setDraft] = useState<SustentacaoStep[]>(buildDefaultSteps);
  const [saved, setSaved] = useState<SustentacaoStep[]>(buildDefaultSteps);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColorIdx, setEditColorIdx] = useState("0");
  const [hasChanges, setHasChanges] = useState(false);

  const markChanged = (newDraft: SustentacaoStep[]) => {
    setDraft(newDraft);
    setHasChanges(true);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(draft);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    markChanged(items);
  };

  const addStep = () => {
    const key = `etapa_${Date.now()}`;
    const newStep: SustentacaoStep = {
      key,
      label: "Nova Etapa",
      colorClass: COLOR_OPTIONS[0].colorClass,
    };
    const newDraft = [...draft, newStep];
    markChanged(newDraft);
    setEditingKey(key);
    setEditLabel("Nova Etapa");
    setEditColorIdx("0");
  };

  const removeStep = (key: string) => {
    if (draft.length <= 2) {
      toast.error("Mínimo de 2 etapas no fluxo");
      return;
    }
    markChanged(draft.filter((c) => c.key !== key));
    if (editingKey === key) setEditingKey(null);
  };

  const startEdit = (step: SustentacaoStep) => {
    setEditingKey(step.key);
    setEditLabel(step.label);
    const idx = COLOR_OPTIONS.findIndex((o) => step.colorClass.includes(o.colorClass.split(" ")[0]));
    setEditColorIdx(String(Math.max(0, idx)));
  };

  const confirmEdit = () => {
    if (!editingKey || !editLabel.trim()) return;
    const colorOpt = COLOR_OPTIONS[Number(editColorIdx)];
    markChanged(
      draft.map((c) =>
        c.key === editingKey ? { ...c, label: editLabel.trim(), colorClass: colorOpt.colorClass } : c
      )
    );
    setEditingKey(null);
  };

  const cancelEdit = () => setEditingKey(null);

  const save = () => {
    setSaved([...draft]);
    setHasChanges(false);
    toast.success("Fluxo de sustentação salvo com sucesso!");
  };

  const restore = () => {
    markChanged(buildDefaultSteps());
    toast.info("Padrão restaurado — salve para confirmar.");
  };

  const getDotColor = (colorClass: string) => {
    const base = colorClass.split(" ")[0];
    return base.replace("100", "500");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">Fluxo de Trabalho — Sustentação</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Defina a ordem e nomenclatura das etapas. As regras de validação são aplicadas no Kanban.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={restore}>
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar Padrão
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={addStep}>
            <Plus className="h-4 w-4" /> Nova Etapa
          </Button>
          <Button size="sm" className="gap-1.5" onClick={save} disabled={!hasChanges}>
            <Save className="h-4 w-4" /> Salvar Alterações
          </Button>
        </div>
      </div>

      {/* Step list */}
      <Card>
        <CardContent className="p-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="sustentacao-workflow-steps">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {draft.map((step, idx) => (
                    <Draggable key={step.key} draggableId={step.key} index={idx}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                            snapshot.isDragging ? "bg-accent shadow-md" : "bg-background hover:bg-muted/50"
                          }`}
                        >
                          <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground">
                            <GripVertical className="h-4 w-4" />
                          </div>

                          <span className="text-xs font-mono text-muted-foreground w-5 text-center shrink-0">
                            {idx + 1}
                          </span>

                          <div className={`h-3 w-3 rounded-full shrink-0 ${
                            editingKey === step.key
                              ? getDotColor(COLOR_OPTIONS[Number(editColorIdx)]?.colorClass || step.colorClass)
                              : getDotColor(step.colorClass)
                          }`} />

                          {editingKey === step.key ? (
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Input
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                className="h-8 text-sm flex-1"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") confirmEdit();
                                  if (e.key === "Escape") cancelEdit();
                                }}
                              />
                              <Select value={editColorIdx} onValueChange={setEditColorIdx}>
                                <SelectTrigger className="h-8 w-[110px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {COLOR_OPTIONS.map((opt, i) => (
                                    <SelectItem key={i} value={String(i)}>
                                      <div className="flex items-center gap-2">
                                        <div className={`h-2.5 w-2.5 rounded-full ${getDotColor(opt.colorClass)}`} />
                                        {opt.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={confirmEdit}>
                                <Check className="h-3.5 w-3.5 text-success" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm font-medium flex-1 min-w-0 truncate">{step.label}</span>
                          )}

                          {editingKey !== step.key && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(step)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => removeStep(step.key)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Arraste as etapas para reordenar. As regras de progressão, evidências obrigatórias e justificativas são aplicadas diretamente no Kanban.
      </p>
    </div>
  );
}
