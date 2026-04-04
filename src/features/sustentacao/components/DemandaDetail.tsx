import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, History, FileText, Plus, Trash2, Users, CheckCircle2 } from "lucide-react";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import type { Demanda } from "../types/demanda";
import { SITUACAO_LABELS, SITUACAO_COLORS, FASES, FASE_LABELS, getResponsavelAtivo, ALL_SITUACOES, REQUIRES_JUSTIFICATIVA } from "../types/demanda";
import { useTransitions, useHours } from "../hooks/useDemandas";

interface Props {
  demanda: Demanda | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Demanda>) => Promise<void>;
  onMoveTo: (demanda: Demanda, newStatus: string, justificativa?: string) => Promise<boolean>;
}

const STEPPER_STEPS = ['nova', 'execucao_dev', 'teste', 'aguardando_homologacao', 'producao', 'aceite_final'];
const STEPPER_LABELS: Record<string, string> = {
  nova: 'Nova', execucao_dev: 'Execução', teste: 'Teste',
  aguardando_homologacao: 'Homologação', producao: 'Produção', aceite_final: 'Aceite',
};

const PAPEL_LABELS: Record<string, string> = {
  requisitos: 'Requisitos', dev: 'Desenvolvedor', teste: 'Teste', arquiteto: 'Arquiteto',
};

