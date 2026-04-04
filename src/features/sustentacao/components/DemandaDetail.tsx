import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, History, FileText, Plus, Trash2, Users, Edit, Save, X, Search, UserPlus, ArrowLeft, Check, Circle, ChevronRight, MoveRight } from "lucide-react";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { Demanda } from "../types/demanda";
import { SITUACAO_LABELS, SITUACAO_COLORS, FASES, FASE_LABELS, ALL_SITUACOES, REQUIRES_JUSTIFICATIVA } from "../types/demanda";
import { useTransitions, useHours } from "../hooks/useDemandas";
import { useProjetos } from "../hooks/useProjetos";
import * as respSvc from "../services/responsaveis.service";
import type { DemandaResponsavel } from "../services/responsaveis.service";

interface Props {
  demanda: Demanda | null;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<Demanda>) => Promise<void>;
  onMoveTo: (demanda: Demanda, newStatus: string, justificativa?: string) => Promise<boolean>;
}

const STEPPER_STEPS = ['nova', 'execucao_dev', 'teste', 'aguardando_homologacao', 'producao', 'aceite_final'];
const STEPPER_LABELS: Record<string, string> = {
  nova: 'Nova', execucao_dev: 'Execução / Dev', teste: 'Teste',
  aguardando_homologacao: 'Homologação', producao: 'Produção', aceite_final: 'Aceite Final',
};

const PAPEIS_OPTIONS = [
  { value: 'analista', label: 'Analista' },
  { value: 'arquiteto', label: 'Arquiteto' },
  { value: 'desenvolvedor', label: 'Desenvolvedor' },
  { value: 'testador', label: 'Testador' },
  { value: 'gestor', label: 'Gestor' },
];

