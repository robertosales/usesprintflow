export type ReportType =
  | 'individual'
  | 'sprint'
  | 'quality'
  | 'velocity'
  | 'burndown'
  | 'impediment'
  | 'release'
  | 'billing';

export type ExportFormat = 'pdf' | 'xlsx' | 'csv';

export type MemberScope = 'all' | string; // 'all' ou developer_id

export interface ReportConfig {
  type: ReportType;
  sprintId: string;
  periodStart: string;
  periodEnd: string;
  format: ExportFormat;
  memberScope: MemberScope;
}

export interface ReportMeta {
  type: ReportType;
  title: string;
  description: string;
  icon: string;
  audience: string;
  color: string;
}

export const REPORT_META: ReportMeta[] = [
  { type: 'individual',  title: 'Desempenho Individual',        description: 'Eficiência, horas e KPIs por membro',         icon: '👤', audience: 'Scrum Master',  color: 'indigo'  },
  { type: 'sprint',      title: 'Sprint Report',                description: 'HUs, velocity, retrospectiva do sprint',       icon: '🚀', audience: 'Time / PO',     color: 'violet'  },
  { type: 'quality',     title: 'Qualidade & Bugs',             description: 'Distribuição e tendência de bugs',             icon: '🐛', audience: 'QA / Tech Lead', color: 'red'     },
  { type: 'velocity',    title: 'Velocity & Tendência',         description: 'SP entregues, commitment, histórico',          icon: '📈', audience: 'Scrum Master',  color: 'purple'  },
  { type: 'burndown',    title: 'Burndown do Sprint',           description: 'Linha ideal vs real + Cumulative Flow',        icon: '📉', audience: 'Time / PO',     color: 'blue'    },
  { type: 'impediment',  title: 'Impedimentos',                 description: 'Histórico, criticidade e tempo de resolução',  icon: '⚠️', audience: 'Gestor',         color: 'amber'   },
  { type: 'release',     title: 'Release Notes',                description: 'Features entregues e bugs corrigidos',         icon: '📋', audience: 'PO / Stakeholder',color: 'emerald' },
  { type: 'billing',     title: 'Produtividade — Faturamento',  description: 'Atividades detalhadas por membro com horas',   icon: '💼', audience: 'Faturamento',    color: 'indigo'  },
];
