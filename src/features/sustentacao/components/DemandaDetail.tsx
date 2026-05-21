import { useState, useEffect, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Clock,
  History,
  FileText,
  Users,
  ShieldCheck,
  Plus,
  Trash2,
} from "lucide-react";

import { JustificativaDialog } from "./JustificativaDialog";
import { EncerramentoDialog } from "./EncerramentoDialog";
import { SuspensaoDialog } from "./SuspensaoDialog";
import { NovaAtividadeDialog } from "./NovaAtividadeDialog";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { Demanda, DemandaHour } from "../types/demanda";
import {
  SITUACAO_LABELS,
  SITUACAO_COLORS,
  FASE_LABELS,
} from "../types/demanda";
import { getSLAStatusDemanda } from "../types/imr";
import { useTransitions, useHours } from "../hooks/useDemandas";
import { useProjetos } from "../hooks/useProjetos";
import { useFases } from "../hooks/useFases";
import * as respSvc from "../services/responsaveis.service";
import * as evidSvc from "../services/evidencias.service";
import * as eventosSvc from "../services/eventos.service";
import {
  fetchProfileDisplayNameById,
  fetchProfilesByUserIds,
} from "../services/profiles.service";

import { DemandaHeader } from "./demanda-detail/DemandaHeader";
import { DemandaStepper } from "./demanda-detail/DemandaStepper";
import { DemandaMovePanel } from "./demanda-detail/DemandaMovePanel";
import { DetailsTab } from "./demanda-detail/tabs/DetailsTab";
import { HistoryTab } from "./demanda-detail/tabs/HistoryTab";
import { ActivitiesTab } from "./demanda-detail/tabs/ActivitiesTab";
import { ResponsiblesTab } from "./demanda-detail/tabs/ResponsiblesTab";
import { EvidenceTab } from "./demanda-detail/tabs/EvidenceTab";

import type { DemandaResponsavel } from "../services/responsaveis.service";
import type { DemandaEvidencia } from "../services/evidencias.service";

export const WORKFLOW_LABELS: Record<string, string> = {
  fila_atendimento: "Fila de Atendimento",
  planejamento_elaboracao: "Planejamento: Em Elaboração",
  planejamento_ag_aprovacao: "Planejamento: Ag. Aprovação",
  planejamento_aprovada: "Planejamento: Aprovada p/ Exec",
  em_execucao: "Em Execução",
  bloqueada: "Bloqueada",
  hom_ag_homologacao: "Hom: Ag. Homologação",
  hom_homologada: "Homologada",
  rejeitada: "Rejeitada",
  fila_producao: "Fila para Produção (Infra)",
  ag_aceite_final: "Ag. Aceite Final",
};