export function DemandaDetail({ demanda, open, onClose, onUpdate, onMoveTo }: Props) {
  const { transitions, loading: tLoading } = useTransitions(demanda?.id ?? null);
  const { hours, total, add: addHour, remove: removeHour, loading: hLoading } = useHours(demanda?.id ?? null);
  const [newStatus, setNewStatus] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [showJustModal, setShowJustModal] = useState(false);
  const [hourForm, setHourForm] = useState({ horas: '', fase: 'execucao', descricao: '' });
  const [deleteHourId, setDeleteHourId] = useState<string | null>(null);

  if (!demanda) return null;

  const papel = getResponsavelAtivo(demanda);
  const currentStepIdx = STEPPER_STEPS.indexOf(demanda.situacao);

  const handleMove = async () => {
    if (!newStatus) return;
    if (REQUIRES_JUSTIFICATIVA.includes(newStatus)) {
      setShowJustModal(true);
      return;
    }
    const ok = await onMoveTo(demanda, newStatus);
    if (ok) setNewStatus('');
  };

  const confirmMove = async () => {
    if (!newStatus) return;
    const ok = await onMoveTo(demanda, newStatus, justificativa);
    if (ok) { setNewStatus(''); setJustificativa(''); setShowJustModal(false); }
  };

  const handleAddHour = async () => {
    const h = parseFloat(hourForm.horas);
    if (!h || h <= 0) return;
    await addHour({ horas: h, fase: hourForm.fase, descricao: hourForm.descricao });
    setHourForm({ horas: '', fase: 'execucao', descricao: '' });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-info font-bold">{demanda.rhm}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm">{demanda.projeto}</span>
              <Badge variant="outline" className="capitalize">{demanda.tipo}</Badge>
              {demanda.sla === '24x7' && <Badge variant="destructive" className="text-[10px]">24x7</Badge>}
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-5 pb-6">
              {/* Stepper */}
              <div className="flex items-center gap-1 overflow-x-auto py-2">
                {STEPPER_STEPS.map((step, idx) => {
                  const isActive = demanda.situacao === step;
                  const isPast = currentStepIdx >= 0 && idx < currentStepIdx;
                  return (
                    <div key={step} className="flex items-center gap-1 shrink-0">
                      <div className={`flex items-center justify-center h-7 px-2.5 rounded-full text-[10px] font-medium border transition-colors ${
                        isActive ? 'bg-info text-info-foreground border-info' :
                        isPast ? 'bg-success/20 text-success border-success/30' :
                        'bg-muted text-muted-foreground border-border'
                      }`}>
                        {isPast ? <CheckCircle2 className="h-3 w-3 mr-1" /> : null}
                        {STEPPER_LABELS[step] || step}
                      </div>
                      {idx < STEPPER_STEPS.length - 1 && (
                        <div className={`w-4 h-px ${isPast ? 'bg-success' : 'bg-border'}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Status & Move */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={SITUACAO_COLORS[demanda.situacao] || ''}>
                  {SITUACAO_LABELS[demanda.situacao] || demanda.situacao}
                </Badge>
                {papel && <span className="text-xs text-muted-foreground">Responsável ativo: <strong className="capitalize">{PAPEL_LABELS[papel] || papel}</strong></span>}
              </div>

              <div className="flex gap-2">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Mover para..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_SITUACOES.filter(s => s !== demanda.situacao).map(s => (
                      <SelectItem key={s} value={s}>{SITUACAO_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleMove} disabled={!newStatus}>Mover</Button>
              </div>

              <Separator />

              {/* Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Projeto:</span> <strong>{demanda.projeto}</strong></div>
                <div><span className="text-muted-foreground">SLA:</span> <strong>{demanda.sla === '24x7' ? '24x7' : 'Padrão'}</strong></div>
              </div>
              {demanda.descricao && <p className="text-sm text-muted-foreground">{demanda.descricao}</p>}

              <Separator />

              {/* Tabs */}
              <Tabs defaultValue="detalhes">
                <TabsList className="w-full">
                  <TabsTrigger value="detalhes" className="flex-1 gap-1 text-xs"><FileText className="h-3.5 w-3.5" />Detalhes</TabsTrigger>
                  <TabsTrigger value="historico" className="flex-1 gap-1 text-xs"><History className="h-3.5 w-3.5" />Histórico</TabsTrigger>
                  <TabsTrigger value="horas" className="flex-1 gap-1 text-xs"><Clock className="h-3.5 w-3.5" />Horas ({total}h)</TabsTrigger>
                  <TabsTrigger value="responsaveis" className="flex-1 gap-1 text-xs"><Users className="h-3.5 w-3.5" />Responsáveis</TabsTrigger>
                </TabsList>

                <TabsContent value="detalhes" className="space-y-3 mt-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground text-xs">Tipo:</span><p className="capitalize font-medium">{demanda.tipo}</p></div>
                    <div><span className="text-muted-foreground text-xs">SLA:</span><p className="font-medium">{demanda.sla}</p></div>
                    <div><span className="text-muted-foreground text-xs">Criado em:</span><p className="font-medium">{new Date(demanda.created_at).toLocaleDateString('pt-BR')}</p></div>
                    <div><span className="text-muted-foreground text-xs">Atualizado:</span><p className="font-medium">{new Date(demanda.updated_at).toLocaleDateString('pt-BR')}</p></div>
                  </div>
                  {demanda.descricao && (
                    <div>
                      <span className="text-muted-foreground text-xs">Descrição:</span>
                      <p className="text-sm mt-1">{demanda.descricao}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="historico" className="space-y-2 mt-3">
                  {tLoading && <p className="text-xs text-muted-foreground">Carregando...</p>}
                  {!tLoading && transitions.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma transição registrada</p>}
                  {transitions.map(t => (
                    <div key={t.id} className="text-xs border rounded-lg p-2.5 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        {t.from_status && <Badge variant="outline" className="text-[10px] h-4">{SITUACAO_LABELS[t.from_status] || t.from_status}</Badge>}
                        <span>→</span>
                        <Badge variant="outline" className="text-[10px] h-4">{SITUACAO_LABELS[t.to_status] || t.to_status}</Badge>
                      </div>
                      <p className="text-muted-foreground">{new Date(t.created_at).toLocaleString('pt-BR')}</p>
                      {t.justificativa && <p className="italic text-muted-foreground">"{t.justificativa}"</p>}
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="horas" className="space-y-3 mt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Total: <strong>{total}h</strong></p>
                  </div>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Horas" value={hourForm.horas} onChange={e => setHourForm(p => ({ ...p, horas: e.target.value }))} className="h-8 w-20 text-xs" />
                    <Select value={hourForm.fase} onValueChange={v => setHourForm(p => ({ ...p, fase: v }))}>
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FASES.map(f => <SelectItem key={f} value={f}>{FASE_LABELS[f]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-8" onClick={handleAddHour}><Plus className="h-3.5 w-3.5" /></Button>
                  </div>
                  <Input placeholder="Descrição (opcional)" value={hourForm.descricao} onChange={e => setHourForm(p => ({ ...p, descricao: e.target.value }))} className="h-8 text-xs" />

                  {hours.map(h => (
                    <div key={h.id} className="text-xs border rounded-lg p-2.5 flex items-center justify-between">
                      <div>
                        <strong>{h.horas}h</strong> — {FASE_LABELS[h.fase] || h.fase}
                        {h.descricao && <span className="text-muted-foreground ml-1">· {h.descricao}</span>}
                        <p className="text-muted-foreground">{new Date(h.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteHourId(h.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="responsaveis" className="space-y-3 mt-3">
                  {(['requisitos', 'dev', 'teste', 'arquiteto'] as const).map(role => {
                    const key = `responsavel_${role}` as keyof Demanda;
                    const isActive = papel === role;
                    return (
                      <div key={role} className={`border rounded-lg p-3 space-y-1 ${isActive ? 'border-info bg-info/5' : ''}`}>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold capitalize">{PAPEL_LABELS[role]}</p>
                          {isActive && <Badge className="bg-info text-info-foreground text-[10px]">Ativo</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {demanda[key] ? `ID: ${demanda[key]}` : 'Não atribuído'}
                        </p>
                      </div>
                    );
                  })}
                </TabsContent>
              </Tabs>

              {/* Aceite Final */}
              {demanda.situacao === 'producao' && !demanda.aceite_data && (
                <div className="border rounded-lg p-3 bg-accent/50 space-y-2">
                  <p className="text-sm font-medium">Aceite Final</p>
                  <p className="text-xs text-muted-foreground">Registre o aceite para encerrar a demanda.</p>
                  <Button size="sm" onClick={() => onMoveTo(demanda, 'aceite_final')}>Registrar Aceite</Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={showJustModal}
        onOpenChange={setShowJustModal}
        title="Justificativa obrigatória"
        description="Informe a justificativa para esta mudança de status."
        confirmLabel="Confirmar"
        variant="default"
        onConfirm={confirmMove}
      />

      <ConfirmDialog
        open={!!deleteHourId}
        onOpenChange={(o) => !o && setDeleteHourId(null)}
        onConfirm={() => { if (deleteHourId) { removeHour(deleteHourId); setDeleteHourId(null); } }}
      />
    </>
  );
}
