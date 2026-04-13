export type DemandaTipo = "corretiva" | "evolutiva";
export type DemandaSLA = "24x7" | "padrao" | "continuo";

// ─────────────────────────────────────────────────────────────────────────────
// FLUXO DE TRABALHO — 11 etapas
// ─────────────────────────────────────────────────────────────────────────────

/** Todas as situações possíveis no novo fluxo */
export const ALL_SITUACOES = [
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
  "cancelada",
] as const;

export type DemandaSituacao = (typeof ALL_SITUACOES)[number];

/** Fluxo principal de avanço (sem desvios) */
export const FLOW_PRINCIPAL: DemandaSituacao[] = [
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

/**
 * @deprecated Use ALL_SITUACOES / FLOW_PRINCIPAL — mantido apenas para
 * compatibilidade com código legado que ainda importe esses símbolos.
 */
export const SITUACOES_CORRETIVA = ALL_SITUACOES;
/** @deprecated */
export const SITUACOES_EVOLUTIVA_PREFIX = ALL_SITUACOES;

// ─────────────────────────────────────────────────────────────────────────────
// Labels e cores
// ─────────────────────────────────────────────────────────────────────────────

export const SITUACAO_LABELS: Record<string, string> = {
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

export const SITUACAO_COLORS: Record<string, string> = {
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

// ─────────────────────────────────────────────────────────────────────────────
// Colunas de Board (Kanban)
// ─────────────────────────────────────────────────────────────────────────────

/** Todas as colunas do board — igual para todos os tipos de demanda */
export const BOARD_COLUMNS = FLOW_PRINCIPAL;

/**
 * @deprecated Use BOARD_COLUMNS — mantido para compatibilidade.
 */
export const BOARD_COLUMNS_CORRETIVA = BOARD_COLUMNS;
/** @deprecated */
export const BOARD_COLUMNS_EVOLUTIVA = BOARD_COLUMNS;

// ─────────────────────────────────────────────────────────────────────────────
// Fases de lançamento de horas
// ─────────────────────────────────────────────────────────────────────────────

export const FASES = ["analise", "planejamento", "execucao", "homologacao", "implantacao"] as const;

export const FASE_LABELS: Record<string, string> = {
  analise: "Análise",
  planejamento: "Planejamento",
  execucao: "Execução",
  homologacao: "Homologação",
  implantacao: "Implantação",
};

// ─────────────────────────────────────────────────────────────────────────────
// Regras de transição
// ─────────────────────────────────────────────────────────────────────────────

/** Transições que exigem preenchimento de justificativa */
export const REQUIRES_JUSTIFICATIVA: string[] = ["bloqueada", "rejeitada", "cancelada", "planejamento_ag_aprovacao"];

/**
 * Status terminais — a demanda não pode ser editada nem movida a partir deles.
 * `ag_aceite_final` é o encerramento normal; `cancelada` é o encerramento forçado.
 */
export const TERMINAL_STATUSES = ["ag_aceite_final", "cancelada"] as const;

/** Status que ativam modal de bloqueio/suspensão */
export const SUSPENSAO_STATUSES: string[] = ["bloqueada"];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Retorna true se a demanda já foi iniciada (saiu de fila_atendimento) */
export function isDemandaIniciada(demanda: { situacao: string }): boolean {
  return demanda.situacao !== "fila_atendimento";
}

/**
 * Retorna o responsável ativo com base na etapa atual.
 * - requisitos  → etapas de planejamento
 * - dev         → execução e desvios técnicos
 * - arquiteto   → homologação
 * - gestor      → aguardando aceite
 */
export function getResponsavelAtivo(demanda: {
  situacao: string;
}): "requisitos" | "dev" | "arquiteto" | "gestor" | null {
  const s = demanda.situacao;
  if (["fila_atendimento", "planejamento_elaboracao", "planejamento_ag_aprovacao", "planejamento_aprovada"].includes(s))
    return "requisitos";
  if (["em_execucao", "bloqueada", "rejeitada", "fila_producao"].includes(s)) return "dev";
  if (["hom_ag_homologacao", "hom_homologada"].includes(s)) return "arquiteto";
  if (["ag_aceite_final"].includes(s)) return "gestor";
  return null;
}

/** Retorna as próximas situações permitidas a partir da situação atual */
export function getNextSituacoes(situacao: DemandaSituacao): DemandaSituacao[] {
  if ((TERMINAL_STATUSES as readonly string[]).includes(situacao)) return [];
  if (situacao === "bloqueada") return []; // desbloqueio é tratado separadamente
  if (situacao === "rejeitada") return ["em_execucao"];

  const idx = FLOW_PRINCIPAL.indexOf(situacao);
  if (idx < 0) return [];

  const next = FLOW_PRINCIPAL.slice(idx + 1);

  // Em homologada, é possível rejeitar
  if (situacao === "hom_homologada") {
    return [...next, "rejeitada"] as DemandaSituacao[];
  }

  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces de dados
// ─────────────────────────────────────────────────────────────────────────────

export interface Demanda {
  id: string;
  team_id: string;
  rhm: string;
  projeto: string;
  tipo: DemandaTipo;
  situacao: DemandaSituacao | string; // string para compatibilidade com dados legados
  descricao: string;
  sla: DemandaSLA;
  responsavel_requisitos: string | null;
  responsavel_dev: string | null;
  responsavel_teste: string | null;
  responsavel_arquiteto: string | null;
  aceite_data: string | null;
  aceite_responsavel: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemandaTransition {
  id: string;
  demanda_id: string;
  from_status: string | null;
  to_status: string;
  user_id: string;
  justificativa: string | null;
  created_at: string;
}

export interface DemandaHour {
  id: string;
  demanda_id: string;
  user_id: string;
  horas: number;
  fase: string;
  descricao: string;
  created_at: string;
}
