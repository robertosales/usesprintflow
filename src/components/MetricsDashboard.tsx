import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, BarChart2, Loader2, TrendingUp } from "lucide-react";
import { DashboardFilters, DashboardFilterState, INITIAL_FILTERS } from "./DashboardFilters";
import { EmptyState } from "@/shared/components/common/EmptyState";

interface SprintMetrics {
  totalUserStories: number;
  totalClosedUserStories: number;
  totalHoursPlanned: number;
  totalHoursLogged: number;
  bugCount: number;
  avgLeadTime: number;
  teamProductivity: number;
}

interface TeamMetrics {
  teamId: string;
  teamName: string;
  metrics: SprintMetrics;
}

export function MetricsDashboard() {
  const { isAdmin, teams, currentTeamId } = useAuth();

  const [filters, setFilters] = useState<DashboardFilterState>({
    ...INITIAL_FILTERS,
    teamId: "all",
  });

  const [metrics, setMetrics] = useState<TeamMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Times usados nas métricas da Sala Ágil (module = "sala_agil")
  const agileTeams = useMemo(() => teams.filter((t) => t.module === "sala_agil"), [teams]);

  const effectiveTeamId = filters.teamId === "all" ? currentTeamId || "" : filters.teamId;

  const loadData = useCallback(
    async (forceTeamId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const teamId = forceTeamId ?? filters.teamId;

        // base de times do módulo Sala Ágil
        const baseTeams = agileTeams;

        const teamsToLoad =
          isAdmin && teamId === "all"
            ? baseTeams
            : baseTeams.filter((t) => t.id === (teamId === "all" ? currentTeamId : teamId));

        if (teamsToLoad.length === 0) {
          setMetrics([]);
          setLoading(false);
          return;
        }

        const newMetrics: TeamMetrics[] = [];

        for (const team of teamsToLoad) {
          const { data: sprintData, error: sprintError } = await supabase
            .from("sprints")
            .select("id, name")
            .eq("team_id", team.id)
            .eq("status", filters.sprintId === "active" ? "active" : "closed");

          if (sprintError) throw sprintError;

          const sprintIds = (sprintData || []).map((s) => s.id);
          if (sprintIds.length === 0) continue;

          const { data: userStoriesData, error: userStoriesError } = await supabase
            .from("user_stories")
            .select("id, status, hours_estimated, hours_logged, type, lead_time")
            .in("sprint_id", sprintIds);

          if (userStoriesError) throw userStoriesError;

          const metricsForTeam: SprintMetrics = {
            totalUserStories: userStoriesData?.length || 0,
            totalClosedUserStories: userStoriesData?.filter((us) => us.status === "done").length || 0,
            totalHoursPlanned: userStoriesData?.reduce((sum, us) => sum + (us.hours_estimated || 0), 0) || 0,
            totalHoursLogged: userStoriesData?.reduce((sum, us) => sum + (us.hours_logged || 0), 0) || 0,
            bugCount: userStoriesData?.filter((us) => us.type === "bug").length || 0,
            avgLeadTime:
              userStoriesData && userStoriesData.length > 0
                ? userStoriesData.reduce((sum, us) => sum + (us.lead_time || 0), 0) / userStoriesData.length
                : 0,
            teamProductivity:
              userStoriesData && userStoriesData.length > 0
                ? (userStoriesData.filter((us) => us.status === "done").length / userStoriesData.length) * 100
                : 0,
          };

          newMetrics.push({ teamId: team.id, teamName: team.name, metrics: metricsForTeam });
        }

        setMetrics(newMetrics);
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar métricas. Tente novamente.");
      } finally {
        setLoading(false);
      }
    },
    [filters.teamId, filters.sprintId, agileTeams, isAdmin, currentTeamId],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (agileTeams.length > 0) loadData();
  }, [loadData, agileTeams]);

  const handleFiltersChange = (newFilters: DashboardFilterState) => {
    setFilters(newFilters);
  };

  const activeMetrics = effectiveTeamId ? metrics.filter((m) => m.teamId === effectiveTeamId) : metrics;

  const totalTeams = agileTeams.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Métricas da Sala Ágil</h1>
            <p className="text-xs text-muted-foreground">
              Visão agregada de produtividade, bugs e lead time das sprints do time.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">
            {totalTeams} time{totalTeams !== 1 ? "s" : ""} Sala Ágil
          </Badge>
          {effectiveTeamId && (
            <Badge variant="secondary">
              Time selecionado: {agileTeams.find((t) => t.id === effectiveTeamId)?.name || "N/A"}
            </Badge>
          )}
        </div>
      </div>

      <DashboardFilters
        filters={filters}
        onChange={handleFiltersChange}
        sprints={[]} // carregue sprints se precisar filtrar por sprint específica
        teams={agileTeams}
        members={[]} // se for adicionar filtro por membro, popular aqui
        isAdmin={isAdmin}
      />

      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 mr-2 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando métricas...</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 px-3 py-2 rounded-md">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!loading && !error && activeMetrics.length === 0 && (
        <EmptyState
          icon={TrendingUp}
          title="Nenhuma métrica disponível"
          description="Crie times e sprints na Sala Ágil para visualizar as métricas."
        />
      )}

      {!loading && !error && activeMetrics.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeMetrics.map(({ teamId, teamName, metrics }) => (
            <Card key={teamId} className="border-primary/20 bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="truncate">{teamName}</span>
                  <Badge variant="outline" className="text-[10px]">
                    Time Sala Ágil
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <MetricBox
                    label="User Stories"
                    value={metrics.totalUserStories}
                    hint={`${metrics.totalClosedUserStories} concluídas`}
                  />
                  <MetricBox label="Horas planejadas" value={metrics.totalHoursPlanned.toFixed(1)} />
                  <MetricBox label="Horas lançadas" value={metrics.totalHoursLogged.toFixed(1)} />
                  <MetricBox label="Bugs" value={metrics.bugCount} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MetricBox label="Lead time médio (dias)" value={metrics.avgLeadTime.toFixed(1)} />
                  <MetricBox label="Produtividade do time" value={`${metrics.teamProductivity.toFixed(1)}%`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricBox({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}
