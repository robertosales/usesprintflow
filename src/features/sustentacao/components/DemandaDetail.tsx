import { useState, useEffect, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  History,
  FileText,
  Plus,
  Trash2,
  Users,
  Edit,
  Save,
  X,
  Search,
  UserPlus,
  ArrowLeft,
  Check,
  Circle,
  ChevronRight,
  MoveRight,
  ShieldCheck,
  Upload,
  Link2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { JustificativaDialog } from "./JustificativaDialog";
import { EncerramentoDialog } from "./EncerramentoDialog";
import { SuspensaoDialog } from "./SuspensaoDialog";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { Demanda } from "../types/demanda";
import {
  SITUACAO_LABELS,
  SITUACAO_COLORS,
  FASES,
  FASE_LABELS,
  ALL_SITUACOES,
  REQUIRES_JUSTIFICATIVA,
  TERMINAL_STATUSES,
  isDemandaIniciada,
} from "../types/demanda";
import { getTipoLabel, getSLAStatusDemanda, TIPOS_DEMANDA_IMR } from "../types/imr";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Settings2 } from "lucide-react";
import type { DemandaResponsavel } from "../services/responsaveis.service";
import type { DemandaEvidencia } from "../services/evidencias.service";

interface Props {
  demanda: Demanda | null;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<Demanda>) => Promise<void>;
  onMoveTo: (demanda: Demanda, newStatus: string, justificativa?: string) => Promise<boolean>;
  initialTab?: string;
  pendingMoveTarget?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// NOVO FLUXO DE TRABALHO — 11 etapas
// ─────────────────────────────────────────────────────────────────────────────
export const WORKFLOW_STEPS = [
  "fila_atendimento",
  "planejamento_elaboracao",
  "planejamento_ag_aprovacao",
  "planejamento_aprovada",
  "em_execucao",
  "bloqueada",
  "hom_ag_homologacao",
  "hom_homologada",
  "rejeitada",
  "fila_producao",
  "ag_aceite_final",
] as const;

export type WorkflowStep = (typeof WORKFLOW_STEPS)[number];

