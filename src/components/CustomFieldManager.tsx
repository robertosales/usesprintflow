import { useState } from "react";
import type { ElementType } from "react";
import { useSprint } from "@/contexts/SprintContext";
import type { CustomFieldDefinition } from "@/types/sprint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Type, Hash, List, ToggleLeft, Calendar, Plus, Trash2, Edit, Save, X } from "lucide-react";
import { toast } from "sonner";

// ── Tipos de campo suportados ─────────────────────────────────────────────────

type CustomFieldType = "text" | "number" | "select" | "boolean" | "date";

const FIELD_TYPE_ICONS: Record<CustomFieldType, ElementType> = {
  text: Type,
  number: Hash,
  select: List,
  boolean: ToggleLeft,
  date: Calendar,
};

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Texto",
  number: "Número",
  select: "Seleção",
  boolean: "Sim/Não",
  date: "Data",
};

const ALL_TYPES = Object.keys(FIELD_TYPE_LABELS) as CustomFieldType[];

// ── helpers ───────────────────────────────────────────────────────────────────

function FieldTypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon = FIELD_TYPE_ICONS[type as CustomFieldType] ?? Type;
  return <Icon className={className ?? "h-4 w-4"} />;
}

// ── CustomFieldManager ────────────────────────────────────────────────────────

export function CustomFieldManager() {
  const { customFields, addCustomField, updateCustomField, removeCustomField } = useSprint();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "text" as CustomFieldType,
    required: false,
    options: "", // CSV para tipo select
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setForm({ name: "", type: "text", required: false, options: "" });
    setErrors({});
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (field: CustomFieldDefinition) => {
    setEditId(field.id ?? null);
    setForm({
      name: field.name,
      type: (field.type as CustomFieldType) ?? "text",
      required: field.required ?? false,
      options: (field.options ?? []).join(", "),
    });
    setOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Nome é obrigatório";
    if (form.type === "select" && !form.options.trim()) e.options = "Informe ao menos uma opção";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const parseOptions = () =>
    form.options
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const handleSave = async () => {
    if (!validate()) return;

    const payload: Omit<CustomFieldDefinition, "id"> = {
      name: form.name.trim(),
      type: form.type,
      required: form.required,
      options: form.type === "select" ? parseOptions() : null,
    };

    if (editId) {
      await updateCustomField(editId, payload);
      toast.success("Campo atualizado!");
    } else {
      await addCustomField(payload);
      toast.success("Campo criado!");
    }

    setOpen(false);
    resetForm();
  };

  const handleRemove = async (id: string) => {
    await removeCustomField(id);
    toast.success("Campo removido!");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">Campos Personalizados</h3>
          <p className="text-sm text-muted-foreground">Campos extras nas Histórias de Usuário</p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Campo
        </Button>
      </div>

      {/* Lista */}
      {customFields.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Nenhum campo personalizado criado ainda
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {customFields.map((field) => {
            const typedField = field as CustomFieldDefinition;
            const Icon = FIELD_TYPE_ICONS[typedField.type as CustomFieldType] ?? Type;
            return (
              <Card key={typedField.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm truncate">{typedField.name}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {FIELD_TYPE_LABELS[typedField.type as CustomFieldType] ?? typedField.type}
                    </Badge>
                    {typedField.required && (
                      <Badge variant="outline" className="text-xs text-destructive border-destructive/30 shrink-0">
                        Obrigatório
                      </Badge>
                    )}
                    {typedField.type === "select" && typedField.options && typedField.options.length > 0 && (
                      <span className="text-xs text-muted-foreground truncate">{typedField.options.join(" · ")}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(typedField)} className="h-7 w-7 p-0">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => typedField.id && handleRemove(typedField.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog criar/editar */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            setOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editId ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editId ? "Editar Campo" : "Novo Campo Personalizado"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Nome */}
            <div>
              <Label className="text-sm font-medium">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  setForm((p) => ({ ...p, name: e.target.value }));
                  setErrors((p) => ({ ...p, name: "" }));
                }}
                placeholder="Ex: Prioridade de Negócio"
                className="mt-1"
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>

            {/* Tipo */}
            <div>
              <Label className="text-sm font-medium">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as CustomFieldType }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_TYPES.map((t) => {
                    const Icon = FIELD_TYPE_ICONS[t];
                    return (
                      <SelectItem key={t} value={t}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {FIELD_TYPE_LABELS[t]}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Opções (apenas select) */}
            {form.type === "select" && (
              <div>
                <Label className="text-sm font-medium">
                  Opções <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.options}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, options: e.target.value }));
                    setErrors((p) => ({ ...p, options: "" }));
                  }}
                  placeholder="Opção 1, Opção 2, Opção 3"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Separe as opções por vírgula</p>
                {errors.options && <p className="text-xs text-destructive mt-1">{errors.options}</p>}
              </div>
            )}

            {/* Obrigatório */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Obrigatório</p>
                <p className="text-xs text-muted-foreground">Exige preenchimento ao criar a HU</p>
              </div>
              <Switch checked={form.required} onCheckedChange={(v) => setForm((p) => ({ ...p, required: v }))} />
            </div>

            {/* Ações */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                <X className="h-4 w-4" /> Cancelar
              </Button>
              <Button className="flex-1 gap-2" onClick={handleSave}>
                <Save className="h-4 w-4" />
                {editId ? "Salvar" : "Criar Campo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
