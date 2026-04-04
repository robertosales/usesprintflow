import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, History, FileText, Plus, Trash2, Users, CheckCircle2, Edit, MoreHorizontal } from "lucide-react";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  nova: 'Nova', execucao_dev: 'Execução / Dev', teste: 'Teste',
  aguardando_homologacao: 'Aguard. Homologação', producao: 'Produção', aceite_final: 'Aceite Final',
};

const PAPEL_LABELS: Record<string, string> = {
  requisitos: 'Requisitos', dev: 'Dev', teste: 'Teste', arquiteto: 'Arquiteto',
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
          <SheetHeader className="space-y-3">
            {/* Breadcrumb */}
            <p className="text-xs text-muted-foreground">Demandas &gt; {demanda.rhm}</p>
            
            {/* Title row */}
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-info font-bold text-lg">{demanda.rhm}</span>
                {demanda.sla === '24x7' && <Badge variant="destructive" className="text-[10px]">SLA 24x7</Badge>}
              </SheetTitle>
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><MoreHorizontal className="h-3.5 w-3.5" />Ações</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><Edit className="h-3.5 w-3.5 mr-1.5" />Editar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {/* Subtitle */}
            <p className="text-sm text-muted-foreground">{demanda.projeto} · <span className="capitalize">{demanda.tipo}</span></p>
          </SheetHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-5 pb-6">
              {/* Stepper - matching reference image style */}
              <div className="flex items-center gap-0.5 overflow-x-auto py-3">
                {STEPPER_STEPS.map((step, idx) => {
                  const isActive = demanda.situacao === step;
                  const isPast = currentStepIdx >= 0 && idx < currentStepIdx;
                  return (
                    <div key={step} className={`flex-1 text-center py-1.5 px-1 text-[10px] font-medium border-b-2 transition-colors ${
                      isActive ? 'border-info bg-info/10 text-info' :
                      isPast ? 'border-info/50 bg-info/5 text-info/70' :
                      'border-border text-muted-foreground'
                    }`}>
                      {STEPPER_LABELS[step]}
                    </div>
                  );
                })}
              </div>

              {/* Tabs */}
              <Tabs defaultValue="detalhes">
                <TabsList className="w-full">
                  <TabsTrigger value="detalhes" className="flex-1 gap-1 text-xs"><FileText className="h-3.5 w-3.5" />Detalhes</TabsTrigger>
                  <TabsTrigger value="historico" className="flex-1 gap-1 text-xs"><History className="h-3.5 w-3.5" />Histórico</TabsTrigger>
                  <TabsTrigger value="horas" className="flex-1 gap-1 text-xs"><Clock className="h-3.5 w-3.5" />Atividades ({total}h)</TabsTrigger>
                  <TabsTrigger value="responsaveis" className="flex-1 gap-1 text-xs"><Users className="h-3.5 w-3.5" />Responsáveis</TabsTrigger>
                </TabsList>

                <TabsContent value="detalhes" className="mt-3">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Left: Description */}
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Descrição</p>
                        <p className="text-sm">{demanda.descricao || 'Sem descrição'}</p>
                      </CardContent>
                    </Card>
                    
                    {/* Right: Info */}
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Histórico de Situações</p>
                        {/* Current status */}
                        <div className="flex items-center gap-2">
                          <Badge className={`text-[10px] ${SITUACAO_COLORS[demanda.situacao] || ''}`}>
                            {SITUACAO_LABELS[demanda.situacao] || demanda.situacao}
                          </Badge>
                          {papel && <span className="text-[10px] text-muted-foreground">Resp: <strong className="capitalize">{PAPEL_LABELS[papel]}</strong></span>}
                        </div>
                        
                        {/* Quick info */}
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between"><span className="text-muted-foreground">Projeto:</span><span className="font-medium">{demanda.projeto}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Tipo:</span><span className="font-medium capitalize">{demanda.tipo}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Criada em:</span><span className="font-medium">{new Date(demanda.created_at).toLocaleDateString('pt-BR')} {new Date(demanda.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">SLA:</span><span className="font-medium">{demanda.sla === '24x7' ? '24x7' : 'Padrão'}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Move status */}
                  <div className="flex gap-2 mt-4">
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
                    <Button size="sm" className="bg-info hover:bg-info/90 text-info-foreground" onClick={handleMove} disabled={!newStatus}>Mover</Button>
                  </div>
                </TabsContent>

                <TabsContent value="historico" className="space-y-2 mt-3">
                  {tLoading && <p className="text-xs text-muted-foreground">Carregando...</p>}
                  {!tLoading && transitions.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma transição registrada</p>}
                  {transitions.map(t => (
                    <div key={t.id} className="flex items-start gap-3 text-xs border-l-2 border-info/30 pl-3 py-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <Badge className="bg-info/10 text-info border-info/20 text-[10px]">{SITUACAO_LABELS[t.to_status] || t.to_status}</Badge>
                        </div>
                        <p className="text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleString('pt-BR')}</p>
                        {t.justificativa && <p className="italic text-muted-foreground mt-0.5">"{t.justificativa}"</p>}
                        {t.from_status && <p className="text-[10px] text-muted-foreground">De: {SITUACAO_LABELS[t.from_status]}</p>}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="horas" className="space-y-3 mt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-info/10 text-info border-info/20">Total Acumulado: {total}h</Badge>
                    </div>
                    <Button size="sm" className="bg-info hover:bg-info/90 text-info-foreground h-7 text-xs" onClick={() => {}}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Nova Atividade
                    </Button>
                  </div>
                  
                  {/* Add hour form */}
                  <div className="flex gap-2 flex-wrap">
                    <Input type="number" placeholder="Horas" value={hourForm.horas} onChange={e => setHourForm(p => ({ ...p, horas: e.target.value }))} className="h-8 w-20 text-xs" />
                    <Select value={hourForm.fase} onValueChange={v => setHourForm(p => ({ ...p, fase: v }))}>
                      <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FASES.map(f => <SelectItem key={f} value={f}>{FASE_LABELS[f]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Descrição" value={hourForm.descricao} onChange={e => setHourForm(p => ({ ...p, descricao: e.target.value }))} className="h-8 text-xs flex-1 min-w-[120px]" />
                    <Button size="sm" className="h-8 bg-info hover:bg-info/90 text-info-foreground" onClick={handleAddHour}><Plus className="h-3.5 w-3.5" /></Button>
                  </div>

                  {/* Hours table */}
                  {hours.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-2 font-medium">Data</th>
                            <th className="text-left p-2 font-medium">Fase</th>
                            <th className="text-left p-2 font-medium">Descrição</th>
                            <th className="text-right p-2 font-medium">Horas</th>
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {hours.map(h => (
                            <tr key={h.id} className="border-b last:border-0">
                              <td className="p-2">{new Date(h.created_at).toLocaleDateString('pt-BR')}</td>
                              <td className="p-2"><Badge className="text-[10px] bg-info/10 text-info border-info/20">{FASE_LABELS[h.fase] || h.fase}</Badge></td>
                              <td className="p-2 text-muted-foreground">{h.descricao || '-'}</td>
                              <td className="p-2 text-right font-medium">{h.horas}h</td>
                              <td className="p-2">
                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setDeleteHourId(h.id)}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="responsaveis" className="mt-3">
                  <p className="text-xs text-muted-foreground mb-3">O papel ativo muda automaticamente conforme a situação da demanda.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(['requisitos', 'dev', 'teste', 'arquiteto'] as const).map(role => {
                      const key = `responsavel_${role}` as keyof Demanda;
                      const isActive = papel === role;
                      return (
                        <Card key={role} className={`${isActive ? 'border-info bg-info/5' : ''}`}>
                          <CardContent className="p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold capitalize">{PAPEL_LABELS[role]}</p>
                              {isActive && <Badge className="bg-info text-info-foreground text-[10px]">Ativo</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {demanda[key] ? `ID: ${String(demanda[key]).slice(0, 8)}...` : 'Não atribuído'}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Aceite Final */}
              {demanda.situacao === 'producao' && !demanda.aceite_data && (
                <Card className="border-info/30 bg-info/5">
                  <CardContent className="p-3 space-y-2">
                    <p className="text-sm font-medium">Aceite Final</p>
                    <p className="text-xs text-muted-foreground">Registre o aceite para encerrar a demanda.</p>
                    <Button size="sm" className="bg-info hover:bg-info/90 text-info-foreground" onClick={() => onMoveTo(demanda, 'aceite_final')}>Registrar Aceite</Button>
                  </CardContent>
                </Card>
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
