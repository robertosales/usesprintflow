import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Filter, X, Save, RotateCcw } from "lucide-react";

export interface DashboardFilterState {
  sprintId: string;
  teamId: string;
  memberId: string;
  status: string;
  priority: string;
  activityType: string;
  dateFrom: string;
  dateTo: string;
}

export const INITIAL_FILTERS: DashboardFilterState = {
  sprintId: "active",
  teamId: "all",
  memberId: "all",
  status: "all",
  priority: "all",
  activityType: "all",
  dateFrom: "",
  dateTo: "",
};

interface Props {
  filters: DashboardFilterState;
  onChange: (filters: DashboardFilterState) => void;
  sprints: { id: string; name: string; isActive: boolean }[];
  teams: { id: string; name: string }[];
  members: { id: string; name: string }[];
  isAdmin: boolean;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os Status" },
  { value: "nao_iniciada", label: "Não Iniciada" },
  { value: "em_progresso", label: "Em Progresso" },
  { value: "concluida", label: "Concluída" },
  { value: "bloqueada", label: "Bloqueada" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "critica", label: "Crítica" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
];

const ACTIVITY_TYPE_OPTIONS = [
  { value: "all", label: "Todos os Tipos" },
  { value: "task", label: "Tarefa" },
  { value: "bug", label: "Bug" },
  { value: "architecture", label: "Arquitetura" },
  { value: "scrum", label: "Scrum" },
  { value: "requirements", label: "Requisitos" },
];

export function DashboardFilters({ filters, onChange, sprints, teams, members, isAdmin }: Props) {
  const [expanded, setExpanded] = useState(true);

  const update = (key: keyof DashboardFilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, val]) => val !== (INITIAL_FILTERS as any)[key]
  ).length;

  const reset = () => onChange({ ...INITIAL_FILTERS });

  return (
    <Card className="border-primary/20 bg-card/50">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
          >
            <Filter className="h-4 w-4 text-primary" />
            Filtros
            {activeFilterCount > 0 && (
              <Badge className="bg-primary text-primary-foreground text-[10px] h-5 min-w-5 px-1.5">
                {activeFilterCount}
              </Badge>
            )}
          </button>
          <div className="flex items-center gap-1.5">
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={reset} className="h-7 text-xs gap-1 text-muted-foreground">
                <RotateCcw className="h-3 w-3" /> Limpar
              </Button>
            )}
          </div>
        </div>

        {expanded && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {/* Sprint */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sprint</label>
              <Select value={filters.sprintId} onValueChange={(v) => update("sprintId", v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Sprint Ativa</SelectItem>
                  <SelectItem value="all">Todas as Sprints</SelectItem>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.isActive ? "✦" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team */}
            {isAdmin && (
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Time</label>
                <Select value={filters.teamId} onValueChange={(v) => update("teamId", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Times</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Member */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Membro</label>
              <Select value={filters.memberId} onValueChange={(v) => update("memberId", v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Status</label>
              <Select value={filters.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Prioridade</label>
              <Select value={filters.priority} onValueChange={(v) => update("priority", v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Activity Type */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tipo</label>
              <Select value={filters.activityType} onValueChange={(v) => update("activityType", v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Data Início</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => update("dateFrom", e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* Date To */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Data Fim</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => update("dateTo", e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
