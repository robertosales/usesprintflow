export type KanbanStatus =
  | "aguardando_desenvolvimento"
  | "em_desenvolvimento"
  | "em_code_review"
  | "em_teste"
  | "bug"
  | "pronto_para_publicacao";

export const KANBAN_COLUMNS: { key: KanbanStatus; label: string; colorClass: string }[] = [
  { key: "aguardando_desenvolvimento", label: "Aguardando Desenvolvimento", colorClass: "bg-kanban-aguardando" },
  { key: "em_desenvolvimento", label: "Em Desenvolvimento", colorClass: "bg-kanban-desenvolvimento" },
  { key: "em_code_review", label: "Em Code Review", colorClass: "bg-kanban-review" },
  { key: "em_teste", label: "Em Teste", colorClass: "bg-kanban-teste" },
  { key: "bug", label: "Bug", colorClass: "bg-kanban-bug" },
  { key: "pronto_para_publicacao", label: "Pronto para Publicação", colorClass: "bg-kanban-pronto" },
];

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
  reportedAt: string;
  resolvedAt?: string;
}

export interface Activity {
  id: string;
  huId: string;
  title: string;
  description: string;
  assigneeId: string;
  hours: number;
  startDate: string; // ISO date
  endDate: string; // calculated: startDate + hours
  status: KanbanStatus;
  impediments: Impediment[];
  createdAt: string;
}

export function isOverdue(activity: Activity): boolean {
  if (activity.status === "pronto_para_publicacao") return false;
  const today = new Date().toISOString().split("T")[0];
  return activity.endDate < today;
}

export function hasActiveImpediment(activity: Activity): boolean {
  return activity.impediments.some((imp) => !imp.resolvedAt);
}

export interface UserStory {
  id: string;
  code: string; // e.g. HU-001
  title: string;
  description: string;
  storyPoints: number;
  priority: "baixa" | "media" | "alta" | "critica";
  sprintId: string;
  createdAt: string;
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
  // 8h work day
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
  return activities
    .filter((a) => a.huId === huId)
    .reduce((sum, a) => sum + a.hours, 0);
}