export function DemandaDetail({ demanda, onBack, onUpdate, onMoveTo }: Props) {
  const { user, profile } = useAuth();
  const { transitions, loading: tLoading } = useTransitions(demanda?.id ?? null);
  const { hours, total, add: addHour, remove: removeHour, loading: hLoading } = useHours(demanda?.id ?? null);
  const { projetos } = useProjetos();

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ projeto: '', tipo: '', descricao: '', sla: '' });

  const [newStatus, setNewStatus] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [showJustModal, setShowJustModal] = useState(false);

  const [hourForm, setHourForm] = useState({ horas: '', fase: 'execucao', descricao: '' });
  const [deleteHourId, setDeleteHourId] = useState<string | null>(null);

  const [responsaveis, setResponsaveis] = useState<DemandaResponsavel[]>([]);
  const [respLoading, setRespLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ user_id: string; display_name: string; email: string }[]>([]);
  const [addPapel, setAddPapel] = useState('desenvolvedor');
  const [deleteRespId, setDeleteRespId] = useState<string | null>(null);

  const [profilesMap, setProfilesMap] = useState<Map<string, string>>(new Map());

  const loadResponsaveis = useCallback(async () => {
    if (!demanda?.id) return;
    setRespLoading(true);
    try {
      const data = await respSvc.fetchResponsaveis(demanda.id);
      setResponsaveis(data);
    } catch { /* ignore */ }
    setRespLoading(false);
  }, [demanda?.id]);

  useEffect(() => {
    if (demanda?.id) {
      loadResponsaveis();
      setEditing(false);
    }
  }, [demanda?.id, loadResponsaveis]);

  useEffect(() => {
    if (hours.length === 0) return;
    const ids = [...new Set(hours.map(h => h.user_id))];
    const missing = ids.filter(id => !profilesMap.has(id));
    if (missing.length === 0) return;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.from("profiles").select("user_id, display_name").in("user_id", missing)
        .then(({ data }) => {
          if (data) {
            setProfilesMap(prev => {
              const next = new Map(prev);
              data.forEach(p => next.set(p.user_id, p.display_name));
              return next;
            });
          }
        });
    });
  }, [hours]);

  if (!demanda) return null;

  const currentStepIdx = STEPPER_STEPS.indexOf(demanda.situacao);

  const startEdit = () => {
    setEditForm({ projeto: demanda.projeto, tipo: demanda.tipo, descricao: demanda.descricao || '', sla: demanda.sla });
    setEditing(true);
  };
  const cancelEdit = () => setEditing(false);
  const saveEdit = async () => {
    try {
      await onUpdate(demanda.id, { projeto: editForm.projeto, tipo: editForm.tipo as any, descricao: editForm.descricao, sla: editForm.sla as any });
      setEditing(false);
    } catch { toast.error("Erro ao salvar alterações"); }
  };

  const handleMove = async () => {
    if (!newStatus) return;
    if (REQUIRES_JUSTIFICATIVA.includes(newStatus)) { setShowJustModal(true); return; }
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

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const results = await respSvc.searchProfiles(q);
      const existing = new Set(responsaveis.map(r => r.user_id));
      setSearchResults(results.filter(r => !existing.has(r.user_id)));
    } catch { /* ignore */ }
  };

  const handleAddResp = async (userId: string) => {
    if (!demanda?.id) return;
    try {
      await respSvc.addResponsavel(demanda.id, userId, addPapel);
      toast.success("Responsável adicionado");
      setSearchQuery(''); setSearchResults([]);
      await loadResponsaveis();
    } catch { toast.error("Erro ao adicionar responsável"); }
  };

  const handleRemoveResp = async () => {
    if (!deleteRespId) return;
    try {
      await respSvc.removeResponsavel(deleteRespId);
      toast.success("Responsável removido");
      setDeleteRespId(null);
      await loadResponsaveis();
    } catch { toast.error("Erro ao remover responsável"); }
  };

  return (
    <>
      <div className="w-full max-w-[1100px] mx-auto py-6 px-4 md:px-0 space-y-6 animate-in fade-in duration-300">
        {/* Breadcrumb + Back */}
        <div className="flex items-center gap-2 text-sm">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />Demandas
          </Button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono font-semibold text-info">{demanda.rhm}</span>
        </div>

        {/* Main Card Container */}
        <div className="bg-card rounded-xl border shadow-sm">
          {/* Header */}
          <div className="px-6 py-5 border-b">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold tracking-tight font-mono text-foreground">{demanda.rhm}</h1>
                  <Badge className={`text-xs ${SITUACAO_COLORS[demanda.situacao] || ''}`}>
                    {SITUACAO_LABELS[demanda.situacao] || demanda.situacao}
                  </Badge>
                  {demanda.sla === '24x7' && <Badge variant="destructive" className="text-xs">SLA 24x7</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {demanda.projeto} · <span className="capitalize">{demanda.tipo}</span> · Criada em {new Date(demanda.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {editing ? (
                  <>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={cancelEdit}><X className="h-4 w-4" />Cancelar</Button>
                    <Button size="sm" className="gap-1.5 bg-info hover:bg-info/90 text-info-foreground" onClick={saveEdit}><Save className="h-4 w-4" />Salvar</Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={startEdit}><Edit className="h-4 w-4" />Editar</Button>
                )}
              </div>
            </div>
          </div>

          {/* Stepper */}
          <div className="px-6 py-4 border-b bg-muted/30">
            <div className="flex items-center">
              {STEPPER_STEPS.map((step, idx) => {
                const isActive = demanda.situacao === step;
                const isPast = currentStepIdx >= 0 && idx < currentStepIdx;
                const isLast = idx === STEPPER_STEPS.length - 1;
                return (
                  <div key={step} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={`flex items-center justify-center h-8 w-8 rounded-full border-2 transition-all ${
                        isPast ? 'bg-emerald-500 border-emerald-500 text-white' :
                        isActive ? 'bg-info border-info text-info-foreground shadow-md shadow-info/25' :
                        'bg-muted border-border text-muted-foreground'
                      }`}>
                        {isPast ? <Check className="h-4 w-4" /> :
                         isActive ? <Circle className="h-3 w-3 fill-current" /> :
                         <span className="text-xs font-medium">{idx + 1}</span>}
                      </div>
                      <span className={`text-[11px] font-medium text-center leading-tight max-w-[80px] ${
                        isActive ? 'text-info font-semibold' : isPast ? 'text-emerald-600' : 'text-muted-foreground'
                      }`}>
                        {STEPPER_LABELS[step]}
                      </span>
                    </div>
                    {!isLast && (
                      <div className={`flex-1 h-0.5 mx-2 mt-[-18px] rounded-full transition-colors ${
                        isPast ? 'bg-emerald-500' :
                        isActive ? 'bg-gradient-to-r from-info to-border' :
                        'bg-border'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Move Action */}
          {!editing && (
            <div className="px-6 py-3 border-b bg-info/5">
              <div className="flex items-center gap-3">
                <MoveRight className="h-4 w-4 text-info shrink-0" />
                <span className="text-sm font-medium text-foreground shrink-0">Mover para:</span>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="h-9 text-sm flex-1 max-w-xs bg-card">
                    <SelectValue placeholder="Selecione a próxima etapa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_SITUACOES.filter(s => s !== demanda.situacao).map(s => (
                      <SelectItem key={s} value={s}>{SITUACAO_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button className="bg-info hover:bg-info/90 text-info-foreground" onClick={handleMove} disabled={!newStatus}>
                  Avançar
                </Button>
              </div>
            </div>
          )}

          {/* Tabs Content */}
          <div className="px-6 py-5">
            <Tabs defaultValue="detalhes">
              <TabsList className="bg-muted/50 p-1 h-auto">
                <TabsTrigger value="detalhes" className="gap-1.5 text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  <FileText className="h-4 w-4" />Detalhes
                </TabsTrigger>
                <TabsTrigger value="historico" className="gap-1.5 text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  <History className="h-4 w-4" />Histórico
                </TabsTrigger>
                <TabsTrigger value="horas" className="gap-1.5 text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  <Clock className="h-4 w-4" />Atividades <Badge variant="secondary" className="ml-1 text-[10px] h-5">{total}h</Badge>
                </TabsTrigger>
                <TabsTrigger value="responsaveis" className="gap-1.5 text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  <Users className="h-4 w-4" />Responsáveis <Badge variant="secondary" className="ml-1 text-[10px] h-5">{responsaveis.length}</Badge>
                </TabsTrigger>
              </TabsList>

              {/* DETALHES */}
              <TabsContent value="detalhes" className="mt-5">
                {editing ? (
                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Projeto</Label>
                        <Select value={editForm.projeto || '_none'} onValueChange={v => setEditForm(p => ({ ...p, projeto: v === '_none' ? '' : v }))}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none" disabled>Selecione</SelectItem>
                            {projetos.map(p => <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Tipo</Label>
                          <Select value={editForm.tipo} onValueChange={v => setEditForm(p => ({ ...p, tipo: v }))}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="corretiva">Corretiva</SelectItem>
                              <SelectItem value="evolutiva">Evolutiva</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">SLA</Label>
                          <Select value={editForm.sla} onValueChange={v => setEditForm(p => ({ ...p, sla: v }))}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="padrao">Padrão</SelectItem>
                              <SelectItem value="24x7">24x7</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Descrição</Label>
                      <Textarea value={editForm.descricao} onChange={e => setEditForm(p => ({ ...p, descricao: e.target.value }))} rows={6} className="mt-1" />
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-5">
                    <Card className="shadow-none">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Descrição</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm leading-relaxed">{demanda.descricao || 'Sem descrição informada.'}</p>
                      </CardContent>
                    </Card>
                    <Card className="shadow-none">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informações</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-y-3 text-sm">
                          <span className="text-muted-foreground">Projeto</span>
                          <span className="font-medium text-right">{demanda.projeto}</span>
                          <span className="text-muted-foreground">Tipo</span>
                          <span className="font-medium text-right capitalize">{demanda.tipo}</span>
                          <span className="text-muted-foreground">SLA</span>
                          <span className="font-medium text-right">{demanda.sla === '24x7' ? '24x7' : 'Padrão'}</span>
                          <span className="text-muted-foreground">Criada em</span>
                          <span className="font-medium text-right">{new Date(demanda.created_at).toLocaleDateString('pt-BR')}</span>
                          <span className="text-muted-foreground">Atualizada em</span>
                          <span className="font-medium text-right">{new Date(demanda.updated_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Responsáveis resumo */}
                    {responsaveis.length > 0 && (
                      <Card className="md:col-span-2 shadow-none">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Equipe Vinculada</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {responsaveis.map(r => (
                              <div key={r.id} className="flex items-center gap-2 bg-muted/50 rounded-full pl-1 pr-3 py-1">
                                <div className="h-6 w-6 rounded-full bg-info/10 text-info flex items-center justify-center font-bold text-[10px]">
                                  {(r.profile?.display_name || '?')[0].toUpperCase()}
                                </div>
                                <span className="text-xs font-medium">{r.profile?.display_name}</span>
                                <Badge variant="secondary" className="text-[10px] capitalize">{r.papel}</Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* HISTÓRICO - Timeline vertical */}
              <TabsContent value="historico" className="mt-5">
                {tLoading && <p className="text-sm text-muted-foreground py-4">Carregando...</p>}
                {!tLoading && transitions.length === 0 && <p className="text-sm text-muted-foreground py-4">Nenhuma transição registrada.</p>}
                {transitions.length > 0 && (
                  <div className="relative pl-8 space-y-0">
                    {/* Vertical line */}
                    <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-border" />
                    {transitions.map((t, idx) => {
                      const isFirst = idx === 0;
                      return (
                        <div key={t.id} className="relative pb-6 last:pb-0">
                          {/* Dot */}
                          <div className={`absolute -left-8 top-0.5 flex items-center justify-center h-[14px] w-[14px] rounded-full border-2 ${
                            isFirst ? 'bg-info border-info' : 'bg-card border-muted-foreground/30'
                          }`}>
                            {isFirst && <div className="h-1.5 w-1.5 rounded-full bg-info-foreground" />}
                          </div>
                          <div className={`rounded-lg border p-3 transition-colors ${isFirst ? 'bg-info/5 border-info/20' : 'bg-card'}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                {t.from_status && (
                                  <>
                                    <Badge variant="outline" className="text-[10px]">{SITUACAO_LABELS[t.from_status]}</Badge>
                                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                  </>
                                )}
                                <Badge className={`text-[10px] ${SITUACAO_COLORS[t.to_status] || 'bg-info/10 text-info border-info/20'}`}>
                                  {SITUACAO_LABELS[t.to_status] || t.to_status}
                                </Badge>
                              </div>
                              <time className="text-xs text-muted-foreground shrink-0">
                                {new Date(t.created_at).toLocaleString('pt-BR')}
                              </time>
                            </div>
                            {t.justificativa && (
                              <p className="text-sm text-muted-foreground mt-2 italic border-l-2 border-info/30 pl-3">
                                "{t.justificativa}"
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* HORAS / ATIVIDADES */}
              <TabsContent value="horas" className="mt-5 space-y-5">
                <div className="flex items-center justify-between">
                  <Badge className="bg-info/10 text-info border-info/20 text-sm px-3 py-1">Total Acumulado: {total}h</Badge>
                </div>

                <Card className="shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Lançar Horas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-3 flex-wrap">
                      <Input type="number" placeholder="Horas" value={hourForm.horas} onChange={e => setHourForm(p => ({ ...p, horas: e.target.value }))} className="w-24" />
                      <Select value={hourForm.fase} onValueChange={v => setHourForm(p => ({ ...p, fase: v }))}>
                        <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FASES.map(f => <SelectItem key={f} value={f}>{FASE_LABELS[f]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input placeholder="Descrição da atividade" value={hourForm.descricao} onChange={e => setHourForm(p => ({ ...p, descricao: e.target.value }))} className="flex-1 min-w-[200px]" />
                      <Button className="bg-info hover:bg-info/90 text-info-foreground" onClick={handleAddHour}><Plus className="h-4 w-4 mr-1" />Lançar</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Lançado por: <strong>{profile?.display_name || user?.email || 'Usuário'}</strong></p>
                  </CardContent>
                </Card>

                {hours.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Fase</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Descrição</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Lançado por</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">Horas</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {hours.map(h => (
                          <tr key={h.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="p-3">{new Date(h.created_at).toLocaleDateString('pt-BR')}</td>
                            <td className="p-3"><Badge variant="secondary" className="text-[11px] capitalize">{FASE_LABELS[h.fase] || h.fase}</Badge></td>
                            <td className="p-3 text-muted-foreground">{h.descricao || '-'}</td>
                            <td className="p-3 font-medium">{profilesMap.get(h.user_id) || '...'}</td>
                            <td className="p-3 text-right font-semibold">{h.horas}h</td>
                            <td className="p-3">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteHourId(h.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* RESPONSÁVEIS */}
              <TabsContent value="responsaveis" className="mt-5 space-y-5">
                <p className="text-sm text-muted-foreground">Vincule um ou mais responsáveis à demanda, com papel informativo.</p>

                <Card className="shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Adicionar Responsável</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar por nome..." value={searchQuery} onChange={e => handleSearch(e.target.value)} className="pl-9" />
                      </div>
                      <Select value={addPapel} onValueChange={setAddPapel}>
                        <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAPEIS_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {searchResults.length > 0 && (
                      <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                        {searchResults.map(r => (
                          <button key={r.user_id} className="w-full flex items-center justify-between p-3 text-sm hover:bg-muted/50 transition-colors" onClick={() => handleAddResp(r.user_id)}>
                            <div>
                              <span className="font-medium">{r.display_name}</span>
                              <span className="text-muted-foreground ml-2">{r.email}</span>
                            </div>
                            <UserPlus className="h-4 w-4 text-info" />
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {respLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
                {!respLoading && responsaveis.length === 0 && <p className="text-sm text-muted-foreground">Nenhum responsável vinculado.</p>}
                {responsaveis.length > 0 && (
                  <div className="border rounded-lg divide-y">
                    {responsaveis.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-info/10 text-info flex items-center justify-center font-bold text-sm">
                            {(r.profile?.display_name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{r.profile?.display_name || 'Usuário'}</p>
                            <p className="text-xs text-muted-foreground">{r.profile?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className="bg-info/10 text-info border-info/20 text-xs capitalize">{r.papel}</Badge>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteRespId(r.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Aceite Final */}
            {demanda.situacao === 'producao' && !demanda.aceite_data && (
              <Card className="border-info/30 bg-info/5 mt-6 shadow-none">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Aceite Final</p>
                    <p className="text-xs text-muted-foreground">Registre o aceite para encerrar a demanda.</p>
                  </div>
                  <Button className="bg-info hover:bg-info/90 text-info-foreground" onClick={() => onMoveTo(demanda, 'aceite_final')}>Registrar Aceite</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog open={showJustModal} onOpenChange={setShowJustModal} title="Justificativa obrigatória" description="Informe a justificativa para esta mudança de status." confirmLabel="Confirmar" variant="default" onConfirm={confirmMove} />
      <ConfirmDialog open={!!deleteHourId} onOpenChange={(o) => !o && setDeleteHourId(null)} onConfirm={() => { if (deleteHourId) { removeHour(deleteHourId); setDeleteHourId(null); } }} />
      <ConfirmDialog open={!!deleteRespId} onOpenChange={(o) => !o && setDeleteRespId(null)} title="Remover responsável" description="Deseja realmente remover este responsável da demanda?" onConfirm={handleRemoveResp} />
    </>
  );
}
