import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";
import { TrendingUp, Users, Target, Gauge, CheckCircle, AlertTriangle, ShieldAlert, Clock, Filter } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  aguardando_desenvolvimento: "hsl(220, 14%, 55%)",
  em_desenvolvimento: "hsl(210, 92%, 55%)",
  em_code_review: "hsl(262, 52%, 55%)",
  em_teste: "hsl(38, 92%, 50%)",
  bug: "hsl(0, 72%, 51%)",
  pronto_para_publicacao: "hsl(142, 71%, 40%)",
};

interface ImpedimentRecord {
  id: string;
  reason: string;
  type: string;
  criticality: string;
  ticketId: string | null;
  reportedAt: string;
  resolvedAt: string | null;
  resolution: string | null;
  huCode: string;
  huTitle: string;
}

interface TeamMetrics {
  teamId: string;
  teamName: string;
  totalPoints: number;
  completedPoints: number;
  totalHUs: number;
  completedHUs: number;
  totalHours: number;
  totalActivities: number;
  overdueCount: number;
  blockedCount: number;
  devCount: number;
  statusData: { name: string; value: number; color: string }[];
  devWorkload: { name: string; total: number; done: number; pending: number; bugs: number; tasks: number }[];
  sprintName: string;
  sprintStart: string;
  sprintEnd: string;
  impedimentHistory: ImpedimentRecord[];
}

