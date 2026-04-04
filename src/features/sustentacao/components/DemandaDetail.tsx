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
import { Clock, History, FileText, Plus, Trash2 } from "lucide-react";
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
        <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span className="font-mono text-primary">{demanda.rhm}</span>
              <Badge variant="outline" className="capitalize">{demanda.tipo}</Badge>
              {demanda.sla === '24x7' && <Badge variant="destructive" className="text-[10px]">24x7</Badge>}
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-6">
              {/* Status & Move */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={SITUACAO_COLORS[demanda.situacao] || ''}>
                  {SITUACAO_LABELS[demanda.situacao] || demanda.situacao}
                </Badge>
                {papel && <span className="text-xs text-muted-foreground">Responsável ativo: <strong className="capitalize">{papel}</strong></span>}
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
                <div><span className="text-muted-foreground">SLA:</span> <strong>{demanda.sla}</strong></div>
              </div>
              {demanda.descricao && <p className="text-sm text-muted-foreground">{demanda.descricao}</p>}

              <Separator />

              <Tabs defaultValue="historico">
                <TabsList className="w-full">
                  <TabsTrigger value="historico" className="flex-1 gap-1"><History className="h-3.5 w-3.5" />Histórico</TabsTrigger>
                  <TabsTrigger value="horas" className="flex-1 gap-1"><Clock className="h-3.5 w-3.5" />Horas ({total}h)</TabsTrigger>
                </TabsList>

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

      {/* Justificativa modal */}
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
