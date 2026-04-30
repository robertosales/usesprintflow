// src/types/sprint.ts

// ── Enums / Constantes ────────────────────────────────────────────────────────

export const SIZE_REFERENCES = ["PP", "P", "M", "G", "GG"] as const;
export type SizeReference = (typeof SIZE_REFERENCES)[number];

export const PRIORITY_OPTIONS = ["baixa", "media", "alta", "critica"] as const;
export type Priority = (typeof PRIORITY_OPTIONS)[number];

export const IMPEDIMENT_CRITICALITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export const ACTIVITY_TYPES = [
  "desenvolvimento",
  "teste",
  "arquitetura",
  "bug",
  "reuniao",
  "documentacao",
  "revisao",
  "outro",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  desenvolvimento: "Desenvolvimento",
  teste: "Teste",
  arquitetura: "Arquitetura",
  bug: "Bug",
  reuniao: "Reunião",
  documentacao: "Documentação",
  revisao: "Revisão",
  outro: "Outro",
};

// ── Interfaces principais ─────────────────────────────────────────────────────

export interface Sprint {
  id: string;
  name: string;
  goal?: string | null;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  status: "planning" | "active" | "completed" | "cancelled";
  capacity?: number | null;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Epic {
  id: string;
  name: string;
  color: string; // hex, ex: "#6366f1"
  description?: string | null;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Impediment {
  id: string;
  huId: string;
  reason: string;
  criticality: "baixa" | "media" | "alta" | "critica";
  reportedBy?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
}

export interface UserStory {
  id: string;
  code: string; // ex: "HU-001"
  title: string;
  description?: string | null;
  acceptanceCriteria?: string | null;
  priority: Priority;
  status: string; // chave do WorkflowColumn
  sprintId: string | null;
  epicId?: string | null;
  assigneeId?: string | null;
  sizeReference?: SizeReference | null;
  storyPoints?: number | null;
  estimatedHours?: number | null;
  orderIndex?: number;
  impediments?: Impediment[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  huId: string;
  assigneeId: string;
  title: string;
  description?: string | null;
  hours: number;
  activityType: ActivityType;
  date?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Developer {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  capacity?: number | null; // horas por sprint
}

// ── WorkflowColumn ────────────────────────────────────────────────────────────

export interface WorkflowColumn {
  key: string;
  label: string;
  colorClass: string; // classes Tailwind para badge
  dotColor: string; // classe Tailwind para dot (bg-*)
  hex?: string; // cor hex para bordas/acentos dinâmicos no board
  wipLimit?: number | null;
  orderIndex?: number;
}

/** Mapa de dotColor Tailwind → hex equivalente para fallback de cor */
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

/** Retorna a cor hex de uma coluna, com fallback automático */
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

// ── Helpers de estado ─────────────────────────────────────────────────────────

/** Colunas terminais — HUs aqui não podem ser movidas de volta */
export const TERMINAL_STATUSES = ["concluida", "cancelada"] as const;

export function isTerminalStatus(status: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

/** Verifica se a HU possui impedimento ativo (não resolvido) */
export function hasActiveImpediment(hu: UserStory): boolean {
  return (hu.impediments ?? []).some((i) => !i.resolvedAt);
}

/**
 * Verifica se a HU está atrasada:
 * - Sprint encerrada e HU não está em status terminal, OU
 * - HU com horas realizadas > estimadas (sem estar concluída)
 */
export function isHUOverdue(hu: UserStory, activities: Activity[]): boolean {
  if (isTerminalStatus(hu.status)) return false;

  const huActivities = activities.filter((a) => a.huId === hu.id);
  const totalHours = huActivities.reduce((s, a) => s + (a.hours ?? 0), 0);
  const estimated = hu.estimatedHours ?? 0;

  if (estimated > 0 && totalHours > estimated * 1.2) return true;

  return false;
}

// ── Tipos auxiliares ──────────────────────────────────────────────────────────

export interface SprintVelocity {
  sprintId: string;
  sprintName: string;
  planned: number; // story points planejados
  delivered: number; // story points entregues
}

export interface TeamWorkload {
  developerId: string;
  developerName: string;
  estimatedHours: number;
  realizedHours: number;
  percentage: number;
}
