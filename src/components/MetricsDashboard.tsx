import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import {
  TrendingUp, Users, Target, Gauge, CheckCircle, AlertTriangle,
  ShieldAlert, Clock, BarChart3, User, Layers, Bug,
} from "lucide-react";
import { DashboardFilters, DashboardFilterState, INITIAL_FILTERS } from "@/components/dashboard/DashboardFilters";
import { IndividualPerformance } from "@/components/dashboard/IndividualPerformance";
import { ExportButton } from "@/components/dashboard/ExportButton";

const STATUS_COLORS: Record<string, string> = {
  aguardando_desenvolvimento: "#94a3b8",
  em_desenvolvimento: "#3b82f6",
  em_code_review: "#8b5cf6",
  em_teste: "#f59e0b",
  bug: "#ef4444",
  pronto_para_publicacao: "#22c55e",
};

export function MetricsDashboard() {
  const { isAdmin, teams, currentTeamId } = useAuth();
  const [filters, setFilters] = useState<DashboardFilterState>({
    ...INITIAL_FILTERS,
    teamId: currentTeamId || "all",
  });
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState<{
    sprints: any[];
    hus: any[];
    activities: any[];
    impediments: any[];
    developers: any[];
    workflowCols: any[];
  }>({ sprints: [], hus: [], activities: [], impediments: [], developers: [], workflowCols: [] });

  useEffect(() => {
    if (currentTeamId) setFilters((f) => ({ ...f, teamId: currentTeamId }));
  }, [currentTeamId]);

  useEffect(() => {
    loadData();
  }, [filters.teamId, teams]);

  const loadData = async () => {
    setLoading(true);
    const teamsToLoad = (isAdmin && filters.teamId === "all")
      ? teams
      : teams.filter((t) => t.id === (filters.teamId === "all" ? currentTeamId : filters.teamId));

    const allSprints: any[] = [];
    const allHUs: any[] = [];
    const allActs: any[] = [];
    const allImps: any[] = [];
    const allDevs: any[] = [];
    const allWfCols: any[] = [];

    for (const team of teamsToLoad) {
      const [sprintRes, huRes, actRes, impRes, devRes, wcRes] = await Promise.all([
        supabase.from("sprints").select("*").eq("team_id", team.id),
        supabase.from("user_stories").select("*").eq("team_id", team.id),
        supabase.from("activities").select("*").eq("team_id", team.id),
        supabase.from("impediments").select("*").eq("team_id", team.id),
        supabase.from("developers").select("*").eq("team_id", team.id),
        supabase.from("workflow_columns").select("*").eq("team_id", team.id).order("sort_order"),
      ]);
      allSprints.push(...(sprintRes.data || []));
      allHUs.push(...(huRes.data || []));
      allActs.push(...(actRes.data || []));
      allImps.push(...(impRes.data || []));
      allDevs.push(...(devRes.data || []));
      allWfCols.push(...(wcRes.data || []));
    }

    setRawData({
      sprints: allSprints,
      hus: allHUs,
      activities: allActs,
      impediments: allImps,
      developers: allDevs,
      workflowCols: allWfCols,
    });
    setLoading(false);
  };

  // Apply filters
  const filtered = useMemo(() => {
    const { sprints, hus, activities, impediments, developers, workflowCols } = rawData;

    // Filter sprints
    let filteredSprints = sprints;
    if (filters.sprintId === "active") {
      filteredSprints = sprints.filter((s: any) => s.is_active);
    } else if (filters.sprintId !== "all") {
      filteredSprints = sprints.filter((s: any) => s.id === filters.sprintId);
    }
    const sprintIds = new Set(filteredSprints.map((s: any) => s.id));

    // Filter HUs by sprint
    let filteredHUs = filters.sprintId === "all" ? hus : hus.filter((h: any) => sprintIds.has(h.sprint_id));

    // Priority filter
    if (filters.priority !== "all") {
      filteredHUs = filteredHUs.filter((h: any) => h.priority === filters.priority);
    }

    const huIds = new Set(filteredHUs.map((h: any) => h.id));

    // Filter activities by HU
    let filteredActs = activities.filter((a: any) => huIds.has(a.hu_id));

    // Date filter on activities (start_date / end_date)
    if (filters.dateFrom) {
      filteredActs = filteredActs.filter((a: any) => a.end_date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filteredActs = filteredActs.filter((a: any) => a.start_date <= filters.dateTo);
    }

    // Also filter HUs by date range
    if (filters.dateFrom) {
      filteredHUs = filteredHUs.filter((h: any) => {
        if (h.end_date) return h.end_date >= filters.dateFrom;
        return h.created_at.split("T")[0] >= filters.dateFrom;
      });
    }
    if (filters.dateTo) {
      filteredHUs = filteredHUs.filter((h: any) => {
        if (h.start_date) return h.start_date <= filters.dateTo;
        return h.created_at.split("T")[0] <= filters.dateTo;
      });
    }

    // Re-compute huIds after date filter
    const finalHuIds = new Set(filteredHUs.map((h: any) => h.id));
    filteredActs = filteredActs.filter((a: any) => finalHuIds.has(a.hu_id));

    // Activity type filter
    if (filters.activityType !== "all") {
      filteredActs = filteredActs.filter((a: any) => a.activity_type === filters.activityType);
    }

    // Member filter
    if (filters.memberId !== "all") {
      filteredActs = filteredActs.filter((a: any) => a.assignee_id === filters.memberId);
    }

    // Status filter
    if (filters.status !== "all") {
      if (filters.status === "concluida") {
        filteredActs = filteredActs.filter((a: any) => a.is_closed);
      } else if (filters.status === "em_progresso") {
        const today = new Date().toISOString().split("T")[0];
        filteredActs = filteredActs.filter((a: any) => !a.is_closed && a.start_date <= today);
      } else if (filters.status === "nao_iniciada") {
        const today = new Date().toISOString().split("T")[0];
        filteredActs = filteredActs.filter((a: any) => !a.is_closed && a.start_date > today);
      } else if (filters.status === "bloqueada") {
        const blockedHuIds = new Set(impediments.filter((i: any) => !i.resolved_at).map((i: any) => i.hu_id));
        filteredActs = filteredActs.filter((a: any) => blockedHuIds.has(a.hu_id));
      }
    }

    // Filtered impediments
    const filteredImps = impediments.filter((i: any) => finalHuIds.has(i.hu_id));

    const lastCol = workflowCols.length > 0
      ? workflowCols.sort((a: any, b: any) => a.sort_order - b.sort_order)[workflowCols.length - 1]?.key
      : "pronto_para_publicacao";

    return {
      sprints: filteredSprints,
      hus: filteredHUs,
      activities: filteredActs,
      impediments: filteredImps,
      developers,
      workflowCols,
      lastCol,
    };
  }, [rawData, filters]);

  // Compute individual member metrics
  const memberMetrics = useMemo(() => {
    const { developers, activities, hus, impediments, lastCol } = filtered;
    const today = new Date().toISOString().split("T")[0];
    const blockedHuIds = new Set(impediments.filter((i: any) => !i.resolved_at).map((i: any) => i.hu_id));

    return developers.map((dev: any) => {
      const devActs = activities.filter((a: any) => a.assignee_id === dev.id);
      const devHUIds = new Set(devActs.map((a: any) => a.hu_id));
      const devHUs = hus.filter((h: any) => devHUIds.has(h.id));

      const closedActs = devActs.filter((a: any) => a.is_closed);
      // Started = not closed AND start_date <= today
      const startedActs = devActs.filter((a: any) => !a.is_closed && a.start_date <= today);
      // Not started = assigned - started - completed
      const notStartedCount = devActs.length - startedActs.length - closedActs.length;

      const hoursPlanned = devActs.reduce((s: number, a: any) => s + Number(a.hours), 0);
      const hoursCompleted = closedActs.reduce((s: number, a: any) => s + Number(a.hours), 0);

      const bugActs = devActs.filter((a: any) => a.activity_type === "bug");
      const bugsClosed = bugActs.filter((a: any) => a.is_closed);

      const completedHUs = devHUs.filter((h: any) => h.status === lastCol);
      const spCompleted = completedHUs.reduce((s: number, h: any) => s + (h.story_points || 0), 0);

      const avgTime = closedActs.length > 0
        ? Math.round(hoursCompleted / closedActs.length * 10) / 10
        : 0;

      // Check if any activity's HU is blocked/impeded
      const devBlockedActs = devActs.filter((a: any) => !a.is_closed && blockedHuIds.has(a.hu_id));

      // Tasks by status with fixed palette
      const tasksByStatus = [
        { name: "Concluída", value: closedActs.length, color: "#22c55e" },
        { name: "Em Progresso", value: startedActs.length - devBlockedActs.length, color: "#3b82f6" },
        { name: "Não Iniciada", value: Math.max(0, notStartedCount), color: "#94a3b8" },
        { name: "Bloqueada", value: devBlockedActs.length, color: "#ef4444" },
      ].map(s => ({ ...s, value: Math.max(0, s.value) }))
       .filter((s) => s.value > 0);

      return {
        id: dev.id,
        name: dev.name,
        role: dev.role || "developer",
        tasksAssigned: devActs.length,
        tasksStarted: startedActs.length,
        tasksCompleted: closedActs.length,
        tasksNotStarted: Math.max(0, notStartedCount),
        hoursPlanned,
        hoursCompleted,
        hoursPending: hoursPlanned - hoursCompleted,
        efficiency: hoursPlanned > 0 ? Math.round((hoursCompleted / hoursPlanned) * 100) : 0,
        bugsAssigned: bugActs.length,
        bugsResolved: bugsClosed.length,
        storyPointsCompleted: spCompleted,
        avgTimePerActivity: avgTime,
        tasksByStatus,
      };
    });
  }, [filtered]);

  // Hours per member chart data - show ALL members including 0h
  const hoursPerMemberData = useMemo(() =>
    memberMetrics.map((m) => ({
      name: m.name.split(" ")[0],
      concluido: m.hoursCompleted,
      pendente: m.hoursPending,
    })),
    [memberMetrics]
  );

  // Progress by sprint line data
  const progressBySprintData = useMemo(() => {
    const { sprints: allSprints } = rawData;
    if (allSprints.length <= 1) return [];

    return allSprints
      .sort((a: any, b: any) => a.start_date.localeCompare(b.start_date))
      .slice(-5)
      .map((sprint: any) => {
        const sprintHUs = rawData.hus.filter((h: any) => h.sprint_id === sprint.id);
        const huIds = new Set(sprintHUs.map((h: any) => h.id));
        const sprintActs = rawData.activities.filter((a: any) => huIds.has(a.hu_id));

        const entry: any = { sprint: sprint.name };
        filtered.developers.forEach((dev: any) => {
          const devActs = sprintActs.filter((a: any) => a.assignee_id === dev.id);
          const closed = devActs.filter((a: any) => a.is_closed);
          entry[dev.name.split(" ")[0]] = closed.reduce((s: number, a: any) => s + Number(a.hours), 0);
        });
        return entry;
      });
  }, [rawData, filtered.developers]);

  // Team overview metrics
  const teamOverview = useMemo(() => {
    const { hus, activities, impediments, lastCol, workflowCols } = filtered;

    const completedHUs = hus.filter((h: any) => h.status === lastCol);
    const totalPoints = hus.reduce((s: number, h: any) => s + (h.story_points || 0), 0);
    const completedPoints = completedHUs.reduce((s: number, h: any) => s + (h.story_points || 0), 0);
    const totalHours = activities.reduce((s: number, a: any) => s + Number(a.hours), 0);
    const completedHours = activities.filter((a: any) => a.is_closed).reduce((s: number, a: any) => s + Number(a.hours), 0);

    const today = new Date().toISOString().split("T")[0];
    const overdueCount = hus.filter((h: any) => {
      if (h.status === lastCol) return false;
      if (h.end_date) return h.end_date < today;
      const huActs = activities.filter((a: any) => a.hu_id === h.id);
      if (huActs.length === 0) return false;
      const maxEnd = huActs.reduce((max: string, a: any) => (a.end_date > max ? a.end_date : max), "");
      return maxEnd < today;
    }).length;

    const blockedCount = hus.filter((h: any) =>
      impediments.some((imp: any) => imp.hu_id === h.id && !imp.resolved_at)
    ).length;

    const cols = workflowCols.length > 0 ? workflowCols : [{ key: "aguardando_desenvolvimento", label: "Aguardando" }];
    const statusData = cols
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((col: any) => ({
        name: col.label,
        value: hus.filter((h: any) => h.status === col.key).length,
        color: STATUS_COLORS[col.key] || "#94a3b8",
      }))
      .filter((d: any) => d.value > 0);

    return {
      totalPoints,
      completedPoints,
      totalHUs: hus.length,
      completedHUs: completedHUs.length,
      totalHours,
      completedHours,
      totalActivities: activities.length,
      completedActivities: activities.filter((a: any) => a.is_closed).length,
      overdueCount,
      blockedCount,
      devCount: filtered.developers.length,
      statusData,
      sprintName: filtered.sprints[0]?.name || "Sem sprint",
      sprintStart: filtered.sprints[0]?.start_date || "",
      sprintEnd: filtered.sprints[0]?.end_date || "",
      impedimentHistory: impediments.map((imp: any) => {
        const hu = hus.find((h: any) => h.id === imp.hu_id);
        return {
          id: imp.id, reason: imp.reason, type: imp.type, criticality: imp.criticality,
          ticketId: imp.ticket_id, reportedAt: imp.reported_at,
          resolvedAt: imp.resolved_at, resolution: imp.resolution,
          huCode: hu?.code || "?", huTitle: hu?.title || "",
        };
      }).sort((a: any, b: any) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()),
    };
  }, [filtered]);

  const getTeamExportData = () => ({
    title: `Métricas do Time - ${teamOverview.sprintName}`,
    headers: ["Métrica", "Valor"],
    rows: [
      ["Velocity (SP Concluídos)", teamOverview.completedPoints],
      ["Total Story Points", teamOverview.totalPoints],
      ["HUs Concluídas", teamOverview.completedHUs],
      ["Total HUs", teamOverview.totalHUs],
      ["Conclusão (%)", `${teamOverview.totalHUs > 0 ? Math.round((teamOverview.completedHUs / teamOverview.totalHUs) * 100) : 0}%`],
      ["Total Horas", teamOverview.totalHours],
      ["Horas Concluídas", teamOverview.completedHours],
      ["Total Atividades", teamOverview.totalActivities],
      ["Atividades Concluídas", teamOverview.completedActivities],
      ["Membros", teamOverview.devCount],
      ["HUs Atrasadas", teamOverview.overdueCount],
      ["HUs Impedidas", teamOverview.blockedCount],
    ],
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const memberNames = filtered.developers.map((d: any) => d.name.split(" ")[0]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <DashboardFilters
        filters={filters}
        onChange={setFilters}
        sprints={rawData.sprints.map((s: any) => ({ id: s.id, name: s.name, isActive: s.is_active }))}
        teams={teams}
        members={rawData.developers.map((d: any) => ({ id: d.id, name: d.name }))}
        isAdmin={isAdmin}
      />

      {/* Sprint info & overview KPIs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">{teamOverview.sprintName}</span>
          {teamOverview.sprintStart && (
            <Badge variant="outline" className="text-[10px] font-mono">
              {new Date(teamOverview.sprintStart).toLocaleDateString("pt-BR")} — {new Date(teamOverview.sprintEnd).toLocaleDateString("pt-BR")}
            </Badge>
          )}
        </div>
        <ExportButton getData={getTeamExportData} />
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <OverviewKPI icon={TrendingUp} label="Velocity" value={`${teamOverview.completedPoints}`} sub={`/${teamOverview.totalPoints} pts`} />
        <OverviewKPI icon={Target} label="HUs Concluídas" value={`${teamOverview.completedHUs}`} sub={`/${teamOverview.totalHUs}`} />
        <OverviewKPI icon={CheckCircle} label="Conclusão" value={`${teamOverview.totalHUs > 0 ? Math.round((teamOverview.completedHUs / teamOverview.totalHUs) * 100) : 0}%`} sub="das HUs" />
        <OverviewKPI icon={Gauge} label="Horas" value={`${teamOverview.completedHours}h`} sub={`/${teamOverview.totalHours}h plan.`} />
        <OverviewKPI icon={Clock} label="Atividades" value={`${teamOverview.completedActivities}`} sub={`/${teamOverview.totalActivities} total`} />
        <OverviewKPI icon={Users} label="Time" value={`${teamOverview.devCount}`} sub="membros" />
        <OverviewKPI icon={AlertTriangle} label="Atrasadas" value={`${teamOverview.overdueCount}`} sub="HUs" accent={teamOverview.overdueCount > 0 ? "destructive" : undefined} />
        <OverviewKPI icon={ShieldAlert} label="Impedidas" value={`${teamOverview.blockedCount}`} sub="HUs" accent={teamOverview.blockedCount > 0 ? "warning" : undefined} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="individual" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="individual" className="text-xs gap-1">
            <User className="h-3.5 w-3.5" /> Individual
          </TabsTrigger>
          <TabsTrigger value="team" className="text-xs gap-1">
            <Users className="h-3.5 w-3.5" /> Time
          </TabsTrigger>
          <TabsTrigger value="quality" className="text-xs gap-1">
            <Bug className="h-3.5 w-3.5" /> Qualidade
          </TabsTrigger>
          <TabsTrigger value="impediments" className="text-xs gap-1">
            <ShieldAlert className="h-3.5 w-3.5" /> Impedimentos
          </TabsTrigger>
        </TabsList>

        {/* Individual Performance */}
        <TabsContent value="individual">
          <IndividualPerformance
            members={memberMetrics}
            sprintName={teamOverview.sprintName}
            hoursPerMemberData={hoursPerMemberData}
            progressBySprintData={progressBySprintData}
            memberNames={memberNames}
          />
        </TabsContent>

        {/* Team Performance */}
        <TabsContent value="team">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">HUs por Status</CardTitle>
              </CardHeader>
              <CardContent>
                {teamOverview.statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={teamOverview.statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ value }) => `${value}`} paddingAngle={2}>
                        {teamOverview.statusData.map((entry: any, i: number) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Carga por Membro (horas)</CardTitle>
              </CardHeader>
              <CardContent>
                {hoursPerMemberData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={hoursPerMemberData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="concluido" stackId="a" fill="#22c55e" name="Concluído" />
                      <Bar dataKey="pendente" stackId="a" fill="#3b82f6" name="Pendente" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Quality / Bugs */}
        <TabsContent value="quality">
          <BugsPanel activities={filtered.activities} developers={filtered.developers} />
        </TabsContent>

        {/* Impediments */}
        <TabsContent value="impediments">
          <ImpedimentHistoryPanel data={teamOverview.impedimentHistory} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// === Sub-components ===

function OverviewKPI({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string; sub: string;
  accent?: "destructive" | "warning";
}) {
  return (
    <Card className={accent === "destructive" ? "border-destructive/30" : accent === "warning" ? "border-warning/30" : ""}>
      <CardContent className="p-3 text-center">
        <Icon className={`h-4 w-4 mx-auto mb-1 ${accent === "destructive" ? "text-destructive" : accent === "warning" ? "text-warning" : "text-primary"}`} />
        <p className={`text-xl font-bold ${accent === "destructive" ? "text-destructive" : accent === "warning" ? "text-warning" : ""}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{sub}</p>
        <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

function BugsPanel({ activities, developers }: { activities: any[]; developers: any[] }) {
  const bugActs = activities.filter((a: any) => a.activity_type === "bug");
  const bugsOpen = bugActs.filter((a: any) => !a.is_closed).length;
  const bugsClosed = bugActs.filter((a: any) => a.is_closed).length;
  const totalBugs = bugActs.length;

  const bugsByMember = developers.map((dev: any) => {
    const devBugs = bugActs.filter((a: any) => a.assignee_id === dev.id);
    return {
      name: dev.name.split(" ")[0],
      abertos: devBugs.filter((a: any) => !a.is_closed).length,
      resolvidos: devBugs.filter((a: any) => a.is_closed).length,
    };
  }).filter((d) => d.abertos + d.resolvidos > 0);

  const statusPie = [
    { name: "Abertos", value: bugsOpen, color: "#ef4444" },
    { name: "Resolvidos", value: bugsClosed, color: "#22c55e" },
  ].filter((d) => d.value > 0);

  if (totalBugs === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Bug className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum bug registrado</p>
          <p className="text-sm mt-1">Crie atividades do tipo "Bug" para ver métricas de qualidade</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{bugsOpen}</p>
            <p className="text-[10px] text-muted-foreground">Bugs Abertos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-success">{bugsClosed}</p>
            <p className="text-[10px] text-muted-foreground">Bugs Resolvidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{totalBugs}</p>
            <p className="text-[10px] text-muted-foreground">Total de Bugs</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Bugs por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label paddingAngle={3}>
                  {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {bugsByMember.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Bugs por Membro</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={bugsByMember}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="abertos" fill="#ef4444" name="Abertos" />
                  <Bar dataKey="resolvidos" fill="#22c55e" name="Resolvidos" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ImpedimentHistoryPanel({ data }: { data: any[] }) {
  if (data.length === 0) {
    return (
      <Card className="border-dashed border-success/30">
        <CardContent className="py-12 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-success opacity-60" />
          <p className="font-medium text-success">✅ Nenhum impedimento registrado nesta sprint.</p>
          <p className="text-sm text-muted-foreground mt-1">O time está livre de bloqueios!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-warning" /> Histórico de Impedimentos ({data.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 font-medium">HU</th>
                <th className="text-left py-2 font-medium">Descrição</th>
                <th className="text-center py-2 font-medium">Tipo</th>
                <th className="text-center py-2 font-medium">Criticidade</th>
                <th className="text-center py-2 font-medium">Chamado</th>
                <th className="text-center py-2 font-medium">Reportado</th>
                <th className="text-center py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((imp: any, idx: number) => (
                <tr key={imp.id} className={`border-b last:border-0 ${idx % 2 !== 0 ? "bg-[#f8fafc] dark:bg-muted/10" : ""}`}>
                  <td className="py-2 font-mono text-xs font-bold">{imp.huCode}</td>
                  <td className="py-2 max-w-[200px] truncate">{imp.reason}</td>
                  <td className="text-center py-2 capitalize text-xs">{imp.type}</td>
                  <td className="text-center py-2">
                    <Badge className={`text-[10px] ${
                      imp.criticality === "critica" ? "bg-destructive/15 text-destructive" :
                      imp.criticality === "alta" ? "bg-warning/15 text-warning" :
                      imp.criticality === "media" ? "bg-info/15 text-info" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {imp.criticality}
                    </Badge>
                  </td>
                  <td className="text-center py-2 text-xs">{imp.ticketId || "—"}</td>
                  <td className="text-center py-2 text-xs">{new Date(imp.reportedAt).toLocaleDateString("pt-BR")}</td>
                  <td className="text-center py-2">
                    {imp.resolvedAt ? (
                      <Badge variant="secondary" className="text-[10px] gap-1 bg-success/15 text-success">
                        <CheckCircle className="h-3 w-3" /> Resolvido
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] gap-1 bg-warning/15 text-warning">
                        <ShieldAlert className="h-3 w-3" /> Ativo
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
      Sem dados para exibir
    </div>
  );
}
