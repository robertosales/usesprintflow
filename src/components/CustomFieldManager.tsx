import { useState } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { CustomFieldType } from "@/types/sprint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SlidersHorizontal, Plus, Trash2, Pencil, Type, Hash, List } from "lucide-react";
import { toast } from "sonner";

const FIELD_TYPE_ICONS: Record<CustomFieldType, React.ElementType> = {
  text: Type,
  number: Hash,
  select: List,
};
const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Texto",
  number: "Número",
  select: "Seleção",
};

export function CustomFieldManager() {
  const { customFields, addCustomField, updateCustomField, removeCustomField } = useSprint();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<CustomFieldType>("text");
  const [required, setRequired] = useState(false);
  const [optionsText, setOptionsText] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setName(""); setType("text"); setRequired(false); setOptionsText(""); setErrors({}); setEditId(null);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nome do campo é obrigatório";
    if (type === "select" && !optionsText.trim()) e.options = "Informe as opções separadas por vírgula";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const options = type === "select" ? optionsText.split(",").map((o) => o.trim()).filter(Boolean) : undefined;
    if (editId) {
      updateCustomField(editId, { name: name.trim(), type, required, options });
      toast.success("Campo atualizado!");
    } else {
      addCustomField({ name: name.trim(), type, required, options });
      toast.success("Campo personalizado criado!");
    }
    resetForm();
    setOpen(false);
  };

  const openEdit = (id: string) => {
    const field = customFields.find((f) => f.id === id);
    if (!field) return;
    setEditId(field.id); setName(field.name); setType(field.type); setRequired(field.required);
    setOptionsText(field.options?.join(", ") || "");
    setErrors({}); setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">Campos Personalizados</h2>
          <Badge variant="secondary">{customFields.length}</Badge>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Novo Campo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
                {editId ? "Editar Campo" : "Novo Campo Personalizado"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome do Campo <span className="text-destructive">*</span></Label>
                <Input value={name} onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }} placeholder="Ex: Ambiente de Deploy" className="mt-1" />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as CustomFieldType)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(FIELD_TYPE_LABELS) as [CustomFieldType, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {type === "select" && (
                <div>
                  <Label>Opções <span className="text-destructive">*</span></Label>
                  <Input value={optionsText} onChange={(e) => { setOptionsText(e.target.value); setErrors((p) => ({ ...p, options: "" })); }} placeholder="Opção 1, Opção 2, Opção 3" className="mt-1" />
                  <p className="text-[10px] text-muted-foreground mt-1">Separe as opções por vírgula</p>
                  {errors.options && <p className="text-xs text-destructive mt-1">{errors.options}</p>}
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm">Campo obrigatório?</Label>
                <Switch checked={required} onCheckedChange={setRequired} />
              </div>
              <Button type="submit" className="w-full gap-2">
                <SlidersHorizontal className="h-4 w-4" /> {editId ? "Salvar" : "Criar Campo"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {customFields.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <SlidersHorizontal className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">Nenhum campo personalizado</p>
            <p className="text-sm mt-1">Adicione campos extras às User Stories (texto, número ou seleção)</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {customFields.map((field) => {
            const Icon = FIELD_TYPE_ICONS[field.type];
            return (
              <Card key={field.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{field.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px]">{FIELD_TYPE_LABELS[field.type]}</Badge>
                          {field.required && <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">Obrigatório</Badge>}
                        </div>
                        {field.type === "select" && field.options && (
                          <p className="text-[10px] text-muted-foreground mt-1">Opções: {field.options.join(", ")}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(field.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { removeCustomField(field.id); toast.info("Campo removido"); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