export function MetricsDashboard() {
  const { isAdmin, teams, currentTeamId } = useAuth();
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>(currentTeamId || "all");
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentTeamId) setSelectedTeamFilter(currentTeamId);
  }, [currentTeamId]);

  useEffect(() => {
    loadMetrics();
  }, [selectedTeamFilter, teams]);

  const loadMetrics = async () => {
    setLoading(true);
    const teamsToLoad = selectedTeamFilter === "all"
      ? teams
      : teams.filter((t) => t.id === selectedTeamFilter);

    const results: TeamMetrics[] = [];

    for (const team of teamsToLoad) {
      const [sprintRes, huRes, actRes, impRes, devRes, wcRes] = await Promise.all([
        supabase.from("sprints").select("*").eq("team_id", team.id).eq("is_active", true).limit(1),
        supabase.from("user_stories").select("*").eq("team_id", team.id),
        supabase.from("activities").select("*").eq("team_id", team.id),
        supabase.from("impediments").select("*").eq("team_id", team.id),
        supabase.from("developers").select("*").eq("team_id", team.id),
        supabase.from("workflow_columns").select("*").eq("team_id", team.id).order("sort_order"),
      ]);

      const sprint = (sprintRes.data || [])[0] as any;
      const allHUs = (huRes.data || []) as any[];
      const allActs = (actRes.data || []) as any[];
      const allImps = (impRes.data || []) as any[];
      const devs = (devRes.data || []) as any[];
      const wfCols = (wcRes.data || []) as any[];

      const sprintHUs = sprint ? allHUs.filter((h) => h.sprint_id === sprint.id) : allHUs;
      const sprintHUIds = new Set(sprintHUs.map((h: any) => h.id));
      const sprintImps = allImps.filter((imp: any) => sprintHUIds.has(imp.hu_id));
      const sprintActHuIds = sprintHUIds;
      const sprintActs = allActs.filter((a) => sprintActHuIds.has(a.hu_id));

      const lastCol = wfCols[wfCols.length - 1]?.key || "pronto_para_publicacao";
      const completedHUs = sprintHUs.filter((h: any) => h.status === lastCol);
      const totalPoints = sprintHUs.reduce((s: number, h: any) => s + (h.story_points || 0), 0);
      const completedPoints = completedHUs.reduce((s: number, h: any) => s + (h.story_points || 0), 0);

      const today = new Date().toISOString().split("T")[0];
      const overdueCount = sprintHUs.filter((h: any) => {
        if (h.status === lastCol) return false;
        const huActs = allActs.filter((a: any) => a.hu_id === h.id);
        if (huActs.length === 0) return false;
        const maxEnd = huActs.reduce((max: string, a: any) => (a.end_date > max ? a.end_date : max), "");
        return maxEnd < today;
      }).length;

      const blockedCount = sprintHUs.filter((h: any) =>
        allImps.some((imp: any) => imp.hu_id === h.id && !imp.resolved_at)
      ).length;

      const statusData = (wfCols.length > 0 ? wfCols : [{ key: "aguardando_desenvolvimento", label: "Aguardando" }]).map((col: any) => ({
        name: col.label,
        value: sprintHUs.filter((h: any) => h.status === col.key).length,
        color: STATUS_COLORS[col.key] || "hsl(220, 14%, 55%)",
      })).filter((d: any) => d.value > 0);

      const devWorkload = devs.map((dev: any) => {
        const devActs = sprintActs.filter((a: any) => a.assignee_id === dev.id);
        const total = devActs.reduce((s: number, a: any) => s + Number(a.hours), 0);
        const doneHours = devActs.filter((a: any) => {
          const hu = sprintHUs.find((h: any) => h.id === a.hu_id);
          return hu && hu.status === lastCol;
        }).reduce((s: number, a: any) => s + Number(a.hours), 0);
        const bugs = devActs.filter((a: any) => a.activity_type === "bug").length;
        return { name: dev.name.split(" ")[0], total, done: doneHours, pending: total - doneHours, bugs, tasks: devActs.length };
      });

      results.push({
        teamId: team.id,
        teamName: team.name,
        totalPoints,
        completedPoints,
        totalHUs: sprintHUs.length,
        completedHUs: completedHUs.length,
        totalHours: sprintActs.reduce((s: number, a: any) => s + Number(a.hours), 0),
        totalActivities: sprintActs.length,
        overdueCount,
        blockedCount,
        devCount: devs.length,
        statusData,
        devWorkload,
        sprintName: sprint?.name || "Sem sprint ativa",
        sprintStart: sprint?.start_date || "",
        sprintEnd: sprint?.end_date || "",
        impedimentHistory: sprintImps.map((imp: any) => {
          const hu = sprintHUs.find((h: any) => h.id === imp.hu_id);
          return {
            id: imp.id, reason: imp.reason, type: imp.type, criticality: imp.criticality,
            ticketId: imp.ticket_id, reportedAt: imp.reported_at,
            resolvedAt: imp.resolved_at, resolution: imp.resolution,
            huCode: hu?.code || "?", huTitle: hu?.title || "",
          };
        }).sort((a: any, b: any) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()),
      });
    }

    setTeamMetrics(results);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" /> Dashboard de Métricas
        </h2>
        {isAdmin && (
          <Select value={selectedTeamFilter} onValueChange={setSelectedTeamFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrar por time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📊 Todos os Times</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {teamMetrics.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Gauge className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-lg">Sem dados para exibir</p>
            <p className="text-sm mt-1">Crie sprints e HUs para ver as métricas</p>
          </CardContent>
        </Card>
      )}

      {teamMetrics.map((metrics) => (
        <div key={metrics.teamId} className="space-y-4">
          {(selectedTeamFilter === "all" || teamMetrics.length > 1) && (
            <div className="flex items-center gap-2 border-b pb-2">
              <Badge variant="outline" className="text-sm font-semibold">{metrics.teamName}</Badge>
              <span className="text-xs text-muted-foreground">
                {metrics.sprintName}
                {metrics.sprintStart && ` • ${new Date(metrics.sprintStart).toLocaleDateString("pt-BR")} — ${new Date(metrics.sprintEnd).toLocaleDateString("pt-BR")}`}
              </span>
            </div>
          )}

          {selectedTeamFilter !== "all" && teamMetrics.length === 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{metrics.sprintName}</span>
              {metrics.sprintStart && (
                <Badge variant="outline" className="text-xs font-mono">
                  {new Date(metrics.sprintStart).toLocaleDateString("pt-BR")} — {new Date(metrics.sprintEnd).toLocaleDateString("pt-BR")}
                </Badge>
              )}
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <KPICard icon={TrendingUp} label="Velocity" value={`${metrics.completedPoints}`} sub={`/${metrics.totalPoints} pts`} />
            <KPICard icon={Target} label="HUs Concluídas" value={`${metrics.completedHUs}`} sub={`/${metrics.totalHUs}`} />
            <KPICard icon={CheckCircle} label="Conclusão" value={`${metrics.totalHUs > 0 ? Math.round((metrics.completedHUs / metrics.totalHUs) * 100) : 0}%`} sub="das HUs" />
            <KPICard icon={Gauge} label="Horas" value={`${metrics.totalHours}h`} sub={`${metrics.totalActivities} tarefas`} />
            <KPICard icon={Clock} label="Atividades" value={`${metrics.totalActivities}`} sub="total" />
            <KPICard icon={Users} label="Time" value={`${metrics.devCount}`} sub="membros" />
            <KPICard icon={AlertTriangle} label="Atrasadas" value={`${metrics.overdueCount}`} sub="HUs" accent={metrics.overdueCount > 0 ? "destructive" : undefined} />
            <KPICard icon={ShieldAlert} label="Impedidas" value={`${metrics.blockedCount}`} sub="HUs" accent={metrics.blockedCount > 0 ? "warning" : undefined} />
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">HUs por Status</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics.statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={metrics.statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ value }) => `${value}`} paddingAngle={2}>
                        {metrics.statusData.map((entry, i) => (
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
                {metrics.devWorkload.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={metrics.devWorkload}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="done" stackId="a" fill="hsl(142, 71%, 40%)" name="Concluído" />
                      <Bar dataKey="pending" stackId="a" fill="hsl(210, 92%, 55%)" name="Pendente" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Dev Table */}
          {metrics.devWorkload.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Desempenho Individual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 font-medium">Membro</th>
                        <th className="text-center py-2 font-medium">Tarefas</th>
                        <th className="text-center py-2 font-medium">Horas</th>
                        <th className="text-center py-2 font-medium">Concluído</th>
                        <th className="text-center py-2 font-medium">Pendente</th>
                        <th className="text-center py-2 font-medium">Bugs</th>
                        <th className="text-center py-2 font-medium">Eficiência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.devWorkload.map((dev) => (
                        <tr key={dev.name} className="border-b last:border-0">
                          <td className="py-2 font-medium">{dev.name}</td>
                          <td className="text-center py-2">{dev.tasks}</td>
                          <td className="text-center py-2">{dev.total}h</td>
                          <td className="text-center py-2 text-success font-medium">{dev.done}h</td>
                          <td className="text-center py-2 text-info font-medium">{dev.pending}h</td>
                          <td className="text-center py-2">
                            {dev.bugs > 0 ? <Badge variant="destructive" className="text-[10px]">{dev.bugs}</Badge> : "—"}
                          </td>
                          <td className="text-center py-2">
                            <Badge variant="secondary" className="text-xs">
                              {dev.total > 0 ? Math.round((dev.done / dev.total) * 100) : 0}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ))}
    </div>
  );
}

function KPICard({ icon: Icon, label, value, sub, accent }: {
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

function EmptyChart() {
  return (
    <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
      Sem dados para exibir
    </div>
  );
}
