import { useSprint } from "@/contexts/SprintContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";
import { TrendingUp, Users, Target, Gauge, CheckCircle, AlertTriangle, ShieldAlert, Clock } from "lucide-react";
import { KANBAN_COLUMNS, isHUOverdue, hasActiveImpediment } from "@/types/sprint";

const STATUS_COLORS: Record<string, string> = {
  aguardando_desenvolvimento: "hsl(220, 14%, 55%)",
  em_desenvolvimento: "hsl(210, 92%, 55%)",
  em_code_review: "hsl(262, 52%, 55%)",
  em_teste: "hsl(38, 92%, 50%)",
  bug: "hsl(0, 72%, 51%)",
  pronto_para_publicacao: "hsl(142, 71%, 40%)",
};

export function MetricsDashboard() {
  const { activities, userStories, developers, activeSprint } = useSprint();

  const sprintStories = activeSprint
    ? userStories.filter((hu) => hu.sprintId === activeSprint.id)
    : [];
  const sprintActivities = activities.filter((a) =>
    sprintStories.some((hu) => hu.id === a.huId)
  );

  const totalPoints = sprintStories.reduce((s, hu) => s + hu.storyPoints, 0);
  const completedHUs = sprintStories.filter((hu) => (hu.status || "aguardando_desenvolvimento") === "pronto_para_publicacao");
  const completedPoints = completedHUs.reduce((s, hu) => s + hu.storyPoints, 0);
  const totalHours = sprintActivities.reduce((s, a) => s + a.hours, 0);
  const overdueCount = sprintStories.filter((hu) => isHUOverdue(hu, activities)).length;
  const blockedCount = sprintStories.filter(hasActiveImpediment).length;

  let sprintDays = 10;
  if (activeSprint) {
    const start = new Date(activeSprint.startDate);
    const end = new Date(activeSprint.endDate);
    sprintDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }
  const totalCapacity = developers.length * 8 * sprintDays;
  const capacityPercent = totalCapacity > 0 ? Math.round((totalHours / totalCapacity) * 100) : 0;
  const completionRate = sprintStories.length > 0
    ? Math.round((completedHUs.length / sprintStories.length) * 100)
    : 0;

  // HU status distribution
  const statusData = KANBAN_COLUMNS.map((col) => ({
    name: col.label,
    value: sprintStories.filter((hu) => (hu.status || "aguardando_desenvolvimento") === col.key).length,
    color: STATUS_COLORS[col.key],
  })).filter((d) => d.value > 0);

  // Dev workload
  const devWorkload = developers.map((dev) => {
    const devActs = sprintActivities.filter((a) => a.assigneeId === dev.id);
    const total = devActs.reduce((s, a) => s + a.hours, 0);
    // Check which HUs this dev's activities belong to that are completed
    const devHUIds = [...new Set(devActs.map((a) => a.huId))];
    const doneHours = devActs.filter((a) => {
      const hu = sprintStories.find((h) => h.id === a.huId);
      return hu && hu.status === "pronto_para_publicacao";
    }).reduce((s, a) => s + a.hours, 0);
    const bugs = devActs.filter((a) => a.activityType === "bug").length;
    return { name: dev.name.split(" ")[0], total, done: doneHours, pending: total - doneHours, bugs, tasks: devActs.length };
  });

  // Burndown (HU-based story points)
  const burndownData = (() => {
    if (!activeSprint) return [];
    const start = new Date(activeSprint.startDate);
    const end = new Date(activeSprint.endDate);
    const days: { day: string; ideal: number; real: number }[] = [];
    const totalPts = totalPoints || 1;
    let current = new Date(start);
    let dayIdx = 0;
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    while (current <= end) {
      const ideal = Math.max(0, totalPts - (totalPts / totalDays) * dayIdx);
      const remaining = totalPts - completedPoints;
      days.push({
        day: current.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        ideal: Math.round(ideal * 10) / 10,
        real: dayIdx === totalDays ? remaining : Math.round((totalPts - (completedPoints * dayIdx / totalDays)) * 10) / 10,
      });
      current.setDate(current.getDate() + 1);
      dayIdx++;
    }
    return days;
  })();

  if (!activeSprint) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Gauge className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-lg">Nenhuma Sprint ativa</p>
          <p className="text-sm mt-1">Selecione uma Sprint para ver as métricas de desempenho</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">Dashboard — {activeSprint.name}</h2>
        <Badge variant="outline" className="text-xs font-mono">
          {new Date(activeSprint.startDate).toLocaleDateString("pt-BR")} — {new Date(activeSprint.endDate).toLocaleDateString("pt-BR")}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <KPICard icon={TrendingUp} label="Velocity" value={`${completedPoints}`} sub={`/${totalPoints} pts`} />
        <KPICard icon={Target} label="HUs Concluídas" value={`${completedHUs.length}`} sub={`/${sprintStories.length}`} />
        <KPICard icon={CheckCircle} label="Conclusão" value={`${completionRate}%`} sub="das HUs" />
        <KPICard icon={Gauge} label="Capacidade" value={`${capacityPercent}%`} sub={`${totalHours}/${totalCapacity}h`} />
        <KPICard icon={Clock} label="Horas Alocadas" value={`${totalHours}h`} sub={`${sprintActivities.length} tarefas`} />
        <KPICard icon={Users} label="Time" value={`${developers.length}`} sub="membros" />
        <KPICard icon={AlertTriangle} label="Atrasadas" value={`${overdueCount}`} sub="HUs" accent={overdueCount > 0 ? "destructive" : undefined} />
        <KPICard icon={ShieldAlert} label="Impedidas" value={`${blockedCount}`} sub="HUs" accent={blockedCount > 0 ? "warning" : undefined} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">HUs por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ value }) => `${value}`} paddingAngle={2}>
                    {statusData.map((entry, i) => (
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
            {devWorkload.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={devWorkload}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="done" stackId="a" fill="hsl(142, 71%, 40%)" name="Concluído" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pending" stackId="a" fill="hsl(210, 92%, 55%)" name="Pendente" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Burndown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Burndown Chart (Story Points por HU)</CardTitle>
        </CardHeader>
        <CardContent>
          {burndownData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="ideal" stroke="hsl(220, 14%, 70%)" fill="hsl(220, 14%, 95%)" strokeDasharray="5 5" name="Ideal" />
                <Area type="monotone" dataKey="real" stroke="hsl(173, 58%, 39%)" fill="hsl(173, 58%, 39%)" fillOpacity={0.15} name="Real" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>

      {/* Dev Performance Table */}
      {devWorkload.length > 0 && (
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
                    <th className="text-center py-2 font-medium">Horas Total</th>
                    <th className="text-center py-2 font-medium">Concluído</th>
                    <th className="text-center py-2 font-medium">Pendente</th>
                    <th className="text-center py-2 font-medium">Bugs</th>
                    <th className="text-center py-2 font-medium">Eficiência</th>
                  </tr>
                </thead>
                <tbody>
                  {devWorkload.map((dev) => (
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
  );
}

function KPICard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
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
    <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
      Sem dados para exibir
    </div>
  );
}
