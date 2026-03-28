export type KanbanStatus = string;

export interface WorkflowColumn {
  key: string;
  label: string;
  colorClass: string;
  dotColor: string;
}

export const DEFAULT_KANBAN_COLUMNS: WorkflowColumn[] = [
  {
    key: "aguardando_desenvolvimento",
    label: "Aguardando Desenvolvimento",
    colorClass: "bg-kanban-aguardando",
    dotColor: "bg-muted-foreground",
  },
  {
    key: "em_desenvolvimento",
    label: "Em Desenvolvimento",
    colorClass: "bg-kanban-desenvolvimento",
    dotColor: "bg-info",
  },
  { key: "em_code_review", label: "Em Code Review", colorClass: "bg-kanban-review", dotColor: "bg-accent" },
  { key: "em_teste", label: "Em Teste", colorClass: "bg-kanban-teste", dotColor: "bg-warning" },
  { key: "bug", label: "Bug", colorClass: "bg-kanban-bug", dotColor: "bg-destructive" },
  {
    key: "pronto_para_publicacao",
    label: "Pronto para Publicação",
    colorClass: "bg-kanban-pronto",
    dotColor: "bg-success",
  },
];

export const COLUMN_COLOR_OPTIONS = [
  { colorClass: "bg-kanban-aguardando", dotColor: "bg-muted-foreground", label: "Cinza" },
  { colorClass: "bg-kanban-desenvolvimento", dotColor: "bg-info", label: "Azul" },
  { colorClass: "bg-kanban-review", dotColor: "bg-accent", label: "Roxo" },
  { colorClass: "bg-kanban-teste", dotColor: "bg-warning", label: "Amarelo" },
  { colorClass: "bg-kanban-bug", dotColor: "bg-destructive", label: "Vermelho" },
  { colorClass: "bg-kanban-pronto", dotColor: "bg-success", label: "Verde" },
];

export type ActivityType = "task" | "bug" | "architecture" | "scrum" | "requirements";

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, { label: string; color: string }> = {
  task: { label: "Tarefa", color: "bg-info/15 text-info border-info/30" },
  bug: { label: "Bug", color: "bg-destructive/15 text-destructive border-destructive/30" },
  architecture: { label: "Arquitetura", color: "bg-accent/15 text-accent border-accent/30" },
  scrum: { label: "Scrum", color: "bg-accent/15 text-accent border-accent/30" },
  requirements: { label: "Requisitos", color: "bg-accent/15 text-accent border-accent/30" },
};

export type ImpedimentType = "tecnico" | "dependencia" | "ambiente" | "requisito" | "infra" | "outro";
export type ImpedimentCriticality = "baixa" | "media" | "alta" | "critica";

export const IMPEDIMENT_TYPE_LABELS: Record<ImpedimentType, string> = {
  tecnico: "Técnico",
  dependencia: "Dependência Externa",
  ambiente: "Ambiente",
  requisito: "Requisito Indefinido",
  infra: "Infraestrutura",
  outro: "Outro",
};

export const IMPEDIMENT_CRITICALITY_LABELS: Record<ImpedimentCriticality, { label: string; color: string }> = {
  baixa: { label: "Baixa", color: "bg-muted text-muted-foreground" },
  media: { label: "Média", color: "bg-info/15 text-info" },
  alta: { label: "Alta", color: "bg-warning/15 text-warning" },
  critica: { label: "Crítica", color: "bg-destructive/15 text-destructive" },
};

export type CustomFieldType = "text" | "number" | "select";

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  options?: string[]; // for select type
  required: boolean;
}

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    type: "status_change";
    fromStatus?: string;
    toStatus: string;
  };
  action: {
    type: "change_status" | "add_impediment" | "notify";
    targetStatus?: string;
    message?: string;
  };
  createdAt: string;
}

export interface Epic {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
}

export interface Developer {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface Impediment {
  id: string;
  reason: string;
  type: ImpedimentType;
  criticality: ImpedimentCriticality;
  hasTicket: boolean;
  ticketUrl?: string;
  ticketId?: string;
  reportedAt: string;
  resolvedAt?: string;
  resolution?: string;
}

export interface Activity {
  id: string;
  huId: string;
  title: string;
  description: string;
  activityType: ActivityType;
  assigneeId: string;
  hours: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  isClosed?: boolean;
  closedAt?: string | null;
}

export interface UserStory {
  id: string;
  code: string;
  title: string;
  description: string;
  storyPoints: number;
  priority: "baixa" | "media" | "alta" | "critica";
  status: KanbanStatus;
  sprintId: string;
  epicId?: string;
  startDate?: string;
  endDate?: string;
  impediments: Impediment[];
  customFields?: Record<string, string | number>;
  createdAt: string;
}

export function isHUOverdue(hu: UserStory, activities: Activity[]): boolean {
  if (hu.status === "pronto_para_publicacao") return false;
  const huActs = activities.filter((a) => a.huId === hu.id);
  if (huActs.length === 0) return false;
  const today = new Date().toISOString().split("T")[0];
  const maxEnd = huActs.reduce((max, a) => (a.endDate > max ? a.endDate : max), "");
  return maxEnd < today;
}

export function hasActiveImpediment(hu: UserStory): boolean {
  return (hu.impediments || []).some((imp) => !imp.resolvedAt);
}

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  goal: string;
  isActive: boolean;
  createdAt: string;
}

export function calculateEndDate(startDate: string, hours: number): string {
  const start = new Date(startDate);
  const workDays = Math.ceil(hours / 8);
  const end = new Date(start);
  let daysAdded = 0;
  while (daysAdded < workDays) {
    end.setDate(end.getDate() + 1);
    const dayOfWeek = end.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }
  return end.toISOString().split("T")[0];
}

export function getTotalHoursForHU(activities: Activity[], huId: string): number {
  return activities.filter((a) => a.huId === huId).reduce((sum, a) => sum + a.hours, 0);
}