export const WORKFLOW_COLORS: Record<string, string> = {
  fila_atendimento: "bg-slate-100 text-slate-700 border-slate-300",
  planejamento_elaboracao: "bg-blue-100 text-blue-700 border-blue-300",
  planejamento_ag_aprovacao: "bg-indigo-100 text-indigo-700 border-indigo-300",
  planejamento_aprovada: "bg-violet-100 text-violet-700 border-violet-300",
  em_execucao: "bg-amber-100 text-amber-700 border-amber-300",
  bloqueada: "bg-red-100 text-red-700 border-red-300",
  hom_ag_homologacao: "bg-cyan-100 text-cyan-700 border-cyan-300",
  hom_homologada: "bg-teal-100 text-teal-700 border-teal-300",
  rejeitada: "bg-rose-100 text-rose-800 border-rose-300",
  fila_producao: "bg-orange-100 text-orange-700 border-orange-300",
  ag_aceite_final: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

const STEPPER_STEPS = ["fila_atendimento", "planejamento_elaboracao", "planejamento_ag_aprovacao", "planejamento_aprovada", "em_execucao", "hom_ag_homologacao", "hom_homologada", "fila_producao", "ag_aceite_final"];
const STEPPER_LABELS: Record<string, string> = { fila_atendimento: "Fila Atend.", planejamento_elaboracao: "Elaboração", planejamento_ag_aprovacao: "Ag. Aprov.", planejamento_aprovada: "Aprovada", em_execucao: "Execução", hom_ag_homologacao: "Ag. Homol.", hom_homologada: "Homologada", fila_producao: "Fila Prod.", ag_aceite_final: "Aceite Final" };
const FLOW_PRINCIPAL = ["fila_atendimento", "planejamento_elaboracao", "planejamento_ag_aprovacao", "planejamento_aprovada", "em_execucao", "hom_ag_homologacao", "hom_homologada", "fila_producao", "ag_aceite_final"];
const TERMINAL_WORKFLOW = ["ag_aceite_final", "rejeitada", "cancelada"];
const SUSPENSAO_STATUSES = ["bloqueada"];
const REQUIRES_JUSTIFICATIVA_WORKFLOW = ["rejeitada", "cancelada", "planejamento_ag_aprovacao"];
const EVIDENCIA_FASES = ["fila_atendimento", "planejamento_elaboracao", "planejamento_ag_aprovacao", "planejamento_aprovada", "em_execucao", "hom_ag_homologacao", "hom_homologada", "fila_producao", "ag_aceite_final"];
const EVIDENCIA_FASE_LABELS: Record<string, string> = { fila_atendimento: "Fila de Atendimento", planejamento_elaboracao: "Elaboração", planejamento_ag_aprovacao: "Ag. Aprovação", planejamento_aprovada: "Aprovada p/ Exec", em_execucao: "Em Execução", hom_ag_homologacao: "Ag. Homologação", hom_homologada: "Homologada", fila_producao: "Fila Produção", ag_aceite_final: "Aceite Final" };

interface Props {
  demanda: Demanda | null;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<Demanda>) => Promise<void>;
  onMoveTo: (demanda: Demanda, newStatus: string, justificativa?: string) => Promise<boolean>;
  initialTab?: string;
  pendingMoveTarget?: string;
}

type DemandaExt = Demanda & {
  demandante?: string | null;
  tipo_defeito?: string | null;
  originada_diagnostico?: boolean;
  prazo_inicio_atendimento?: string | null;
  prazo_solucao?: string | null;
  data_previsao_encerramento?: string | null;
  nota_satisfacao?: number | null;
  cobertura_testes?: number | null;
  artefatos_atualizados?: string | null;
  hard_code_identificado?: boolean | null;
  reincidencia_defeito?: boolean | null;
  contador_rejeicoes?: number;
};

