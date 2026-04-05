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
  const { projetos, loading: loadingProjetos } = useProjetos();
  const [form, setForm] = useState({ rhm: '', projeto: '', tipo: 'corretiva', descricao: '', sla: 'padrao' });
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = (field: string) => setTouched(p => ({ ...p, [field]: true }));

  const rhmError = touched.rhm && !form.rhm.trim();
  const projetoError = touched.projeto && !form.projeto;

  const handle = async () => {
    setTouched({ rhm: true, projeto: true });
    if (!form.rhm.trim() || !form.projeto) {
      toast.error("Preencha os campos obrigatórios: RHM e Projeto.");
      return;
    }
    setLoading(true);
    await onSubmit(form);
    setForm({ rhm: '', projeto: '', tipo: 'corretiva', descricao: '', sla: 'padrao' });
    setTouched({});
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova Demanda</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>RHM <span className="text-destructive">*</span></Label>
            <Input
              value={form.rhm}
              onChange={e => setForm(p => ({ ...p, rhm: e.target.value }))}
              onBlur={() => markTouched('rhm')}
              placeholder="RHM-001"
              className={rhmError ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {rhmError && <p className="text-xs text-destructive mt-1">Campo obrigatório.</p>}
          </div>
          <div>
            <Label>Projeto <span className="text-destructive">*</span></Label>
            <Select value={form.projeto || '_none'} onValueChange={v => { setForm(p => ({ ...p, projeto: v === '_none' ? '' : v })); markTouched('projeto'); }}>
              <SelectTrigger className={projetoError ? 'border-destructive focus-visible:ring-destructive' : ''}><SelectValue placeholder="Selecione um projeto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none" disabled>Selecione um projeto</SelectItem>
                {projetos.map(p => <SelectItem key={p.id} value={p.nome}>{p.nome}{p.sla === '24x7' ? ' (24x7)' : ''}</SelectItem>)}
              </SelectContent>
            </Select>
            {projetoError && <p className="text-xs text-destructive mt-1">Selecione um projeto.</p>}
            {projetos.length === 0 && !loadingProjetos && (
              <p className="text-[10px] text-muted-foreground mt-1">Nenhum projeto cadastrado. Crie um projeto primeiro.</p>
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
          <Button className="bg-info hover:bg-info/90 text-info-foreground" onClick={handle} disabled={loading}>{loading ? 'Criando...' : 'Criar Demanda'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
