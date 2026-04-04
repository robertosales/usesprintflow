import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useProjetos } from "../hooks/useProjetos";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { rhm: string; projeto: string; tipo: string; descricao: string; sla: string }) => Promise<void>;
}

export function DemandaForm({ open, onClose, onSubmit }: Props) {
  const { projetos } = useProjetos();
  const [form, setForm] = useState({ rhm: '', projeto: '', tipo: 'corretiva', descricao: '', sla: 'padrao' });
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!form.rhm.trim() || !form.projeto.trim()) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    setLoading(true);
    await onSubmit(form);
    setForm({ rhm: '', projeto: '', tipo: 'corretiva', descricao: '', sla: 'padrao' });
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova Demanda</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>RHM *</Label>
            <Input value={form.rhm} onChange={e => setForm(p => ({ ...p, rhm: e.target.value }))} placeholder="RHM-001" />
          </div>
          <div>
            <Label>Projeto *</Label>
            {projetos.length > 0 ? (
              <Select value={form.projeto} onValueChange={v => setForm(p => ({ ...p, projeto: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione um projeto" /></SelectTrigger>
                <SelectContent>
                  {projetos.map(p => <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.projeto} onChange={e => setForm(p => ({ ...p, projeto: e.target.value }))} placeholder="Nome do projeto" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corretiva">Corretiva</SelectItem>
                  <SelectItem value="evolutiva">Evolutiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>SLA</Label>
              <Select value={form.sla} onValueChange={v => setForm(p => ({ ...p, sla: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="padrao">Padrão</SelectItem>
                  <SelectItem value="24x7">24x7</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handle} disabled={loading}>{loading ? 'Criando...' : 'Criar Demanda'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