export function DemandaDetail({
  demanda: rawDemanda,
  onBack,
  onUpdate,
  onMoveTo,
  initialTab,
  pendingMoveTarget,
}: Props) {
  const demanda = rawDemanda as DemandaExt | null;
  const { user, profile, isAdmin } = useAuth();
  const { fases, create: createFase, remove: removeFase } = useFases();
  const fasesMap = useMemo(() => {
    const m: Record<string, string> = { ...FASE_LABELS };
    fases.forEach((f) => { m[f.key] = f.label; });
    return m;
  }, [fases]);
  const { transitions, loading: tLoading, reload: reloadTransitions } = useTransitions(demanda?.id ?? null);
  const { hours, total, add: addHour, update: updateHour, remove: removeHour, loading: hLoading, reload: reloadHours } = useHours(demanda?.id ?? null);
  const { projetos } = useProjetos();

  const [activeTab, setActiveTab] = useState(initialTab || "detalhes");
  const [pendingTarget, setPendingTarget] = useState<string | undefined>(pendingMoveTarget);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    projeto: "",
    tipo: "",
    descricao: "",
    sla: "",
    rhm: "",
    tipo_defeito: "" as string | null,
    originada_diagnostico: false,
    data_previsao_encerramento: "" as string | null,
    demandante: "" as string | null,
  });

  const [newStatus, setNewStatus] = useState("");
  const [showJustModal, setShowJustModal] = useState(false);
  const [showSuspensaoModal, setShowSuspensaoModal] = useState(false);
  const [showEncerramentoModal, setShowEncerramentoModal] = useState(false);
  const [responsaveis, setResponsaveis] = useState<DemandaResponsavel[]>([]);
  const [evidencias, setEvidencias] = useState<DemandaEvidencia[]>([]);
  const [demandanteProfile, setDemandanteProfile] = useState<string | null>(null);
  const [profilesMap, setProfilesMap] = useState<Map<string, string>>(new Map());

  const [respLoading, setRespLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [addPapel, setAddPapel] = useState("desenvolvedor");
  const [deleteRespId, setDeleteRespId] = useState<string | null>(null);

  const [evidLoading, setEvidLoading] = useState(false);
  const [evidForm, setEvidForm] = useState({ fase: demanda?.situacao || "fila_atendimento", tipo: "arquivo", titulo: "", descricao: "", url_externa: "" });
  const [evidFile, setEvidFile] = useState<File | null>(null);
  const [deleteEvidId, setDeleteEvidId] = useState<string | null>(null);

  const [showFasesManager, setShowFasesManager] = useState(false);
  const [newFaseLabel, setNewFaseLabel] = useState("");
  const [deleteHourId, setDeleteHourId] = useState<string | null>(null);
  const [editHour, setEditHour] = useState<DemandaHour | null>(null);
  const [showEditHourDialog, setShowEditHourDialog] = useState(false);

  const loadEvidencias = useCallback(async () => {
    if (!demanda?.id) return;
    setEvidLoading(true);
    try { setEvidencias(await evidSvc.fetchEvidencias(demanda.id)); } catch {}
    setEvidLoading(false);
  }, [demanda?.id]);

  const loadResponsaveis = useCallback(async () => {
    if (!demanda?.id) return;
    setRespLoading(true);
    try { setResponsaveis(await respSvc.fetchResponsaveis(demanda.id)); } catch {}
    setRespLoading(false);
  }, [demanda?.id]);

  useEffect(() => {
    if (demanda?.id) {
      loadResponsaveis();
      loadEvidencias();
      setEditing(false);
      setEvidForm(p => ({ ...p, fase: demanda.situacao }));
    }
  }, [demanda?.id, demanda?.situacao, loadResponsaveis, loadEvidencias]);

  useEffect(() => {
    if (!demanda?.demandante) { setDemandanteProfile(null); return; }
    fetchProfileDisplayNameById(demanda.demandante!).then(setDemandanteProfile);
  }, [demanda?.demandante]);

  useEffect(() => {
    if (hours.length === 0) return;
    const ids = [...new Set(hours.map((h) => h.user_id))];
    const missing = ids.filter((id) => !profilesMap.has(id));
    if (missing.length === 0) return;
    fetchProfilesByUserIds(missing).then((map) => {
      setProfilesMap((prev) => {
        const next = new Map(prev);
        map.forEach((p, id) => next.set(id, p.display_name));
        return next;
      });
    });
  }, [hours]);

  if (!demanda) return null;

  const isTerminal = TERMINAL_WORKFLOW.includes(demanda.situacao);
  const isBloqueada = demanda.situacao === "bloqueada";
  const isRejeitada = demanda.situacao === "rejeitada";
  const currentStepIdx = STEPPER_STEPS.indexOf(demanda.situacao);
  const slaStatus = getSLAStatusDemanda(demanda.created_at, demanda.prazo_solucao || null, demanda.situacao);

  const startEdit = () => {
    setEditForm({ projeto: demanda.projeto, tipo: demanda.tipo, descricao: demanda.descricao || "", sla: demanda.sla, rhm: demanda.rhm, tipo_defeito: demanda.tipo_defeito || null, originada_diagnostico: !!demanda.originada_diagnostico, data_previsao_encerramento: demanda.data_previsao_encerramento || null, demandante: demanda.demandante || null });
    setEditing(true);
  };

  const saveEdit = async () => {
    try { await onUpdate(demanda.id, { ...editForm } as any); setEditing(false); } catch { toast.error("Erro ao salvar alterações"); }
  };

  const refreshAllData = async () => { await Promise.all([loadResponsaveis(), loadEvidencias(), reloadTransitions(), reloadHours()]); };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const results = await respSvc.searchProfiles(q);
      const existing = new Set(responsaveis.map((r) => r.user_id));
      setSearchResults(results.filter((r) => !existing.has(r.user_id)));
    } catch {}
  };

  const handleAddResp = async (userId: string) => {
    try { await respSvc.addResponsavel(demanda.id, userId, addPapel); toast.success("Responsável adicionado"); setSearchQuery(""); setSearchResults([]); await loadResponsaveis(); } catch { toast.error("Erro ao adicionar"); }
  };

  const handleRemoveResp = async () => {
    if (!deleteRespId) return;
    try { await respSvc.removeResponsavel(deleteRespId); toast.success("Removido"); setDeleteRespId(null); await loadResponsaveis(); } catch { toast.error("Erro ao remover"); }
  };

  const handleAddEvidencia = async () => {
    if (!evidForm.titulo.trim() || !user) return;
    try {
      let path, name, mime;
      if (evidForm.tipo === "arquivo" && evidFile) { const r = await evidSvc.uploadEvidenciaFile(evidFile, demanda.id); path = r.path; name = evidFile.name; mime = evidFile.type; }
      await evidSvc.addEvidencia({ demanda_id: demanda.id, fase: evidForm.fase, tipo: evidForm.tipo, titulo: evidForm.titulo, descricao: evidForm.descricao || undefined, file_path: path, file_name: name, mime_type: mime, url_externa: evidForm.tipo === "link" ? evidForm.url_externa : undefined, user_id: user.id });
      toast.success("Adicionada"); setEvidForm({ fase: demanda.situacao, tipo: "arquivo", titulo: "", descricao: "", url_externa: "" }); setEvidFile(null); await loadEvidencias();
    } catch { toast.error("Erro ao adicionar"); }
  };

  const handleRemoveEvidencia = async () => {
    if (!deleteEvidId) return;
    try { await evidSvc.removeEvidencia(deleteEvidId); toast.success("Removida"); setDeleteEvidId(null); await loadEvidencias(); } catch { toast.error("Erro ao remover"); }
  };

  const confirmEncerramento = async (data: any) => {
    if (!user) return;
    await onUpdate(demanda.id, { ...data, aceite_data: new Date().toISOString(), aceite_responsavel: user.id } as any);
    const ok = await onMoveTo(demanda, "ag_aceite_final");
    if (ok) { setShowEncerramentoModal(false); await refreshAllData(); }
  };

  const resolveLabel = (s: string) => WORKFLOW_LABELS[s] || SITUACAO_LABELS[s] || s;

  return (
    <div className="w-full max-w-[1100px] mx-auto py-6 px-4 md:px-0 space-y-6 animate-in fade-in duration-300">
      <DemandaHeader demanda={demanda} slaStatus={slaStatus} isBloqueada={isBloqueada} isRejeitada={isRejeitada} isTerminal={isTerminal} editing={editing} onBack={onBack} onEdit={startEdit} onCancel={() => setEditing(false)} onSave={saveEdit} />

      <div className="bg-card rounded-xl border shadow-sm">
        <DemandaStepper situacao={demanda.situacao} currentStepIdx={currentStepIdx} stepperSteps={STEPPER_STEPS} stepperLabels={STEPPER_LABELS} isBloqueada={isBloqueada} isRejeitada={isRejeitada} />

        <DemandaMovePanel demanda={demanda} isTerminal={isTerminal} isBloqueada={isBloqueada} isRejeitada={isRejeitada} onMoveTo={onMoveTo} onUpdate={onUpdate} refreshAllData={refreshAllData} setNewStatus={setNewStatus} setPendingTarget={setPendingTarget} setActiveTab={setActiveTab} setShowEncerramentoModal={setShowEncerramentoModal} setShowSuspensaoModal={setShowSuspensaoModal} setShowJustModal={setShowJustModal} evidencias={evidencias} workflowSteps={FLOW_PRINCIPAL} requiresJustificativaSteps={REQUIRES_JUSTIFICATIVA_WORKFLOW} suspensaoStatuses={SUSPENSAO_STATUSES} />

        <div className="px-6 py-5">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
              <TabsTrigger value="detalhes" className="gap-1.5 text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm"><FileText className="h-4 w-4" />Detalhes</TabsTrigger>
              <TabsTrigger value="historico" className="gap-1.5 text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm"><History className="h-4 w-4" />Histórico</TabsTrigger>
              <TabsTrigger value="horas" disabled={isTerminal && demanda.situacao === "cancelada"} className="gap-1.5 text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm"><Clock className="h-4 w-4" />Atividades <Badge variant="secondary" className="ml-1 text-[10px] h-5">{total}h</Badge></TabsTrigger>
              <TabsTrigger value="responsaveis" className="gap-1.5 text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm"><Users className="h-4 w-4" />Responsáveis <Badge variant="secondary" className="ml-1 text-[10px] h-5">{responsaveis.length}</Badge></TabsTrigger>
              <TabsTrigger value="evidencias" className="gap-1.5 text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm"><ShieldCheck className="h-4 w-4" />Evidências <Badge variant="secondary" className="ml-1 text-[10px] h-5">{evidencias.length}</Badge></TabsTrigger>
            </TabsList>

            <TabsContent value="detalhes"><DetailsTab demanda={demanda} editing={editing} editForm={editForm} setEditForm={setEditForm} projetos={projetos} demandanteProfile={demandanteProfile} slaStatus={slaStatus} responsaveis={responsaveis} /></TabsContent>
            <TabsContent value="historico"><HistoryTab transitions={transitions} loading={tLoading} /></TabsContent>
            <TabsContent value="horas"><ActivitiesTab total={total} isAdmin={isAdmin ?? false} fases={fases} fasesMap={fasesMap} hours={hours} profilesMap={profilesMap} addHour={addHour} updateHour={updateHour} removeHour={removeHour} setShowFasesManager={setShowFasesManager} setShowEditHourDialog={setShowEditHourDialog} setEditHour={setEditHour} setDeleteHourId={(id) => setDeleteHourId(id)} profileName={profile?.display_name || user?.email || ""} /></TabsContent>
            <TabsContent value="responsaveis"><ResponsiblesTab searchQuery={searchQuery} setSearchQuery={setSearchQuery} handleSearch={handleSearch} addPapel={addPapel} setAddPapel={setAddPapel} papeisOptions={[{ value: "analista", label: "Analista" }, { value: "arquiteto", label: "Arquiteto" }, { value: "desenvolvedor", label: "Desenvolvedor" }, { value: "testador", label: "Testador" }, { value: "gestor", label: "Gestor" }]} searchResults={searchResults} handleAddResp={handleAddResp} respLoading={respLoading} responsaveis={responsaveis} setDeleteRespId={(id) => setDeleteRespId(id)} /></TabsContent>
            <TabsContent value="evidencias"><EvidenceTab pendingTarget={pendingTarget} resolveLabel={resolveLabel} hasEvidence={evidencias.filter(e => e.fase === demanda.situacao).length > 0} onMoveTo={async (s) => { const ok = await onMoveTo(demanda, s); if (ok) { setPendingTarget(undefined); await refreshAllData(); } }} evidForm={evidForm} setEvidForm={setEvidForm} allowedEvidFases={EVIDENCIA_FASES} evidenciaFaseLabels={EVIDENCIA_FASE_LABELS} setEvidFile={setEvidFile} handleAddEvidencia={handleAddEvidencia} evidenciaFases={EVIDENCIA_FASES} evidenciasByFase={EVIDENCIA_FASES.reduce((acc, f) => { acc[f] = evidencias.filter(e => e.fase === f); return acc; }, {} as any)} evidLoading={evidLoading} setDeleteEvidId={(id) => setDeleteEvidId(id)} evidFile={evidFile} /></TabsContent>
          </Tabs>
        </div>
      </div>

      <JustificativaDialog open={showJustModal} onClose={() => setShowJustModal(false)} onConfirm={async (j) => { const ok = await onMoveTo(demanda, newStatus, j); if (ok) { setShowJustModal(false); await refreshAllData(); } }} />
      <SuspensaoDialog open={showSuspensaoModal} onClose={() => { setShowSuspensaoModal(false); setNewStatus(""); }} onConfirm={async (j, p) => { await onUpdate(demanda.id, { data_previsao_encerramento: p } as any); const ok = await onMoveTo(demanda, "bloqueada", j); if (ok) { setShowSuspensaoModal(false); await refreshAllData(); } }} />
      <EncerramentoDialog open={showEncerramentoModal} onClose={() => { setShowEncerramentoModal(false); setNewStatus(""); }} onConfirm={confirmEncerramento} isCorretiva={["manutencao_corretiva", "corretiva"].includes(demanda.tipo)} />
      <NovaAtividadeDialog demanda={demanda as Demanda} open={showEditHourDialog} onClose={() => { setShowEditHourDialog(false); setEditHour(null); }} editHour={editHour} onSuccess={reloadHours} />
      <ConfirmDialog open={!!deleteHourId} title="Remover lançamento?" description="Esta ação não pode ser desfeita." onConfirm={async () => { if (deleteHourId) { await removeHour(deleteHourId); setDeleteHourId(null); await reloadHours(); } }} onOpenChange={() => setDeleteHourId(null)} />
      <ConfirmDialog open={!!deleteRespId} title="Remover responsável?" description="O responsável será desvinculado." onConfirm={handleRemoveResp} onOpenChange={() => setDeleteRespId(null)} />
      <ConfirmDialog open={!!deleteEvidId} title="Remover evidência?" description="Esta ação não pode ser desfeita." onConfirm={handleRemoveEvidencia} onOpenChange={() => setDeleteEvidId(null)} />
      <Dialog open={showFasesManager} onOpenChange={setShowFasesManager}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Gerenciar Fases</DialogTitle><DialogDescription>Cadastre as fases utilizadas no lançamento de horas.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="flex items-end gap-2"><div className="flex-1"><Label className="text-xs">Nova fase</Label><Input value={newFaseLabel} onChange={(e) => setNewFaseLabel(e.target.value)} placeholder="Ex.: Reunião" className="mt-1" /></div><Button size="sm" onClick={async () => { if (!newFaseLabel.trim()) return; try { await createFase(newFaseLabel.trim()); setNewFaseLabel(""); toast.success("Criada"); } catch { toast.error("Erro"); } }}>Adicionar</Button></div>
            <div className="rounded-lg border max-h-[300px] overflow-y-auto"><table className="w-full text-sm"><thead className="bg-muted/50 sticky top-0"><tr><th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Fase</th><th /></tr></thead><tbody className="divide-y divide-border">{fases.map((f) => (<tr key={f.id} className="hover:bg-muted/30"><td className="px-3 py-2 text-xs">{f.label}</td><td className="px-3 py-2 text-right"><Button variant="ghost" size="sm" onClick={async () => { try { await removeFase(f.id); toast.success("Removida"); } catch { toast.error("Erro"); } }}><Trash2 className="h-3.5 w-3.5" /></Button></td></tr>))}</tbody></table></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowFasesManager(false)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
