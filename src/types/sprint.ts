// src/types/sprint.ts

// ── Tamanho / Story Points ────────────────────────────────────────────────────

export const SIZE_REFERENCES = ["PP", "P", "M", "G", "GG"] as const;
export type SizeReference = (typeof SIZE_REFERENCES)[number];

// ── Prioridade ────────────────────────────────────────────────────────────────

export const PRIORITY_OPTIONS = ["baixa", "media", "alta", "critica"] as const;
export type Priority = (typeof PRIORITY_OPTIONS)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

// ── Activity Types ────────────────────────────────────────────────────────────

export const ACTIVITY_TYPES = [
  "task",
  "bug",
  "architecture",
  "test",
  "meeting",
  "documentation",
  "review",
  "other",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, { label: string; color: string }> = {
  task: { label: "Tarefa", color: "#6366f1" },
  bug: { label: "Bug", color: "#ef4444" },
  architecture: { label: "Arquitetura", color: "#8b5cf6" },
  test: { label: "Teste", color: "#f59e0b" },
  meeting: { label: "Reunião", color: "#06b6d4" },
  documentation: { label: "Documentação", color: "#10b981" },
  review: { label: "Revisão", color: "#f97316" },
  other: { label: "Outro", color: "#94a3b8" },
};

// ── Impedimento ───────────────────────────────────────────────────────────────

export type ImpedimentCriticality = "baixa" | "media" | "alta" | "critica";

export type ImpedimentType = "tecnico" | "negocio" | "dependencia" | "recurso" | "ambiente" | "outro";

export const IMPEDIMENT_TYPE_LABELS: Record<ImpedimentType, { label: string; color: string }> = {
  tecnico: { label: "Técnico", color: "#6366f1" },
  negocio: { label: "Negócio", color: "#f59e0b" },
  dependencia: { label: "Dependência", color: "#f97316" },
  recurso: { label: "Recurso", color: "#ef4444" },
  ambiente: { label: "Ambiente", color: "#06b6d4" },
  outro: { label: "Outro", color: "#94a3b8" },
};

export const IMPEDIMENT_CRITICALITY_LABELS: Record<ImpedimentCriticality, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export interface Impediment {
  id: string;
  huId: string;
  reason: string;
  criticality: ImpedimentCriticality;
  type?: ImpedimentType | null;
  reportedBy?: string | null;
  reportedAt?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  resolution?: string | null;
  hasTicket?: boolean;
  ticketId?: string | null;
  ticketUrl?: string | null;
}

// ── Custom Fields ─────────────────────────────────────────────────────────────

export type CustomFieldType = "text" | "number" | "date" | "boolean" | "select";

export interface CustomField {
  key: string;
  label: string;
  type: CustomFieldType;
  options?: string[];
  required?: boolean;
}

// ── Sprint ────────────────────────────────────────────────────────────────────

export interface Sprint {
  id: string;
  name: string;
  goal?: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  capacity?: number | null;
  createdAt: string;
}

// ── Epic ──────────────────────────────────────────────────────────────────────

export interface Epic {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  projectId?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

// ── Developer ─────────────────────────────────────────────────────────────────

export interface Developer {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  capacity?: number | null;
}

// ── Activity ──────────────────────────────────────────────────────────────────

export interface Activity {
  id: string;
  huId: string;
  assigneeId: string;
  title: string;
  description?: string | null;
  hours: number;
  activityType: ActivityType;
  date?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isClosed?: boolean;
  closedAt?: string | null;
  createdAt: string;
}

// ── UserStory ─────────────────────────────────────────────────────────────────

export type KanbanStatus = string;

export interface UserStory {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  acceptanceCriteria?: string | null;
  priority: Priority;
  status: KanbanStatus;
  sprintId: string | null;
  epicId?: string | null;
  assigneeId?: string | null;
  sizeReference?: SizeReference | null;
  storyPoints?: number | null;
  estimatedHours?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  functionPoints?: number | null;
  customFields?: Record<string, unknown>;
  planningStatus?: string | null;
  votedAt?: string | null;
  orderIndex?: number;
  impediments?: Impediment[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// ── WorkflowColumn ────────────────────────────────────────────────────────────

export interface WorkflowColumn {
  key: string;
  label: string;
  colorClass: string;
  dotColor: string;
  hex?: string;
  wipLimit?: number | null;
  orderIndex?: number;
}

/** Mapa dotColor Tailwind → hex para fallback de cor dinâmica */
export const DOT_COLOR_HEX: Record<string, string> = {
  "bg-slate-400": "#94a3b8",
  "bg-slate-500": "#64748b",
  "bg-gray-400": "#9ca3af",
  "bg-blue-400": "#60a5fa",
  "bg-blue-500": "#3b82f6",
  "bg-indigo-400": "#818cf8",
  "bg-indigo-500": "#6366f1",
  "bg-violet-400": "#a78bfa",
  "bg-violet-500": "#8b5cf6",
  "bg-purple-400": "#c084fc",
  "bg-purple-500": "#a855f7",
  "bg-amber-400": "#fbbf24",
  "bg-amber-500": "#f59e0b",
  "bg-yellow-400": "#facc15",
  "bg-yellow-500": "#eab308",
  "bg-orange-400": "#fb923c",
  "bg-orange-500": "#f97316",
  "bg-red-400": "#f87171",
  "bg-red-500": "#ef4444",
  "bg-rose-400": "#fb7185",
  "bg-rose-500": "#f43f5e",
  "bg-pink-400": "#f472b6",
  "bg-cyan-400": "#22d3ee",
  "bg-cyan-500": "#06b6d4",
  "bg-teal-400": "#2dd4bf",
  "bg-teal-500": "#14b8a6",
  "bg-green-400": "#4ade80",
  "bg-green-500": "#22c55e",
  "bg-emerald-400": "#34d399",
  "bg-emerald-500": "#10b981",
};

/** Retorna o hex de uma coluna com fallback automático pelo dotColor */
export function getColumnHex(col: WorkflowColumn): string {
  return col.hex || DOT_COLOR_HEX[col.dotColor] || "#94a3b8";
}

export const DEFAULT_KANBAN_COLUMNS: WorkflowColumn[] = [
  {
    key: "aguardando_desenvolvimento",
    label: "Aguardando Dev",
    colorClass: "bg-slate-100 text-slate-700 border-slate-300",
    dotColor: "bg-slate-400",
    hex: "#94a3b8",
    orderIndex: 0,
  },
  {
    key: "em_desenvolvimento",
    label: "Em Desenvolvimento",
    colorClass: "bg-blue-100 text-blue-700 border-blue-300",
    dotColor: "bg-blue-400",
    hex: "#60a5fa",
    orderIndex: 1,
  },
  {
    key: "em_teste",
    label: "Em Teste",
    colorClass: "bg-amber-100 text-amber-700 border-amber-300",
    dotColor: "bg-amber-400",
    hex: "#fbbf24",
    orderIndex: 2,
  },
  {
    key: "bug",
    label: "Bug",
    colorClass: "bg-red-100 text-red-700 border-red-300",
    dotColor: "bg-red-400",
    hex: "#f87171",
    orderIndex: 3,
  },
  {
    key: "homologacao",
    label: "Homologação",
    colorClass: "bg-violet-100 text-violet-700 border-violet-300",
    dotColor: "bg-violet-400",
    hex: "#a78bfa",
    orderIndex: 4,
  },
  {
    key: "concluida",
    label: "Concluída",
    colorClass: "bg-emerald-100 text-emerald-700 border-emerald-300",
    dotColor: "bg-emerald-400",
    hex: "#34d399",
    orderIndex: 5,
  },
];

// ── Funções auxiliares ────────────────────────────────────────────────────────

/** Calcula uma data final somando `days` dias úteis a `startDate` (YYYY-MM-DD) */
export function calculateEndDate(startDate: string, days: number): string {
  const date = new Date(startDate + "T12:00:00");
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return date.toISOString().slice(0, 10);
}

/** Soma o total de horas lançadas para uma HU */
export function getTotalHoursForHU(huId: string, activities: Activity[]): number {
  return activities.filter((a) => a.huId === huId).reduce((s, a) => s + (a.hours ?? 0), 0);
}

/** Verifica se a HU possui impedimento ativo */
export function hasActiveImpediment(hu: UserStory): boolean {
  return (hu.impediments ?? []).some((i) => !i.resolvedAt);
}

/** Verifica se a HU está atrasada (horas > 120% do estimado) */
export function isHUOverdue(hu: UserStory, activities: Activity[]): boolean {
  const TERMINAL = ["concluida", "cancelada"];
  if (TERMINAL.includes(hu.status)) return false;
  const total = getTotalHoursForHU(hu.id, activities);
  const est = hu.estimatedHours ?? 0;
  return est > 0 && total > est * 1.2;
}

/** Verifica se o status é terminal (sem movimentação) */
export function isTerminalStatus(status: string): boolean {
  return ["concluida", "cancelada"].includes(status);
}

// ── Tipos auxiliares ──────────────────────────────────────────────────────────

export interface SprintVelocity {
  sprintId: string;
  sprintName: string;
  planned: number;
  delivered: number;
}

export interface TeamWorkload {
  developerId: string;
  developerName: string;
  estimatedHours: number;
  realizedHours: number;
  percentage: number;
}
