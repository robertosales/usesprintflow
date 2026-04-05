import { useState, useEffect } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { COLUMN_COLOR_OPTIONS, WorkflowColumn, DEFAULT_KANBAN_COLUMNS } from "@/types/sprint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, Plus, Trash2, GripVertical, RotateCcw, Save, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export function WorkflowManager() {
  const { workflowColumns, reorderWorkflowColumns } = useSprint();

  // Local draft state — changes only persist on "Salvar"
  const [draft, setDraft] = useState<WorkflowColumn[]>([...workflowColumns]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColorIdx, setEditColorIdx] = useState("0");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setDraft([...workflowColumns]);
    setHasChanges(false);
  }, [workflowColumns]);

  const markChanged = (newDraft: WorkflowColumn[]) => {
    setDraft(newDraft);
    setHasChanges(true);
  };

  // --- Drag & Drop ---
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(draft);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    markChanged(items);
  };

  // --- Add step ---
  const addStep = () => {
    const key = `etapa_${Date.now()}`;
    const newStep: WorkflowColumn = {
      key,
      label: "Nova Etapa",
      colorClass: COLUMN_COLOR_OPTIONS[0].colorClass,
      dotColor: COLUMN_COLOR_OPTIONS[0].dotColor,
    };
    const newDraft = [...draft, newStep];
    markChanged(newDraft);
    // Start editing immediately
    setEditingKey(key);
    setEditLabel("Nova Etapa");
    setEditColorIdx("0");
  };

  // --- Remove step ---
  const removeStep = (key: string) => {
    if (draft.length <= 2) {
      toast.error("Mínimo de 2 etapas no fluxo");
      return;
    }
    markChanged(draft.filter((c) => c.key !== key));
    if (editingKey === key) setEditingKey(null);
  };

  // --- Edit inline ---
  const startEdit = (col: WorkflowColumn) => {
    setEditingKey(col.key);
    setEditLabel(col.label);
    const idx = COLUMN_COLOR_OPTIONS.findIndex((o) => o.colorClass === col.colorClass);
    setEditColorIdx(String(Math.max(0, idx)));
  };

  const confirmEdit = () => {
    if (!editingKey || !editLabel.trim()) return;
    const colorOpt = COLUMN_COLOR_OPTIONS[Number(editColorIdx)];
    markChanged(
      draft.map((c) =>
        c.key === editingKey
          ? { ...c, label: editLabel.trim(), colorClass: colorOpt.colorClass, dotColor: colorOpt.dotColor }
          : c
      )
    );
    setEditingKey(null);
  };

  const cancelEdit = () => setEditingKey(null);

  // --- Save / Restore ---
  const save = async () => {
    await reorderWorkflowColumns(draft);
    setHasChanges(false);
    toast.success("Fluxo salvo com sucesso!");
  };

  const restore = () => {
    markChanged([...DEFAULT_KANBAN_COLUMNS]);
    toast.info("Padrão restaurado — salve para confirmar.");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">Fluxo de Trabalho</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Defina a ordem e nomenclatura das etapas. As alterações serão refletidas no Kanban ao salvar.
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

      {/* Step list with drag-and-drop */}
      <Card>
        <CardContent className="p-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="workflow-steps">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {draft.map((col, idx) => (
                    <Draggable key={col.key} draggableId={col.key} index={idx}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                            snapshot.isDragging ? "bg-accent shadow-md" : "bg-background hover:bg-muted/50"
                          }`}
                        >
                          {/* Drag handle */}
                          <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground">
                            <GripVertical className="h-4 w-4" />
                          </div>

                          {/* Order number */}
                          <span className="text-xs font-mono text-muted-foreground w-5 text-center shrink-0">
                            {idx + 1}
                          </span>

                          {/* Color dot */}
                          <div className={`h-3 w-3 rounded-full shrink-0 ${
                            editingKey === col.key
                              ? COLUMN_COLOR_OPTIONS[Number(editColorIdx)]?.dotColor || col.dotColor
                              : col.dotColor
                          }`} />

                          {/* Label or edit mode */}
                          {editingKey === col.key ? (
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
                                  {COLUMN_COLOR_OPTIONS.map((opt, i) => (
                                    <SelectItem key={i} value={String(i)}>
                                      <div className="flex items-center gap-2">
                                        <div className={`h-2.5 w-2.5 rounded-full ${opt.dotColor}`} />
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
                            <span className="text-sm font-medium flex-1 min-w-0 truncate">{col.label}</span>
                          )}

                          {/* Actions (when not editing) */}
                          {editingKey !== col.key && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(col)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => removeStep(col.key)}
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
        Arraste as etapas para reordenar. As regras de validação e evidências são aplicadas diretamente no Kanban, independentemente da configuração do fluxo.
      </p>
    </div>
  );
}
