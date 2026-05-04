import { useMemo } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  TrendingUp, Users, Zap, Clock, CheckCircle2,
  BarChart3, Target, Award,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────────

function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

// ── Burndown Row ───────────────────────────────────────────────────────────────

interface BurndownRowProps {
  label: string;
  done: number;
  total: number;
  color?: string;
}

function BurndownRow({ label, done, total, color = "bg-primary" }: BurndownRowProps) {
  const p = pct(done, total);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground truncate max-w-[160px]">{label}</span>
        <span className="text-muted-foreground tabular-nums">{done}/{total} pts</span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${p}%` }}
        />
      </div>
      <p className="text-right text-[10px] text-muted-foreground">{p}%</p>
    </div>
  );
}

// ── Developer Card ─────────────────────────────────────────────────────────────

interface DevStatProps {
  name: string;
  role: string;
  donePoints: number;
  totalPoints: number;
  openActivities: number;
  closedActivities: number;
  hours: number;
  rank: number;
}

function DevCard({ name, role, donePoints, totalPoints, openActivities, closedActivities, hours, rank }: DevStatProps) {
  const p = pct(donePoints, totalPoints);
  const rankColors = ["text-yellow-500", "text-slate-400", "text-amber-600"];

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 rounded-lg transition-colors">
      <div className="relative shrink-0">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {rank <= 3 && (
          <Award className={cn("h-3.5 w-3.5 absolute -top-1 -right-1", rankColors[rank - 1] || "text-muted-foreground")} />
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold truncate">{name}</p>
          <span className="text-xs text-muted-foreground tabular-nums">{donePoints}pts</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{role}</p>
        <Progress value={p} className="h-1" />
      </div>
      <div className="shrink-0 text-right space-y-0.5">
        <p className="text-xs font-medium tabular-nums">{hours.toFixed(0)}h</p>
        <p className="text-[10px] text-muted-foreground">{closedActivities} ativs.</p>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function ProductivityReport() {
  const { userStories, activities, developers, activeSprint, sprints, workflowColumns } = useSprint();

  const lastColKey = workflowColumns[workflowColumns.length - 1]?.key;

  // ── Dados do sprint ativo (ou tudo se não há sprint ativo)
  const sprintHUs = useMemo(
    () => (activeSprint ? userStories.filter((h) => h.sprintId === activeSprint.id) : userStories),
    [userStories, activeSprint],
  );

  const doneHUs = sprintHUs.filter((h) => h.status === lastColKey);
  const totalPoints = sprintHUs.reduce((s, h) => s + (h.storyPoints || 0), 0);
  const donePoints = doneHUs.reduce((s, h) => s + (h.storyPoints || 0), 0);
  const completionPct = pct(donePoints, totalPoints);

  // ── Velocity por sprint (últimos 5)
  const lastSprints = useMemo(() => {
    return [...sprints]
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(-5)
      .map((s) => {
        const sus = userStories.filter((h) => h.sprintId === s.id);
        const done = sus.filter((h) => h.status === lastColKey).reduce((acc, h) => acc + (h.storyPoints || 0), 0);
        const total = sus.reduce((acc, h) => acc + (h.storyPoints || 0), 0);
        return { name: s.name, done, total };
      });
  }, [sprints, userStories, lastColKey]);

  // ── Stats por dev
  const devStats = useMemo(() => {
    return developers
      .map((dev) => {
        const devActs = activities.filter((a) => a.assigneeId === dev.id);
        const closedActs = devActs.filter((a) => a.isClosed);
        const openActs = devActs.filter((a) => !a.isClosed);
        const hours = devActs.reduce((s, a) => s + (a.hours || 0), 0);

        // pontos das HUs cujas atividades este dev fechou no sprint atual
        const devHUIds = new Set(closedActs.map((a) => a.userStoryId).filter(Boolean));
        const devDonePoints = doneHUs
          .filter((h) => devHUIds.has(h.id))
          .reduce((s, h) => s + (h.storyPoints || 0), 0);

        return {
          id: dev.id,
          name: dev.name,
          role: dev.role || "Dev",
          donePoints: devDonePoints,
          totalPoints,
          openActivities: openActs.length,
          closedActivities: closedActs.length,
          hours,
        };
      })
      .sort((a, b) => b.donePoints - a.donePoints || b.hours - a.hours);
  }, [developers, activities, doneHUs, totalPoints]);

  const totalHours = activities.reduce((s, a) => s + (a.hours || 0), 0);
  const avgVelocity =
    lastSprints.length > 0
      ? Math.round(lastSprints.reduce((s, sp) => s + sp.done, 0) / lastSprints.length)
      : 0;

  // ── Cores para barras dos devs
  const devColors = [
    "bg-primary", "bg-violet-500", "bg-cyan-500",
    "bg-amber-500", "bg-rose-500", "bg-emerald-500",
  ];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Relatório de Produtividade
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {activeSprint ? `Sprint: ${activeSprint.name}` : "Visão geral — todos os sprints"}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Story Points Entregues",
            value: `${donePoints}/${totalPoints}`,
            sub: `${completionPct}% concluído`,
            icon: Target,
            cls: "bg-primary/10 text-primary",
          },
          {
            label: "Velocity Médio",
            value: `${avgVelocity}pts`,
            sub: `últimos ${lastSprints.length} sprints`,
            icon: Zap,
            cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
          },
          {
            label: "Horas Registradas",
            value: `${totalHours.toFixed(0)}h`,
            sub: `${activities.length} atividades`,
            icon: Clock,
            cls: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
          },
          {
            label: "HUs Concluídas",
            value: `${doneHUs.length}/${sprintHUs.length}`,
            sub: `${sprintHUs.length - doneHUs.length} em aberto`,
            icon: CheckCircle2,
            cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
          },
        ].map(({ label, value, sub, icon: Icon, cls }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums leading-none">{value}</p>
                  <p className="mt-1 