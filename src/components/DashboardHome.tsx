import { useMemo } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Zap, Users, ListTodo, ShieldAlert, Target, Clock,
  TrendingUp, AlertTriangle, CheckCircle2, BarChart3,
} from "lucide-react";
import { hasActiveImpediment } from "@/types/sprint";

export function DashboardHome() {
  const { activeSprint, userStories, activities, developers, sprints, workflowColumns, impediments, epics } = useSprint();
  const { profile } = useAuth();

  const lastCol = workflowColumns[workflowColumns.length - 1]?.key;

  const stats = useMemo(() => {
    const sprintHUs = activeSprint ? userStories.filter((hu) => hu.sprintId === activeSprint.id) : [];
    const sprintActs = activeSprint
      ? activities.filter((a) => sprintHUs.some((hu) => hu.id === a.huId))
      : [];
    const totalPoints = sprintHUs.reduce((s, hu) => s + hu.storyPoints, 0);
    const donePoints = sprintHUs.filter((hu) => hu.status === lastCol).reduce((s, hu) => s + hu.storyPoints, 0);
    const blockedHUs = sprintHUs.filter(hasActiveImpediment);
    const closedActs = sprintActs.filter((a) => a.isClosed);
    const activeImps = impediments.filter((i) => !i.resolvedAt);
    const totalHours = sprintActs.reduce((s, a) => s + a.hours, 0);

    // Days remaining
    let daysRemaining = 0;
    if (activeSprint) {
      const end = new Date(activeSprint.endDate);
      const now = new Date();
      daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Velocity (completed points from last 3 sprints)
    const pastSprints = sprints.filter((s) => !s.isActive).slice(-3);
    const velocities = pastSprints.map((s) => {
      const sHUs = userStories.filter((hu) => hu.sprintId === s.id && hu.status === lastCol);
      return sHUs.reduce((sum, hu) => sum + hu.storyPoints, 0);
    });
    const avgVelocity = velocities.length > 0 ? Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length) : 0;

    return {
      totalHUs: sprintHUs.length,
      totalPoints,
      donePoints,
      progressPct: totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0,
      blockedCount: blockedHUs.length,
      totalActs: sprintActs.length,
      closedActs: closedActs.length,
      activeImps: activeImps.length,
      totalHours,
      daysRemaining,
      avgVelocity,
      teamSize: developers.length,
    };
  }, [activeSprint, userStories, activities, developers, sprints, workflowColumns, impediments, lastCol]);

  // My tasks (based on profile email matching a developer)
  const myTasks = useMemo(() => {
    if (!profile || !activeSprint) return [];
    const myDev = developers.find((d) => d.email === profile.email);
    if (!myDev) return [];
    const sprintHUs = userStories.filter((hu) => hu.sprintId === activeSprint.id);
    return activities
      .filter((a) => a.assigneeId === myDev.id && sprintHUs.some((hu) => hu.id === a.huId) && !a.isClosed)
      .slice(0, 5);
  }, [profile, activeSprint, developers, activities, userStories]);

  // Upcoming deadlines
  const upcomingDeadlines = useMemo(() => {
    if (!activeSprint) return [];
    const sprintHUs = userStories.filter((hu) => hu.sprintId === activeSprint.id);
    const acts = activities
      .filter((a) => sprintHUs.some((hu) => hu.id === a.huId) && !a.isClosed)
      .sort((a, b) => a.endDate.localeCompare(b.endDate));
    return acts.slice(0, 5);
  }, [activeSprint, userStories, activities]);

  // Recent activity
  const recentActivity = useMemo(() => {
    return activities
      .filter((a) => a.isClosed && a.closedAt)
      .sort((a, b) => (b.closedAt || "").localeCompare(a.closedAt || ""))
      .slice(0, 5);
  }, [activities]);

  const kpiCards = [
    { label: "User Stories", value: stats.totalHUs, icon: ListTodo, color: "text-info" },
    { label: "Equipe", value: stats.teamSize, icon: Users, color: "text-accent" },
    { label: "Tarefas Concluídas", value: `${stats.closedActs}/${stats.totalActs}`, icon: CheckCircle2, color: "text-success" },
    { label: "Impedimentos Ativos", value: stats.activeImps, icon: ShieldAlert, color: stats.activeImps > 0 ? "text-warning" : "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">
          Olá, {profile?.display_name?.split(" ")[0] || "Usuário"} 👋
        </h2>
        <p className="text-sm text-muted-foreground">
          Visão geral do seu projeto e sprint ativa
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                </div>
                <kpi.icon className={`h-8 w-8 ${kpi.color} opacity-50`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sprint Progress + Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sprint progress */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Sprint Ativa</h3>
            </div>
            {activeSprint ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{activeSprint.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {stats.daysRemaining} dia{stats.daysRemaining !== 1 ? "s" : ""} restante{stats.daysRemaining !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(activeSprint.startDate).toLocaleDateString("pt-BR")} — {new Date(activeSprint.endDate).toLocaleDateString("pt-BR")}
                </div>
                {activeSprint.goal && (
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Target className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{activeSprint.goal}</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{stats.donePoints}/{stats.totalPoints} Story Points</span>
                    <span className="font-semibold">{stats.progressPct}%</span>
                  </div>
                  <Progress value={stats.progressPct} className="h-2" />
                </div>
                {/* Status breakdown */}
                <div className="flex gap-2 flex-wrap pt-1">
                  {workflowColumns.map((col) => {
                    const count = userStories.filter(
                      (hu) => activeSprint && hu.sprintId === activeSprint.id && hu.status === col.key
                    ).length;
                    if (count === 0) return null;
                    return (
                      <Badge key={col.key} variant="secondary" className="text-[10px] gap-1">
                        <div className={`h-1.5 w-1.5 rounded-full ${col.dotColor}`} />
                        {col.label}: {count}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma sprint ativa</p>
            )}
          </CardContent>
        </Card>

        {/* Velocity */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Velocidade</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{stats.avgVelocity}</span>
                <span className="text-xs text-muted-foreground">pts/sprint (média)</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Sprint atual: {stats.donePoints} pts concluídos de {stats.totalPoints}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {stats.totalHours}h estimadas</span>
                <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" /> {stats.totalHUs} HUs</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Zones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Impediments */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="h-4 w-4 text-warning" />
              <h3 className="font-semibold text-sm">Impedimentos Ativos</h3>
            </div>
            {impediments.filter((i) => !i.resolvedAt).length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum impedimento ativo 🎉</p>
            ) : (
              <div className="space-y-2">
                {impediments.filter((i) => !i.resolvedAt).slice(0, 4).map((imp) => {
                  const hu = userStories.find((h) => h.id === (imp as any).huId);
                  return (
                    <div key={imp.id} className="flex items-start gap-2 text-xs bg-warning/5 rounded p-2 border border-warning/10">
                      <AlertTriangle className="h-3 w-3 text-warning shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium line-clamp-1">{imp.reason}</span>
                        {hu && <span className="text-muted-foreground block">{(hu as any).code}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Tasks */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ListTodo className="h-4 w-4 text-info" />
              <h3 className="font-semibold text-sm">Minhas Tarefas</h3>
            </div>
            {myTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma tarefa pendente</p>
            ) : (
              <div className="space-y-2">
                {myTasks.map((task) => {
                  const hu = userStories.find((h) => h.id === task.huId);
                  return (
                    <div key={task.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded p-2">
                      <Badge variant="outline" className="text-[9px] px-1 font-mono">{hu?.code}</Badge>
                      <span className="flex-1 truncate">{task.title}</span>
                      <span className="text-muted-foreground shrink-0">{task.hours}h</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-destructive" />
              <h3 className="font-semibold text-sm">Próximos Prazos</h3>
            </div>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem prazos próximos</p>
            ) : (
              <div className="space-y-2">
                {upcomingDeadlines.map((act) => {
                  const hu = userStories.find((h) => h.id === act.huId);
                  const dev = developers.find((d) => d.id === act.assigneeId);
                  const isOverdue = act.endDate < new Date().toISOString().split("T")[0];
                  return (
                    <div key={act.id} className={`flex items-center gap-2 text-xs rounded p-2 ${isOverdue ? "bg-destructive/5 border border-destructive/10" : "bg-muted/50"}`}>
                      <Badge variant="outline" className="text-[9px] px-1 font-mono">{hu?.code}</Badge>
                      <span className="flex-1 truncate">{act.title}</span>
                      <span className={`shrink-0 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {new Date(act.endDate).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <h3 className="font-semibold text-sm">Atividade Recente</h3>
            </div>
            <div className="space-y-2">
              {recentActivity.map((act) => {
                const hu = userStories.find((h) => h.id === act.huId);
                const dev = developers.find((d) => d.id === act.assigneeId);
                return (
                  <div key={act.id} className="flex items-center gap-2 text-xs bg-success/5 rounded p-2 border border-success/10">
                    <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                    <Badge variant="outline" className="text-[9px] px-1 font-mono">{hu?.code}</Badge>
                    <span className="flex-1 truncate">{act.title}</span>
                    <span className="text-muted-foreground shrink-0">{dev?.name}</span>
                    {act.closedAt && (
                      <span className="text-muted-foreground shrink-0">
                        {new Date(act.closedAt).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
