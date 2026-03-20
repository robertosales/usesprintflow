import { useState } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { COLUMN_COLOR_OPTIONS, WorkflowColumn } from "@/types/sprint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, Plus, Trash2, Pencil, GripVertical, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_KANBAN_COLUMNS } from "@/types/sprint";

export function WorkflowManager() {
  const { workflowColumns, addWorkflowColumn, removeWorkflowColumn, updateWorkflowColumn, reorderWorkflowColumns } = useSprint();
  const [open, setOpen] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [colorIdx, setColorIdx] = useState("0");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setLabel(""); setColorIdx("0"); setErrors({}); setEditKey(null);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!label.trim()) e.label = "Nome da coluna é obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const colorOpt = COLUMN_COLOR_OPTIONS[Number(colorIdx)];
    if (editKey) {
      updateWorkflowColumn(editKey, { label: label.trim(), colorClass: colorOpt.colorClass, dotColor: colorOpt.dotColor });
      toast.success("Coluna atualizada!");
    } else {
      const key = label.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") + "_" + Date.now();
      addWorkflowColumn({ key, label: label.trim(), colorClass: colorOpt.colorClass, dotColor: colorOpt.dotColor });
      toast.success("Coluna adicionada ao fluxo!");
    }
    resetForm();
    setOpen(false);
  };

  const openEdit = (key: string) => {
    const col = workflowColumns.find((c) => c.key === key);
    if (!col) return;
    setEditKey(key);
    setLabel(col.label);
    const idx = COLUMN_COLOR_OPTIONS.findIndex((o) => o.colorClass === col.colorClass);
    setColorIdx(String(Math.max(0, idx)));
    setErrors({});
    setOpen(true);
  };

  const moveColumn = (idx: number, dir: -1 | 1) => {
    const newCols = [...workflowColumns];
    const target = idx + dir;
    if (target < 0 || target >= newCols.length) return;
    [newCols[idx], newCols[target]] = [newCols[target], newCols[idx]];
    reorderWorkflowColumns(newCols);
  };

  const resetToDefaults = () => {
    reorderWorkflowColumns([...DEFAULT_KANBAN_COLUMNS]);
    toast.success("Fluxo restaurado ao padrão!");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">Fluxo de Trabalho</h2>
          <Badge variant="secondary">{workflowColumns.length} etapas</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={resetToDefaults}>
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar Padrão
          </Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Nova Etapa</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-primary" />
                  {editKey ? "Editar Etapa" : "Nova Etapa do Fluxo"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nome da Coluna <span className="text-destructive">*</span></Label>
                  <Input value={label} onChange={(e) => { setLabel(e.target.value); setErrors((p) => ({ ...p, label: "" })); }} placeholder="Ex: Em Homologação" className="mt-1" />
                  {errors.label && <p className="text-xs text-destructive mt-1">{errors.label}</p>}
                </div>
                <div>
                  <Label>Cor</Label>
                  <Select value={colorIdx} onValueChange={setColorIdx}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COLUMN_COLOR_OPTIONS.map((opt, i) => (
                        <SelectItem key={i} value={String(i)}>
                          <div className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${opt.dotColor}`} />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full gap-2">
                  <GitBranch className="h-4 w-4" /> {editKey ? "Salvar" : "Adicionar Etapa"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {workflowColumns.map((col, idx) => (
              <div key={col.key} className="flex items-center gap-1 shrink-0">
                <div className={`rounded-lg px-3 py-2 ${col.colorClass} border min-w-[140px]`}>
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-3 w-3 text-muted-foreground/50" />
                    <div className={`h-2 w-2 rounded-full ${col.dotColor}`} />
                    <span className="text-xs font-semibold">{col.label}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveColumn(idx, -1)} disabled={idx === 0}>
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveColumn(idx, 1)} disabled={idx === workflowColumns.length - 1}>
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openEdit(col.key)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => {
                      if (workflowColumns.length <= 2) { toast.error("Mínimo de 2 etapas no fluxo"); return; }
                      removeWorkflowColumn(col.key);
                      toast.info("Etapa removida");
                    }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {idx < workflowColumns.length - 1 && (
                  <div className="text-muted-foreground/40 text-lg">→</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Use as setas para reordenar as etapas. O Board Kanban seguirá esta ordem. A primeira etapa é o status padrão para novas HUs.
      </p>
    </div>
  );
}
