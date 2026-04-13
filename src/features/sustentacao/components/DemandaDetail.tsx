import { useState, useEffect, useCallback } from "react";
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
  FLOW_PRINCIPAL,
  REQUIRES_JUSTIFICATIVA,
  TERMINAL_STATUSES,
  isDemandaIniciada,
} from "../types/demanda";
import { getTipoLabel, getSLAStatusDemanda, TIPOS_DEMANDA_IMR } from "../types/imr";
import { useTransitions, useHours } from "../hooks/useDemandas";
import { useProjetos } from "../hooks/useProjetos";
import * as respSvc from "../services/responsaveis.service";
import * as evidSvc from "../services/evidencias.service";
import * as eventosSvc from "../services/eventos.service";
import type { DemandaResponsavel } from "../services/responsaveis.service";
import type { DemandaEvidencia } from "../services/evidencias.service";

// ─────────────────────────────────────────────────────────────────────────────
// FLUXO DE TRABALHO — 11 etapas
// ─────────────────────────────────────────────────────────────────────────────

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
  cancelada: "Cancelada",
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
  cancelada: "bg-gray-200 text-gray-700 border-gray-300",
};

// Stepper visual — apenas fluxo principal (sem desvios)
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
  fila_atendimento: "Fila",
  planejamento_elaboracao: "Elaboração",
  planejamento_ag_aprovacao: "Ag. Aprov.",
  planejamento_aprovada: "Aprovada",
  em_execucao: "Execução",
  hom_ag_homologacao: "Ag. Homol.",
  hom_homologada: "Homologada",
  fila_producao: "Fila Prod.",
  ag_aceite_final: "Aceite Final",
};

const TERMINAL_WORKFLOW = ["ag_aceite_final", "cancelada"];
const SUSPENSAO_STATUSES = ["bloqueada"];
const NEEDS_JUST = ["rejeitada", "cancelada", "planejamento_ag_aprovacao"];

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

const PAPEIS_OPTIONS = [
  { value: "analista", label: "Analista" },
  { value: "arquiteto", label: "Arquiteto" },
  { value: "desenvolvedor", label: "Desenvolvedor" },
  { value: "testador", label: "Testador" },
  { value: "gestor", label: "Gestor" },
];

const SLA_COR_CLASS: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  orange: "bg-orange-100 text-orange-800 border-orange-200",
  red: "bg-destructive/10 text-destructive border-destructive/30",
  muted: "bg-muted text-muted-foreground",
};

function getNextStatuses(situacao: string): string[] {
  if (TERMINAL_WORKFLOW.includes(situacao)) return [];
  if (situacao === "bloqueada") return [];
  if (situacao === "rejeitada") return ["em_execucao"];
  const flow = Array.from(FLOW_PRINCIPAL);
  const idx = flow.indexOf(situacao as any);
  if (idx < 0) return [];
  const next = flow.slice(idx + 1);
  if (situacao === "hom_homologada") return [...next, "rejeitada"];
  return next;
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

interface Props {
  demanda: Demanda | null;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<Demanda>) => Promise<void>;
  onMoveTo: (demanda: Demanda, newStatus: string, justificativa?: string) => Promise<boolean>;
  initialTab?: string;
  pendingMoveTarget?: string;
}
