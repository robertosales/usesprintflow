import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Search, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useProjetos } from "../hooks/useProjetos";
import { TIPOS_DEMANDA_IMR, getPrazoRegra, calcPrazoInicio, calcPrazoSolucao, isSolucaoDefinidaNaOS } from "../types/imr";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => Promise<void>;
}

export function DemandaForm({ open, onClose, onSubmit }: Props) {
  const { projetos, loading: loadingProjetos } = useProjetos();
  const [form, setForm] = useState({
    rhm: '', projeto: '', tipo: 'manutencao_corretiva', descricao: '',
    sla: 'padrao', demandante: '', ordem_servico: '',
    tipo_defeito: 'impeditivo', originada_diagnostico: false,
    data_previsao_encerramento: null as Date | null,
  });
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [dataInicio] = useState(() => new Date());

  // Demandante search
  const [demandanteSearch, setDemandanteSearch] = useState('');
  const [demandanteResults, setDemandanteResults] = useState<Array<{ id: string; user_id: string; display_name: string }>>([]);
  const [selectedDemandante, setSelectedDemandante] = useState<{ id: string; display_name: string } | null>(null);

  const markTouched = (field: string) => setTouched(p => ({ ...p, [field]: true }));

  const isCorretiva = form.tipo === 'manutencao_corretiva';

  // Reset conditional fields when tipo changes away from corretiva
  useEffect(() => {
    if (!isCorretiva) {
      setForm(p => ({ ...p, sla: 'padrao', tipo_defeito: 'impeditivo', originada_diagnostico: false }));
    }
  }, [isCorretiva]);

  // Calculate deadlines
  const prazoInfo = useMemo(() => {
    const regime = isCorretiva ? form.sla : undefined;
    const defeito = isCorretiva ? form.tipo_defeito : undefined;
    const regra = getPrazoRegra(form.tipo, regime, defeito);
    if (!regra) return null;

    const prazoInicio = calcPrazoInicio(dataInicio, form.tipo, regime, defeito);
    const prazoSolucao = calcPrazoSolucao(dataInicio, form.tipo, regime, defeito);
    const isOS = isSolucaoDefinidaNaOS(form.tipo, regime, defeito);

    return { regra, prazoInicio, prazoSolucao, isOS };
  }, [form.tipo, form.sla, form.tipo_defeito, isCorretiva, dataInicio]);

  // Auto-set data_previsao_encerramento when prazo changes
  useEffect(() => {
    if (prazoInfo?.prazoSolucao) {
      setForm(p => ({ ...p, data_previsao_encerramento: prazoInfo.prazoSolucao }));
    }
  }, [prazoInfo?.prazoSolucao]);

  const searchDemandante = async (q: string) => {
    setDemandanteSearch(q);
    if (q.length < 2) { setDemandanteResults([]); return; }
    const { data } = await supabase.from("profiles").select("id, user_id, display_name").ilike("display_name", `%${q}%`).limit(5);
    setDemandanteResults((data || []) as any[]);
  };

  const rhmError = touched.rhm && !form.rhm.trim();
  const projetoError = touched.projeto && !form.projeto;
  const demandanteError = touched.demandante && !selectedDemandante;
  const previsaoError = touched.data_previsao_encerramento && !form.data_previsao_encerramento;

  const handle = async () => {
    setTouched({ rhm: true, projeto: true, demandante: true, data_previsao_encerramento: true });
    if (!form.rhm.trim() || !form.projeto || !selectedDemandante || !form.data_previsao_encerramento) {
      toast.error("Preencha os campos obrigatórios: RHM, Projeto, Demandante e Data de Previsão.");
      return;
    }
    setLoading(true);
    const regime = isCorretiva ? form.sla : 'padrao';
    const defeito = isCorretiva ? form.tipo_defeito : undefined;

    await onSubmit({
      rhm: form.rhm,
      projeto: form.projeto,
      tipo: form.tipo,
      descricao: form.descricao,
      sla: regime,
      demandante: selectedDemandante.id,
      ordem_servico: form.ordem_servico || null,
      tipo_defeito: isCorretiva ? form.tipo_defeito : null,
      originada_diagnostico: isCorretiva ? form.originada_diagnostico : false,
      prazo_inicio_atendimento: calcPrazoInicio(dataInicio, form.tipo, regime, defeito)?.toISOString() || null,
      prazo_solucao: calcPrazoSolucao(dataInicio, form.tipo, regime, defeito)?.toISOString() || null,
      data_previsao_encerramento: form.data_previsao_encerramento ? format(form.data_previsao_encerramento, 'yyyy-MM-dd') : null,
    });
    setForm({ rhm: '', projeto: '', tipo: 'manutencao_corretiva', descricao: '', sla: 'padrao', demandante: '', ordem_servico: '', tipo_defeito: 'impeditivo', originada_diagnostico: false, data_previsao_encerramento: null });
    setSelectedDemandante(null);
    setTouched({});
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova Demanda</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {/* LINHA 1: RHM + Projeto */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>RHM <span className="text-destructive">*</span></Label>
              <Input value={form.rhm} onChange={e => setForm(p => ({ ...p, rhm: e.target.value }))} onBlur={() => markTouched('rhm')} placeholder="RHM-001"
                className={rhmError ? 'border-destructive focus-visible:ring-destructive' : ''} />
              {rhmError && <p className="text-xs text-destructive mt-1">Campo obrigatório.</p>}
            </div>
            <div>
              <Label>Projeto <span className="text-destructive">*</span></Label>
              <Select value={form.projeto || '_none'} onValueChange={v => { setForm(p => ({ ...p, projeto: v === '_none' ? '' : v })); markTouched('projeto'); }}>
                <SelectTrigger className={projetoError ? 'border-destructive focus-visible:ring-destructive' : ''}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none" disabled>Selecione</SelectItem>
                  {projetos.map(p => <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {projetoError && <p className="text-xs text-destructive mt-1">Selecione um projeto.</p>}
            </div>
          </div>

          {/* LINHA 2: Data de Início (readonly) + OS */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="flex items-center gap-1.5">
                Data de Início
                <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-[#e8f2fa] text-[#1a6fa8]">automático</span>
              </Label>
              <div className="flex items-center gap-2 mt-1 px-3 py-2 rounded-md border bg-[#f5f8fb] text-sm">
                <Clock className="h-3.5 w-3.5 text-[#4a6278]" />
                <span className="font-medium text-[#0f1e2d]">{format(dataInicio, "dd/MM/yyyy HH:mm")}</span>
              </div>
            </div>
            <div>
              <Label>Ordem de Serviço — OS</Label>
              <Input value={form.ordem_servico} onChange={e => setForm(p => ({ ...p, ordem_servico: e.target.value }))} placeholder="Nº da OS (opcional)" className="mt-1" />
            </div>
          </div>

          {/* LINHA 3: Tipo (full width) */}
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v, data_previsao_encerramento: null }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {TIPOS_DEMANDA_IMR.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* BLOCO CONDICIONAL — Manutenção Corretiva */}
          {isCorretiva && (
            <div className="rounded-lg border p-4 space-y-3" style={{ backgroundColor: '#e8f2fa', borderColor: '#b3d4ed' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#1a6fa8' }}>
                Campos exclusivos — Manutenção Corretiva
              </p>
              {/* LINHA 4: Regime + Tipo de Defeito */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Regime de Atendimento</Label>
                  <Select value={form.sla} onValueChange={v => setForm(p => ({ ...p, sla: v, data_previsao_encerramento: null }))}>
                    <SelectTrigger className="mt-1 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="padrao">Padrão</SelectItem>
                      <SelectItem value="continuo">Contínuo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Tipo de Defeito</Label>
                  <RadioGroup value={form.tipo_defeito} onValueChange={v => setForm(p => ({ ...p, tipo_defeito: v, data_previsao_encerramento: null }))} className="flex gap-4 mt-2">
                    <div className="flex items-center gap-2"><RadioGroupItem value="impeditivo" id="imp" /><Label htmlFor="imp" className="font-normal text-sm">Impeditivo</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="nao_impeditivo" id="nimp" /><Label htmlFor="nimp" className="font-normal text-sm">Não impeditivo</Label></div>
                  </RadioGroup>
                </div>
              </div>
              {/* LINHA 5: Diagnóstico */}
              <div className="flex items-center gap-2">
                <Checkbox checked={form.originada_diagnostico} onCheckedChange={v => setForm(p => ({ ...p, originada_diagnostico: !!v }))} id="diag" />
                <Label htmlFor="diag" className="font-normal text-sm">Originada de diagnóstico de incidente?</Label>
                {form.originada_diagnostico && <span className="text-xs font-medium ml-2" style={{ color: '#1a6fa8' }}>→ Prazo de início: IMEDIATO</span>}
              </div>
            </div>
          )}

          {/* LINHA 6: Demandante (full width) */}
          <div>
            <Label>Demandante <span className="text-destructive">*</span></Label>
            {selectedDemandante ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium bg-muted px-3 py-1.5 rounded-md">{selectedDemandante.display_name}</span>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedDemandante(null); setForm(p => ({ ...p, demandante: '' })); }}>Alterar</Button>
              </div>
            ) : (
              <div className="relative mt-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome..." value={demandanteSearch} onChange={e => searchDemandante(e.target.value)}
                  onBlur={() => markTouched('demandante')}
                  className={`pl-9 ${demandanteError ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
                {demandanteResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-32 overflow-y-auto">
                    {demandanteResults.map(r => (
                      <button key={r.id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50" onClick={() => {
                        setSelectedDemandante({ id: r.id, display_name: r.display_name });
                        setForm(p => ({ ...p, demandante: r.id }));
                        setDemandanteSearch(''); setDemandanteResults([]);
                      }}>{r.display_name}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {demandanteError && <p className="text-xs text-destructive mt-1">Selecione um demandante.</p>}
          </div>

          {/* LINHA 7: Prazos Calculados (full width, styled block) */}
          {prazoInfo && (
            <div className="rounded-lg border p-3 space-y-1" style={{ backgroundColor: '#e8f2fa', borderColor: '#b3d4ed' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#1a6fa8' }}>Prazos Calculados</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span style={{ color: '#4a6278' }}>Prazo máx. início:</span>
                  <span className="ml-1 font-medium" style={{ color: '#0f1e2d' }}>
                    {form.originada_diagnostico && isCorretiva ? 'IMEDIATO' : prazoInfo.prazoInicio ? format(prazoInfo.prazoInicio, "dd/MM/yyyy HH:mm") : '—'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#4a6278' }}>Prazo máx. solução:</span>
                  <span className="ml-1 font-medium" style={{ color: '#0f1e2d' }}>
                    {prazoInfo.isOS ? 'Definido na OS' : prazoInfo.prazoSolucao ? format(prazoInfo.prazoSolucao, "dd/MM/yyyy HH:mm") : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* LINHA 8: Data Previsão Encerramento (full width) */}
          <div>
            <Label>Data de Previsão de Encerramento <span className="text-destructive">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1",
                  !form.data_previsao_encerramento && "text-muted-foreground",
                  previsaoError && "border-destructive")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.data_previsao_encerramento ? format(form.data_previsao_encerramento, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={form.data_previsao_encerramento || undefined}
                  onSelect={d => { setForm(p => ({ ...p, data_previsao_encerramento: d || null })); markTouched('data_previsao_encerramento'); }}
                  className="p-3 pointer-events-auto" locale={ptBR} />
              </PopoverContent>
            </Popover>
            {previsaoError && <p className="text-xs text-destructive mt-1">Informe a data de previsão.</p>}
          </div>

          {/* LINHA 9: Descrição (full width) */}
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button style={{ backgroundColor: '#1a6fa8' }} className="hover:opacity-90 text-white" onClick={handle} disabled={loading}>{loading ? 'Criando...' : 'Criar Demanda'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}