export const WORKFLOW_LABELS: Record<string, string> = {
  fila_atendimento: "Fila de Atendimento",
  planejamento_elaboracao: "Planejamento: Em Elaboração",
  planejamento_ag_aprovacao: "Planejamento: Ag. Aprovação",
  planejamento_aprovada: "Planejamento: Aprovada p/ Exec",
  em_execucao: "Em Execução",
  bloqueada: "Bloqueada",
  hom_ag_homologacao: "Hom: Ag. Homologação",
  hom_homologada: "Hom: Homologada",
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

// Etapas exibidas no stepper visual (excluindo as de desvio: bloqueada/rejeitada)
const STEPPER_STEPS = [
  "fila_atendimento",
  "planejamento_elaboracao",
  "planejamento_ag_aprovacao",
  "planejamento_aprovada",
  "em_execucao",
  "hom_ag_homologacao",
  "hom_homologada",
  "fila_producao",
  "ag_aceite_final",
];

const STEPPER_LABELS: Record<string, string> = {
  fila_atendimento: "Fila Atend.",
  planejamento_elaboracao: "Elaboração",
  planejamento_ag_aprovacao: "Ag. Aprov.",
  planejamento_aprovada: "Aprovada",
  em_execucao: "Execução",
  hom_ag_homologacao: "Ag. Homol.",
  hom_homologada: "Homologada",
  fila_producao: "Fila Prod.",
  ag_aceite_final: "Aceite Final",
};

// Fluxo principal de avanço (sem desvios)
const FLOW_PRINCIPAL = [
  "fila_atendimento",
  "planejamento_elaboracao",
  "planejamento_ag_aprovacao",
  "planejamento_aprovada",
  "em_execucao",
  "hom_ag_homologacao",
  "hom_homologada",
  "fila_producao",
  "ag_aceite_final",
];

// Status considerados terminais (não permitem mais movimentação)
const TERMINAL_WORKFLOW = ["ag_aceite_final", "rejeitada", "cancelada"];

// Status que ativam modal de suspensão/bloqueio
const SUSPENSAO_STATUSES = ["bloqueada"];

// Status que exigem justificativa obrigatória
const REQUIRES_JUSTIFICATIVA_WORKFLOW = ["rejeitada", "cancelada", "planejamento_ag_aprovacao"];

// ─────────────────────────────────────────────────────────────────────────────

const PAPEIS_OPTIONS = [
  { value: "analista", label: "Analista" },
  { value: "arquiteto", label: "Arquiteto" },
  { value: "desenvolvedor", label: "Desenvolvedor" },
  { value: "testador", label: "Testador" },
  { value: "gestor", label: "Gestor" },
];

const EVIDENCIA_FASES = [
  "fila_atendimento",
  "planejamento_elaboracao",
  "planejamento_ag_aprovacao",
  "planejamento_aprovada",
  "em_execucao",
  "hom_ag_homologacao",
  "hom_homologada",
  "fila_producao",
  "ag_aceite_final",
];

const EVIDENCIA_FASE_LABELS: Record<string, string> = {
  fila_atendimento: "Fila de Atendimento",
  planejamento_elaboracao: "Elaboração",
  planejamento_ag_aprovacao: "Ag. Aprovação",
  planejamento_aprovada: "Aprovada p/ Exec",
  em_execucao: "Em Execução",
  hom_ag_homologacao: "Ag. Homologação",
  hom_homologada: "Homologada",
  fila_producao: "Fila Produção",
  ag_aceite_final: "Aceite Final",
};

function getNextStatuses(situacao: string): string[] {
  // Desvios especiais disponíveis em qualquer etapa (exceto terminais)
  if (TERMINAL_WORKFLOW.includes(situacao)) return [];

  const idx = FLOW_PRINCIPAL.indexOf(situacao);

  // Se bloqueada: única opção é retornar (tratado separadamente via handleUnblock)
  if (situacao === "bloqueada") return [];

  // Se rejeitada mas não terminal: voltar para execução
  if (situacao === "rejeitada") return ["em_execucao"];

  if (idx < 0) return [];

  // Próxima etapa do fluxo principal
  const next = FLOW_PRINCIPAL.slice(idx + 1);

  // Em homologada, pode rejeitar (volta ao fluxo via rejeitada)
  if (situacao === "hom_homologada") {
    return [...next, "rejeitada"];
  }

  return next;
}

type DemandaExt = Demanda & {
  demandante?: string | null;
  ordem_servico?: string | null;
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
  const {
    hours,
    total,
    add: addHour,
    remove: removeHour,
    loading: hLoading,
    reload: reloadHours,
  } = useHours(demanda?.id ?? null);
  const { projetos } = useProjetos();

  // ── FIX: sincroniza a aba ativa sempre que initialTab ou demanda mudar ──
  // useState só executa o initializer uma vez; se initialTab chegar depois
  // (ex.: "horas" vindo do botão Nova Atividade), o useEffect garante a
  // atualização correta sem precisar remontar o componente.
  const [activeTab, setActiveTab] = useState(initialTab || "detalhes");

  useEffect(() => {
    setActiveTab(initialTab || "detalhes");
  }, [initialTab, demanda?.id]);

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
  const [justificativa, setJustificativa] = useState("");
  const [showJustModal, setShowJustModal] = useState(false);
  const [showSuspensaoModal, setShowSuspensaoModal] = useState(false);
  const [showEncerramentoModal, setShowEncerramentoModal] = useState(false);

  const todayISO = () => new Date().toISOString().slice(0, 10);
  const [hourForm, setHourForm] = useState({
    horas: "",
    fase: "execucao",
    descricao: "",
    data: todayISO(),
  });
  const [showFasesManager, setShowFasesManager] = useState(false);
  const [newFaseLabel, setNewFaseLabel] = useState("");
  const [deleteHourId, setDeleteHourId] = useState<string | null>(null);

  const [responsaveis, setResponsaveis] = useState<DemandaResponsavel[]>([]);
  const [respLoading, setRespLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ user_id: string; display_name: string; email: string }[]>([]);
  const [addPapel, setAddPapel] = useState("desenvolvedor");
  const [deleteRespId, setDeleteRespId] = useState<string | null>(null);

  const [profilesMap, setProfilesMap] = useState<Map<string, string>>(new Map());
  const [demandanteProfile, setDemandanteProfile] = useState<string | null>(null);

  const [evidencias, setEvidencias] = useState<DemandaEvidencia[]>([]);
  const [evidLoading, setEvidLoading] = useState(false);
  const [evidForm, setEvidForm] = useState({
    fase: demanda?.situacao || "em_execucao",
    tipo: "arquivo",
    titulo: "",
    descricao: "",
    url_externa: "",
  });
  const [evidFile, setEvidFile] = useState<File | null>(null);
  const [deleteEvidId, setDeleteEvidId] = useState<string | null>(null);

  const loadEvidencias = useCallback(async () => {
    if (!demanda?.id) return;
    setEvidLoading(true);
    try {
      setEvidencias(await evidSvc.fetchEvidencias(demanda.id));
    } catch {}
    setEvidLoading(false);
  }, [demanda?.id]);

  const loadResponsaveis = useCallback(async () => {
    if (!demanda?.id) return;
    setRespLoading(true);
    try {
      setResponsaveis(await respSvc.fetchResponsaveis(demanda.id));
    } catch {}
    setRespLoading(false);
  }, [demanda?.id]);

  useEffect(() => {
    if (demanda?.id) {
      loadResponsaveis();
      loadEvidencias();
      setEditing(false);
      setEvidForm((prev) => ({ ...prev, fase: demanda.situacao || "em_execucao" }));
    }
  }, [demanda?.id, demanda?.situacao, loadResponsaveis, loadEvidencias]);

  useEffect(() => {
    if (!demanda?.demandante) {
      setDemandanteProfile(null);
      return;
    }
    fetchProfileDisplayNameById(demanda.demandante!).then(setDemandanteProfile);
  }, [demanda?.demandante]);

  useEffect(() => {
    if (hours.length === 0) return;
    const ids = [...new Set(hours.map((h) => h.user_id))];
    const missing = ids.filter((id) => !profilesMap.has(id));
    if (missing.length === 0) return;
    fetchProfilesByUserIds(missing).then((map) => {
      if (map.size === 0) return;
      setProfilesMap((prev) => {
        const next = new Map(prev);
        map.forEach((p, id) => next.set(id, p.display_name));
        return next;
      });
    });
  }, [hours]);

  if (!demanda) return null;

  const isCancelada = demanda.situacao === "cancelada";
  const isRejeitada = demanda.situacao === "rejeitada";
  const isTerminal = TERMINAL_WORKFLOW.includes(demanda.situacao);
  const isBloqueada = demanda.situacao === "bloqueada";

  const currentStepIdx = STEPPER_STEPS.indexOf(demanda.situacao);
  const allowedNextStatuses = isTerminal ? [] : getNextStatuses(demanda.situacao);

  const canBlock = !isTerminal && !isBloqueada && demanda.situacao !== "ag_aceite_final";
  const canCancel = !isTerminal && demanda.situacao !== "ag_aceite_final";
  const canReject = demanda.situacao === "hom_homologada";

  const slaStatus = getSLAStatusDemanda(demanda.created_at, demanda.prazo_solucao || null, demanda.situacao);

  const currentFaseIdx = EVIDENCIA_FASES.indexOf(demanda.situacao);
  const allowedEvidFases = currentFaseIdx >= 0 ? EVIDENCIA_FASES.slice(0, currentFaseIdx + 1) : EVIDENCIA_FASES;

  // Evidência obrigatória ao avançar para "planejamento_ag_aprovacao"
  const getMissingEvidencias = (targetStatus: string): string[] => {
    if (targetStatus !== "planejamento_ag_aprovacao") return [];
    const faseEvidencias = evidencias.filter((e) => e.fase === demanda.situacao);
    if (faseEvidencias.length > 0) return [];
    return ["É obrigatório anexar ao menos uma evidência antes de avançar para Ag. Aprovação."];
  };

  const startEdit = () => {
    setEditForm({
      projeto: demanda.projeto,
      tipo: demanda.tipo,
      descricao: demanda.descricao || "",
      sla: demanda.sla,
      rhm: demanda.rhm,
      tipo_defeito: demanda.tipo_defe