import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, BarChart2, Loader2, TrendingUp } from "lucide-react";
import { DashboardFilters, DashboardFilterState, INITIAL_FILTERS } from "@/components/dashboard/DashboardFilters";
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

type UserStoryMetricsRow = {
  id: string;
  status: string | null;
  type: string | null;
  lead_time: number | null;
  hours_estimated: number | null;
  hours_logged: number | null;
};

export function MetricsDashboard() {
  const { isAdmin, teams, currentTeamId } = useAuth();

  const [filters, setFilters] = useState<DashboardFilterState>({
    ...INITIAL_FILTERS,
    teamId: "all",
  });

  const [metrics, setMetrics] = useState<TeamMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleTeams = useMemo(() => teams, [teams]);

  const effectiveTeamId = filters.teamId === "all" ? currentTeamId || "" : filters.teamId;

  const loadData = useCallback(
    async (forceTeamId?: string) => {
      setLoading(true);
      setError(null);

      try {
        const teamId = forceTeamId ?? filters.teamId;

        const baseTeams = visibleTeams;

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
          // monta query base de sprints
          let sprintQuery = supabase.from("sprints").select("id, name").eq("team_id", team.id);

          // comportamento de acordo com DashboardFilters:
          // - "active"  -> sprint ativa (is_active = true)
          // - "all"     -> todas as sprints do time
          // - qualquer outro valor -> id específico de sprint
          if (filters.sprintId === "active") {
            sprintQuery = sprintQuery.eq("is_active", true);
          } else if (filters.sprintId === "all") {
            // nada adicional
          } else if (filters.sprintId) {
            sprintQuery = sprintQuery.eq("id", filters.sprintId);
          }

          const { data: sprintData, error: sprintError } = await sprintQuery;

          if (sprintError) throw sprintError;

          const sprintIds = (sprintData || []).map((s) => s.id);
          if (sprintIds.length === 0) continue;

          const { data: userStoriesData, error: userStoriesError } = await supabase
            .from("user_stories")
            .select("id, status, hours_estimated, hours_logged, type, lead_time")
            .in("sprint_id", sprintIds)
            .returns<UserStoryMetricsRow[]>();

          if (userStoriesError) throw userStoriesError;

          const metricsForTeam: SprintMetrics = {
            totalUserStories: userStoriesData?.length || 0,
            totalClosedUserStories: userStoriesData?.filter((us) => us.status === "done").length || 0,
            totalHoursPlanned: userStoriesData?.reduce((sum, us) => sum + (us.hours_estimated ?? 0), 0) || 0,
            totalHoursLogged: userStoriesData?.reduce((sum, us) => sum + (us.hours_logged ?? 0), 0) || 0,
            bugCount: userStoriesData?.filter((us) => us.type === "bug").length || 0,
            avgLeadTime:
              userStoriesData && userStoriesData.length > 0
                ? userStoriesData.reduce((sum, us) => sum + (us.lead_time ?? 0), 0) / userStoriesData.length
                : 0,
            teamProductivity:
              userStoriesData && userStoriesData.length > 0
                ? (userStoriesData.filter((us) => us.status === "done").length / userStoriesData.length) * 100
                : 0,
          };

          newMetrics.push({
            teamId: team.id,
            teamName: team.name,
            metrics: metricsForTeam,
          });
        }

        setMetrics(newMetrics);
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar métricas. Tente novamente.");
      } finally {
        setLoading(false);
      }
    },
    [filters.sprintId, filters.teamId, visibleTeams, isAdmin, currentTeamId],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (visibleTeams.length > 0) loadData();
  }, [loadData, visibleTeams]);

  const handleFiltersChange = (newFilters: DashboardFilterState) => {
    setFilters(newFilters);
  };

  const activeMetrics = effectiveTeamId ? metrics.filter((m) => m.teamId === effectiveTeamId) : metrics;

  const totalTeams = visibleTeams.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Métricas</h1>
            <p className="text-xs text-muted-foreground">
              Visão agregada de produtividade, bugs e lead time das sprints do time.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">
            {totalTeams} time{totalTeams !== 1 ? "s" : ""}
          </Badge>
          {effectiveTeamId && (
            <Badge variant="secondary">
              Time selecionado: {visibleTeams.find((t) => t.id === effectiveTeamId)?.name || "N/A"}
            </Badge>
          )}
        </div>
      </div>

      <DashboardFilters
        filters={filters}
        onChange={handleFiltersChange}
        sprints={[]} // pode ser preenchido depois para filtro por sprint específica
        teams={visibleTeams}
        members={[]} // reservado para filtro por membro
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
          description="Crie times e sprints para visualizar as métricas."
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
                    Time
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
