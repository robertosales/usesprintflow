import { useSprint } from "@/contexts/SprintContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, Users, Activity, Target, Gauge, CheckCircle } from "lucide-react";
import { KANBAN_COLUMNS } from "@/types/sprint";

const PIE_COLORS = ["#64748b", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#22c55e"];

export function MetricsDashboard() {
  const { activities, userStories, developers, activeSprint } = useSprint();

  const sprintStories = activeSprint
    ? userStories.filter((hu) => hu.sprintId === activeSprint.id)
    : [];
  const sprintActivities = activities.filter((a) =>
    sprintStories.some((hu) => hu.id === a.huId)
  );

  // Metrics
  const totalPoints = sprintStories.reduce((s, hu) => s + hu.storyPoints, 0);
  const completedActivities = sprintActivities.filter((a) => a.status === "pronto_para_publicacao");
  const completedHUs = sprintStories.filter((hu) => {
    const huActs = sprintActivities.filter((a) => a.huId === hu.id);
    return huActs.length > 0 && huActs.every((a) => a.status === "pronto_para_publicacao");
  });
  const completedPoints = completedHUs.reduce((s, hu) => s + hu.storyPoints, 0);
  const totalHours = sprintActivities.reduce((s, a) => s + a.hours, 0);
  const completedHours = completedActivities.reduce((s, a) => s + a.hours, 0);

  // Velocity = completed points
  const velocity = completedPoints;

  // Capacity = total hours available (devs * 8h * sprint days)
  let sprintDays = 10;
  if (activeSprint) {
    const start = new Date(activeSprint.startDate);
    const end = new Date(activeSprint.endDate);
    sprintDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }
  const totalCapacity = developers.length * 8 * sprintDays;
  const usedCapacity = totalHours;
  const capacityPercent = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;

  // Status distribution for pie chart
  const statusData = KANBAN_COLUMNS.map((col, i) => ({
    name: col.label,
    value: sprintActivities.filter((a) => a.status === col.key).length,
    color: PIE_COLORS[i],
  })).filter((d) => d.value > 0);

  // Dev workload
  const devWorkload = developers.map((dev) => {
    const devActs = sprintActivities.filter((a) => a.assigneeId === dev.id);
    const done = devActs.filter((a) => a.status === "pronto_para_publicacao").reduce((s, a) => s + a.hours, 0);
    const total = devActs.reduce((s, a) => s + a.hours, 0);
    return { name: dev.name.split(" ")[0], total, done, pending: total - done };
  });

  const completionRate = sprintActivities.length > 0
    ? Math.round((completedActivities.length / sprintActivities.length) * 100)
    : 0;

  if (!activeSprint) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          Selecione uma Sprint ativa para ver as métricas
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Métricas do Sprint</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{velocity}</p>
            <p className="text-xs text-muted-foreground">Velocity (pts)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{totalPoints}</p>
            <p className="text-xs text-muted-foreground">Total Points</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Gauge className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{capacityPercent}%</p>
            <p className="text-xs text-muted-foreground">Capacidade</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{completionRate}%</p>
            <p className="text-xs text-muted-foreground">Conclusão</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{completedActivities.length}/{sprintActivities.length}</p>
            <p className="text-xs text-muted-foreground">Atividades</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{developers.length}</p>
            <p className="text-xs text-muted-foreground">Devs</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${value}`}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Carga por Desenvolvedor (horas)</CardTitle>
          </CardHeader>
          <CardContent>
            {devWorkload.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={devWorkload}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="done" stackId="a" fill="hsl(142, 71%, 40%)" name="Concluído" />
                  <Bar dataKey="pending" stackId="a" fill="hsl(210, 92%, 55%)" name="Pendente" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
