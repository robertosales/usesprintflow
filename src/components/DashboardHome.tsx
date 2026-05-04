import { useMemo } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Zap,
  Users,
  ListTodo,
  ShieldAlert,
  Target,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Activity,
  CalendarDays,
  Flame,
  ArrowRight,
} from "lucide-react";
import { hasActiveImpediment } from "@/types/sprint";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function daysLabel(n: number) {
  if (n === 0) return "Último dia";
  if (n === 1) return "1 dia restante";
  return `${n} dias restantes`;
}

function urgencyColor(days: number) {
  if (days <= 1) return "text-destructive";
  if (days <= 3) return "text-warning";
  return "text-muted-foreground";
}

// Mini bar chart inline — últimos 4 sprints
function MiniBarChart({ values, maxVal }: { values: number[]; maxVal: number }) {
  const bars = values.slice(-6);
  const peak = Math.max(maxVal, ...bars, 1);
  return (
    <div className="flex items-end gap-1 h-10">
      {bars.map((v, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 rounded-sm transition-all",
            i === bars.length - 1 ? "bg-primary/70" : "bg-muted-foreground/20",
          )}
          style={{ height: `${Math.round((v / peak) * 100)}%`, minHeight: "4px" }}
          title={`${v} pts`}
        />
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconClass?: string;
  progress?: number; // 0-100
  alert?: boolean;
}

function KpiCard({ label, value, sub, icon: Icon, iconClass, progress, alert }: KpiCardProps) {
  return (
    <Card className={cn("overflow-hidden", alert && "border-warning/40")}>
      <CardContent className="p-4 pb-3">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs text-muted-foreground font-medium leading-none">{label}</p>
          <div className={cn("rounded-md p-1.5", alert ? "bg-warning/10" : "bg-muted/60")}>
            <Icon className={cn("h-3.5 w-3.5", iconClass ?? "text-muted-foreground", alert && "text-warning")} />
          </div>
        </div>
        <p className={cn("text-2xl font-bold tracking-tight tabular-nums", alert && "text-warning")}>{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1 leading-none">{sub}</p>}
        {progress !== undefined && (
          <div className="mt-3">
            <Progress value={progress} className="h-1" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
      <div className="rounded-full bg-muted/60 p-3">
        <Icon className="h-4 w-4 text-muted-foreground/50" />
      </div>
      <p className="text-xs text-muted-foreground max-w-[20ch]">{message}</p>
    </div>
  );
}

// ─── DashboardHome ────────────────────────────────────────────────────────────

export function DashboardHome() {
  const { activeSprint, userStories, activities, developers, sprints, workflowColumns, impediments } = useSprint();
  const { profile } = useAuth();

  const lastCol = workflowColumns[workflowColumns.length - 1]?.key;

  // ── Stats ──
  const stats = useMemo(() => {
    const sprintHUs = activeSprint ? userStories.filter((hu) => hu.sprintId === activeSprint.id) : [];
    const sprintActs = activeSprint ? activities.filter((a) => sprintHUs.some((hu) => hu.id === a.huId)) : [];
    const totalPoints = sprintHUs.reduce((s, hu) => s + hu.storyPoints, 0);
    const donePoints = sprintHUs.filter((hu) => hu.status === lastCol).reduce((s, hu) => s + hu.storyPoints, 0);
    const closedActs = sprintActs.filter((a) => a.isClosed);
    const activeImps = impediments.filter((i) => !i.resolvedAt);
    const totalHours = sprintActs.reduce((s, a) => s + a.hours, 0);

    let daysRemaining = 0;
    if (activeSprint) {
      const end = new Date(activeSprint.endDate);
      const now = new Date();
      daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Velocidade — últimos 6 sprints
    const pastSprints = sprints.filter((s) => !s.isActive).slice(-6);
    const velocities = pastSprints.map((s) => {
      const sHUs = userStories.filter((hu) => hu.sprintId === s.id && hu.status === lastCol);
      return sHUs.reduce((sum, hu) => sum + hu.storyPoints, 0);
    });
    const avgVelocity =
      velocities.length > 0 ? Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length) : 0;

    // Porcentagem de tarefas fechadas
    const actsProgress = sprintActs.length > 0 ? Math.round((closedActs.length / sprintActs.length) * 100) : 0;

    return {
      totalHUs: sprintHUs.length,
      totalPoints,
      donePoints,
      progressPct: totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0,
      totalActs: sprintActs.length,
      closedActs: closedActs.length,
      actsProgress,
      activeImps: activeImps.length,
      totalHours,
      daysRemaining,
      avgVelocity,
      teamSize: developers.length,
      velocities,
    };
  }, [activeSprint, userStories, activities, developers, sprints, workflowColumns, impediments, lastCol]);

  // ── Minhas tarefas ──
  const myTasks = useMemo(() => {
    if (!profile || !activeSprint) return [];
    const myDev = developers.find((d) => d.email === profile.email);
    if (!myDev) return [];
    const sprintHUs = userStories.filter((hu) => hu.sprintId === activeSprint.id);
    return activities
      .filter((a) => a.assigneeId === myDev.id && sprintHUs.some((hu) => hu.id === a.huId) && !a.isClosed)
      .slice(0, 6);
  }, [profile, activeSprint, developers, activities, userStories]);

  // ── Próximos prazos ──
  const upcomingDeadlines = useMemo(() => {
    if (!activeSprint) return [];
    const sprintHUs = userStories.filter((hu) => hu.sprintId === activeSprint.id);
    return activities
      .filter((a) => sprintHUs.some((hu) => hu.id === a.huId) && !a.isClosed)
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .slice(0, 6);
  }, [activeSprint, userStories, activities]);

  // ── Impedimentos ativos ──
  const activeImpediments = useMemo(() => impediments.filter((i) => !i.resolvedAt).slice(0, 5), [impediments]);

  // ── Atividade recente ──
  const recentActivity = useMemo(
    () =>
      activities
        .filter((a) => a.isClosed && a.closedAt)
        .sort((a, b) => (b.closedAt || "").localeCompare(a.closedAt || ""))
        .slice(0, 5),
    [activities],
  );

  const firstName = profile?.display_name?.split(" ")[0] || "Usuário";

  return (
    <div className="p-5 space-y-5 max-w-[1400px]">
      {/* ── Welcome ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Olá, {firstName}</h1>
          <p className="text-sm text-muted-foreground">
            {activeSprint
              ? `Sprint ativa: ${activeSprint.name} · ${daysLabel(stats.daysRemaining)}`
              : "Nenhuma sprint ativa no momento"}
          </p>
        </div>
        {activeSprint && (
          <Badge
            variant="outline"
            className={cn(
              "hidden sm:flex gap-1.5 px-3 py-1.5 text-xs font-semibold",
              stats.daysRemaining <= 2
                ? "border-destructive/40 text-destructive bg-destructive/5"
                : stats.daysRemaining <= 5
                  ? "border-warning/40 text-warning bg-warning/5"
                  : "border-primary/30 text-primary bg-primary/5",
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {daysLabel(stats.daysRemaining)}
          </Badge>
        )}
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="User Stories"
          value={stats.totalHUs}
          sub={activeSprint ? `Sprint ${activeSprint.name}` : "No sprint ativo"}
          icon={ListTodo}
          iconClass="text-info"
          progress={stats.progressPct}
        />
        <KpiCard
          label="Story Points"
          value={`${stats.donePoints}/${stats.totalPoints}`}
          sub={`${stats.progressPct}% concluído`}
          icon={Zap}
          iconClass="text-primary"
          progress={stats.progressPct}
        />
        <KpiCard
          label="Tarefas"
          value={`${stats.closedActs}/${stats.totalActs}`}
          sub={`${stats.actsProgress}% encerradas`}
          icon={CheckCircle2}
          iconClass="text-success"
          progress={stats.actsProgress}
        />
        <KpiCard
          label="Impedimentos"
          value={stats.activeImps}
          sub={stats.activeImps === 0 ? "Tudo ok" : "Requer atenção"}
          icon={ShieldAlert}
          iconClass="text-warning"
          alert={stats.activeImps > 0}
        />
      </div>

      {/* ── Sprint + Velocidade ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sprint Ativa — ocupa 2 colunas */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Sprint Ativa</h2>
            </div>

            {activeSprint ? (
              <div className="space-y-4">
                {/* Nome + datas */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm leading-tight">{activeSprint.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {formatDate(activeSprint.startDate)} → {formatDate(activeSprint.endDate)}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn("shrink-0 text-xs font-semibold", urgencyColor(stats.daysRemaining))}
                  >
                    {daysLabel(stats.daysRemaining)}
                  </Badge>
                </div>

                {/* Objetivo */}
                {activeSprint.goal && (
                  <div className="flex items-start gap-2 rounded-md bg-primary/5 border border-primary/10 px-3 py-2">
                    <Target className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{activeSprint.goal}</p>
                  </div>
                )}

                {/* Progresso de Story Points */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {stats.donePoints} / {stats.totalPoints} Story Points
                    </span>
                    <span className="font-semibold">{stats.progressPct}%</span>
                  </div>
                  <Progress value={stats.progressPct} className="h-2.5" />
                </div>

                {/* Distribuição por coluna */}
                {workflowColumns.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {workflowColumns.map((col) => {
                      const count = userStories.filter(
                        (hu) => hu.sprintId === activeSprint.id && hu.status === col.key,
                      ).length;
                      if (count === 0) return null;
                      return (
                        <div
                          key={col.key}
                          className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px]"
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: col.hex || "#94a3b8" }}
                          />
                          <span className="text-muted-foreground">{col.label}</span>
                          <span className="font-semibold ml-0.5">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <EmptyState icon={Zap} message="Nenhuma sprint ativa. Crie uma sprint para começar." />
            )}
          </CardContent>
        </Card>

        {/* Velocidade */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Velocidade</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums">{stats.avgVelocity}</span>
                <span className="text-xs text-muted-foreground">pts/sprint</span>
              </div>
              <p className="text-xs text-muted-foreground">Média das últimas sprints</p>

              {/* Mini bar chart */}
              {stats.velocities.length > 0 && (
                <MiniBarChart values={stats.velocities} maxVal={stats.avgVelocity * 1.5} />
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-md bg-muted/50 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground leading-none mb-1">Horas est.</p>
                  <p className="text-sm font-semibold tabular-nums">{stats.totalHours}h</p>
                </div>
                <div className="rounded-md bg-muted/50 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground leading-none mb-1">Equipe</p>
                  <p className="text-sm font-semibold tabular-nums">{stats.teamSize}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Linha inferior: 3 colunas ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Impedimentos */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-warning" />
                <h2 className="text-sm font-semibold">Impedimentos</h2>
              </div>
              {activeImpediments.length > 0 && (
                <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                  {activeImpediments.length}
                </Badge>
              )}
            </div>

            {activeImpediments.length === 0 ? (
              <div className="flex items-center gap-2 py-4 px-3 rounded-md bg-success/5 border border-success/15">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <p className="text-xs text-success font-medium">Sem impedimentos ativos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeImpediments.map((imp) => {
                  const hu = userStories.find((h) => h.id === (imp as any).huId);
                  return (
                    <div
                      key={imp.id}
                      className="flex items-start gap-2 text-xs bg-warning/5 rounded-md p-2.5 border border-warning/15"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-medium leading-snug line-clamp-2">{imp.reason}</p>
                        {hu && (
                          <span className="text-[10px] text-muted-foreground font-mono mt-0.5 block">
                            {(hu as any).code}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Minhas Tarefas */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-info" />
              <h2 className="text-sm font-semibold">Minhas Tarefas</h2>
            </div>

            {myTasks.length === 0 ? (
              <EmptyState icon={ListTodo} message="Nenhuma tarefa pendente atribuída a você" />
            ) : (
              <div className="space-y-1.5">
                {myTasks.map((task) => {
                  const hu = userStories.find((h) => h.id === task.huId);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-2 text-xs hover:bg-muted/70 transition-colors"
                    >
                      {hu && (
                        <span className="font-mono text-[10px] text-muted-foreground shrink-0 w-16 truncate">
                          {(hu as any).code}
                        </span>
                      )}
                      <span className="flex-1 truncate">{task.title}</span>
                      <span className="text-muted-foreground shrink-0 tabular-nums">{task.hours}h</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos Prazos */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-destructive" />
              <h2 className="text-sm font-semibold">Próximos Prazos</h2>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <EmptyState icon={CalendarDays} message="Sem prazos próximos no sprint atual" />
            ) : (
              <div className="space-y-1.5">
                {upcomingDeadlines.map((act) => {
                  const hu = userStories.find((h) => h.id === act.huId);
                  const dev = developers.find((d) => d.id === act.assigneeId);
                  const isOverdue = act.endDate < new Date().toISOString().split("T")[0];
                  return (
                    <div
                      key={act.id}
                      className={cn(
                        "flex items-center gap-2 text-xs rounded-md px-2.5 py-2",
                        isOverdue ? "bg-destructive/5 border border-destructive/15" : "bg-muted/40",
                      )}
                    >
                      {hu && (
                        <span className="font-mono text-[10px] text-muted-foreground shrink-0 w-16 truncate">
                          {(hu as any).code}
                        </span>
                      )}
                      <span className="flex-1 truncate">{act.title}</span>
                      <span
                        className={cn(
                          "shrink-0 tabular-nums font-medium",
                          isOverdue ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {formatDate(act.endDate)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Atividade Recente ────────────────────────────────────── */}
      {recentActivity.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <h2 className="text-sm font-semibold">Concluído Recentemente</h2>
            </div>
            <div className="space-y-1.5">
              {recentActivity.map((act) => {
                const hu = userStories.find((h) => h.id === act.huId);
                const dev = developers.find((d) => d.id === act.assigneeId);
                return (
                  <div
                    key={act.id}
                    className="flex items-center gap-2.5 text-xs rounded-md bg-success/5 border border-success/10 px-3 py-2"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    {hu && (
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0">{(hu as any).code}</span>
                    )}
                    <span className="flex-1 truncate">{act.title}</span>
                    {dev && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                            {dev.name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-muted-foreground hidden sm:block">{dev.name.split(" ")[0]}</span>
                      </div>
                    )}
                    {act.closedAt && <span className="text-muted-foreground shrink-0">{formatDate(act.closedAt)}</span>}
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
