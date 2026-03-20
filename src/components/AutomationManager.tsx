import { useState } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Wand2, Plus, Trash2, Pencil, ArrowRight, Zap } from "lucide-react";
import { toast } from "sonner";

const ACTION_TYPE_LABELS: Record<string, string> = {
  change_status: "Alterar Status",
  notify: "Exibir Notificação",
};

export function AutomationManager() {
  const { automationRules, addAutomationRule, updateAutomationRule, removeAutomationRule, workflowColumns } = useSprint();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [fromStatus, setFromStatus] = useState("any");
  const [toStatus, setToStatus] = useState("");
  const [actionType, setActionType] = useState<"change_status" | "notify">("notify");
  const [targetStatus, setTargetStatus] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setName(""); setEnabled(true); setFromStatus("any"); setToStatus(""); setActionType("notify");
    setTargetStatus(""); setMessage(""); setErrors({}); setEditId(null);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nome da regra é obrigatório";
    if (!toStatus) e.toStatus = "Selecione o status de destino";
    if (actionType === "change_status" && !targetStatus) e.targetStatus = "Selecione o status alvo";
    if (actionType === "notify" && !message.trim()) e.message = "Mensagem é obrigatória";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const rule = {
      name: name.trim(),
      enabled,
      trigger: {
        type: "status_change" as const,
        fromStatus: fromStatus === "any" ? undefined : fromStatus,
        toStatus,
      },
      action: {
        type: actionType,
        targetStatus: actionType === "change_status" ? targetStatus : undefined,
        message: actionType === "notify" ? message.trim() : undefined,
      },
    };
    if (editId) {
      updateAutomationRule(editId, rule);
      toast.success("Regra atualizada!");
    } else {
      addAutomationRule(rule);
      toast.success("Regra de automação criada!");
    }
    resetForm();
    setOpen(false);
  };

  const openEdit = (id: string) => {
    const rule = automationRules.find((r) => r.id === id);
    if (!rule) return;
    setEditId(rule.id); setName(rule.name); setEnabled(rule.enabled);
    setFromStatus(rule.trigger.fromStatus || "any"); setToStatus(rule.trigger.toStatus);
    setActionType(rule.action.type as "change_status" | "notify");
    setTargetStatus(rule.action.targetStatus || ""); setMessage(rule.action.message || "");
    setErrors({}); setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">Automações</h2>
          <Badge variant="secondary">{automationRules.length}</Badge>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Nova Regra</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                {editId ? "Editar Regra" : "Nova Regra de Automação"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome da Regra <span className="text-destructive">*</span></Label>
                <Input value={name} onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }} placeholder="Ex: Notificar ao entrar em Code Review" className="mt-1" />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>

              <div className="rounded-lg border p-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quando (Gatilho)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">De (status)</Label>
                    <Select value={fromStatus} onValueChange={setFromStatus}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Qualquer status</SelectItem>
                        {workflowColumns.map((col) => (
                          <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Para (status) <span className="text-destructive">*</span></Label>
                    <Select value={toStatus} onValueChange={(v) => { setToStatus(v); setErrors((p) => ({ ...p, toStatus: "" })); }}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {workflowColumns.map((col) => (
                          <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.toStatus && <p className="text-xs text-destructive mt-1">{errors.toStatus}</p>}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Então (Ação)</p>
                <div>
                  <Label className="text-xs">Tipo de Ação</Label>
                  <Select value={actionType} onValueChange={(v) => setActionType(v as typeof actionType)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACTION_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {actionType === "change_status" && (
                  <div>
                    <Label className="text-xs">Mover para <span className="text-destructive">*</span></Label>
                    <Select value={targetStatus} onValueChange={(v) => { setTargetStatus(v); setErrors((p) => ({ ...p, targetStatus: "" })); }}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {workflowColumns.map((col) => (
                          <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.targetStatus && <p className="text-xs text-destructive mt-1">{errors.targetStatus}</p>}
                  </div>
                )}
                {actionType === "notify" && (
                  <div>
                    <Label className="text-xs">Mensagem <span className="text-destructive">*</span></Label>
                    <Input value={message} onChange={(e) => { setMessage(e.target.value); setErrors((p) => ({ ...p, message: "" })); }} placeholder="Ex: HU precisa de revisão de código" className="mt-1" />
                    {errors.message && <p className="text-xs text-destructive mt-1">{errors.message}</p>}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm">Regra ativa?</Label>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <Button type="submit" className="w-full gap-2">
                <Wand2 className="h-4 w-4" /> {editId ? "Salvar" : "Criar Regra"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {automationRules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Wand2 className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">Nenhuma automação configurada</p>
            <p className="text-sm mt-1">Crie regras para automatizar ações ao mover HUs no Board</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {automationRules.map((rule) => {
            const fromCol = rule.trigger.fromStatus ? workflowColumns.find((c) => c.key === rule.trigger.fromStatus) : null;
            const toCol = workflowColumns.find((c) => c.key === rule.trigger.toStatus);
            const targetCol = rule.action.targetStatus ? workflowColumns.find((c) => c.key === rule.action.targetStatus) : null;
            return (
              <Card key={rule.id} className={`group hover:shadow-md transition-shadow ${!rule.enabled ? "opacity-50" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Zap className={`h-4 w-4 ${rule.enabled ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="font-semibold text-sm">{rule.name}</span>
                        {!rule.enabled && <Badge variant="secondary" className="text-[10px]">Desativada</Badge>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span>Quando HU mover de</span>
                        <Badge variant="outline" className="text-[10px]">{fromCol?.label || "Qualquer"}</Badge>
                        <ArrowRight className="h-3 w-3" />
                        <Badge variant="outline" className="text-[10px]">{toCol?.label || "?"}</Badge>
                        <span>→</span>
                        {rule.action.type === "notify" && (
                          <span className="italic">Notificar: "{rule.action.message}"</span>
                        )}
                        {rule.action.type === "change_status" && (
                          <span>Mover para <Badge variant="outline" className="text-[10px]">{targetCol?.label || "?"}</Badge></span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch checked={rule.enabled} onCheckedChange={(v) => updateAutomationRule(rule.id, { enabled: v })} />
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => openEdit(rule.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={() => { removeAutomationRule(rule.id); toast.info("Regra removida"); }}>
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
