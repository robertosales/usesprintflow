// src/components/DashboardHome.tsx
import { useSprint } from "@/contexts/SprintContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Zap,
  BookOpen,
  Bug,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  Circle,
  ArrowRight,
  Users,
  Calendar,
  Target,
  Activity,
} from "lucide-react";
import { differenceInDays, format, isAfter, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── KPI Card ──────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconClass?: string;
  progress?: number;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
}

function KpiCard({ label, value, sub, icon: Icon, iconClass, progress, trend, trendLabel }: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums leading-none">{value}</p>
            {sub && <p className="mt-1 text-xs text-muted-foreground truncate">{sub}</p>}
            {trendLabel && (
              <p
                className={cn(
                  "mt-1 text-xs font-medium",
                  trend === "up" && "text-green-600 dark:text-green-400",
                  trend === "down" && "text-red-500 dark:text-red-400",
                  trend === "neutral" && "text-muted-foreground",
                )}
              >
                {trendLabel}
              </p>
            )}
          </div>
          <div className={cn("shrink-0 rounded-lg p-2", iconClass || "bg-primary/10 text-primary")}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {progress !== undefined && (
          <div className="mt-3">
            <Progress value={progress} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Sprint Progress Bar ───────────────────────────────────────────────────────
function SprintProgressBar({
  sprint,
}: {
  sprint: { startDate: string; endDate: string; name: string; goal?: string };
}) {
  const today = new Date();
  const start = parseISO(sprint.startDate);
  const end = parseISO(sprint.endDate);
  const total = differenceInDays(end, start) || 1;
  const elapsed = Math.max(0, Math.min(total, differenceInDays(today, start)));
  const pct = Math.round((elapsed / total) * 100);
  const daysLeft = Math.max(0, differenceInDays(end, today));
  const isOver = isAfter(today, end);

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">{sprint.name}</CardTitle>
            <Badge variant={isOver ? "destructive" : "secondary"} className="text-xs">
              {isOver ? "Encerrado" : `${daysLeft}d restantes`}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {format(start, "dd MMM", { locale: ptBR })} → {format(end, "dd MMM yyyy", { locale: ptBR })}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {sprint.goal && <p className="text-xs text-muted-foreground mb-3 italic">"{sprint.goal}"</p>}
        <div className="relative">
          <Progress value={pct} className="h-2" />
          <span
            className="absolute -top-5 text-[10px] font-semibold text-primary"
            style={{ left: `${Math.min(pct, 94)}%` }}
          >
            {pct}%
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Dia {elapsed} de {total} — sprint {pct >= 100 ? "concluído" : "em andamento"}
        </p>
      </CardContent>
    </Card>
  );
}

// ── Recent HUs ────────────────────────────────────────────────────────────────
const PRIORITY_COLOR: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-400",
  medium: "bg-yellow-400",
  low: "bg-green-400",
};

// ── Main Component ─────────────────────────────────────────────────────────────
export function DashboardHome() {
  const { userStories, activities, developers, activeSprint, sprints, workflowColumns } = useSprint();
  const { profile } = useAuth();

  // ── KPI Calculations ────────────────────────────────────────────────────────
  const sprintHUs = activeSprint ? userStories.filter((h) => h.sprintId === activeSprint.id) : userStories;

  const lastCol = workflowColumns[workflowColumns.length - 1]?.key;
  const doneHUs = sprintHUs.filter((h) => h.status === lastCol);
  const openHUs = sprintHUs.filter((h) => h.status !== lastCol);
  const bugHUs = sprintHUs.filter((h) => h.status === "bug");
  const blockedHUs = sprintHUs.filter((h) => h.impediments && h.impediments.some((i) => !i.resolvedAt));

  const totalPoints = sprintHUs.reduce((s, h) => s + (h.storyPoints || 0), 0);
  const donePoints = doneHUs.reduce((s, h) => s + (h.storyPoints || 0), 0);
  const completionPct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

  const openActs = activities.filter((a) => !a.isClosed);
  const totalHours = activities.reduce((s, a) => s + (a.hours || 0), 0);

  // ── Recent HUs (últimas 5 abertas) ─────────────────────────────────────────
  const recentHUs = [...openHUs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  const firstName = (profile?.full_name ?? profile?.email?.split("@")[0] ?? "Dev").split(" ")[0];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1400px] mx-auto">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            {greeting()}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeSprint ? `Sprint ativo: ${activeSprint.name}` : "Nenhum sprint ativo — crie um na aba Sprints"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </div>
      </div>

      {/* ── Sprint Progress ───────────────────────────────────────────────── */}
      {activeSprint && (
        <div className="grid grid-cols-1">
          <SprintProgressBar sprint={activeSprint} />
        </div>
      )}

      {/* ── KPI Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="HUs Concluídas"
          value={`${doneHUs.length}/${sprintHUs.length}`}
          sub={`${donePoints} de ${totalPoints} pts`}
          icon={CheckCircle2}
          iconClass="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          progress={completionPct}
          trend="up"
          trendLabel={`${completionPct}% concluído`}
        />
        <KpiCard
          label="Em Andamento"
          value={openHUs.length}
          sub={`${openActs.length} atividades abertas`}
          icon={Activity}
          iconClass="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          trend="neutral"
        />
        <KpiCard
          label="Bugs Abertos"
          value={bugHUs.length}
          sub={bugHUs.length > 0 ? "requer atenção" : "sem bugs ativos"}
          icon={Bug}
          iconClass={
            bugHUs.length > 0
              ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              : "bg-muted text-muted-foreground"
          }
          trend={bugHUs.length > 0 ? "down" : "neutral"}
        />
        <KpiCard
          label="Impedimentos"
          value={blockedHUs.length}
          sub={blockedHUs.length > 0 ? "HUs bloqueadas" : "sem bloqueios"}
          icon={AlertTriangle}
          iconClass={
            blockedHUs.length > 0
              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500"
              : "bg-muted text-muted-foreground"
          }
          trend={blockedHUs.length > 0 ? "down" : "neutral"}
        />
      </div>

      {/* ── Linha 2: Equipe + HUs Recentes ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* HUs Recentes */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              HUs em Aberto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentHUs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <p className="text-sm font-medium text-foreground">Tudo concluído!</p>
                <p className="text-xs">Todas as HUs do sprint estão finalizadas.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recentHUs.map((hu) => {
                  const col = workflowColumns.find((c) => c.key === hu.status);
                  return (
                    <li key={hu.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors">
                      <span
                        className={cn("shrink-0 h-2 w-2 rounded-full", PRIORITY_COLOR[hu.priority] || "bg-muted")}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{hu.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {hu.code} · {hu.storyPoints || 0}pts
                        </p>
                      </div>
                      {col && (
                        <Badge
                          variant="outline"
                          className="text-xs shrink-0 hidden sm:inline-flex"
                          style={{
                            borderColor: (col as any).hex || "#94a3b8",
                            color: (col as any).hex || "#94a3b8",
                          }}
                        >
                          {col.label}
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Equipe */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Equipe ({developers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {developers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-1">
                <Users className="h-6 w-6" />
                <p className="text-xs">Nenhum dev cadastrado</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {developers.slice(0, 6).map((dev) => {
                  const myActs = activities.filter((a) => a.assigneeId === dev.id && !a.isClosed).length;
                  return (
                    <li key={dev.id} className="flex items-center gap-3 px-5 py-2.5">
                      <div className="shrink-0 h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                        {dev.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{dev.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{dev.role}</p>
                      </div>
                      {myActs > 0 && (
                        <Badge variant="secondary" className="text-xs tabular-nums">
                          {myActs}
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Linha 3: Stats adicionais ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total de Sprints"
          value={sprints.length}
          sub={`${sprints.filter((s) => s.isActive).length} ativo`}
          icon={Zap}
          iconClass="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
        />
        <KpiCard
          label="Horas Registradas"
          value={`${totalHours.toFixed(0)}h`}
          sub={`${activities.length} atividades total`}
          icon={Clock}
          iconClass="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
        />
        <KpiCard
          label="Devs na Equipe"
          value={developers.length}
          sub="membros ativos"
          icon={Users}
          iconClass="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
        />
        <KpiCard
          label="Velocity"
          value={`${donePoints}pts`}
          sub={`meta: ${totalPoints}pts`}
          icon={TrendingUp}
          iconClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          progress={completionPct}
        />
      </div>
    </div>
  );
}
