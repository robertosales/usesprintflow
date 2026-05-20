import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Bug, ShieldCheck, Layers, Percent, Activity, Users2,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  activities: any[];
  developers: any[];
  hus: any[];
  lastCol: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critica: "#ef4444",
  alta:    "#f97316",
  media:   "#eab308",
  baixa:   "#3b82f6",
};

// ─── QualityKpiCard ───────────────────────────────────────────────────────────

function QualityKpiCard({
  icon: Icon, label, value, sub, accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "red" | "green" | "yellow" | "blue" | "neutral";
}) {
  const cfg = {
    red:     { bg: "bg-destructive/8",      border: "border-destructive/25",    icon: "text-destructive",   value: "text-destructive" },
    green:   { bg: "bg-emerald-500/8",       border: "border-emerald-500/25",    icon: "text-emerald-500",   value: "text-emerald-500" },
    yellow:  { bg: "bg-[#eab308]/8",         border: "border-[#eab308]/25",      icon: "text-[#eab308]",     value: "text-[#eab308]" },
    blue:    { bg: "bg-[#3b82f6]/8",         border: "border-[#3b82f6]/25",      icon: "text-[#3b82f6]",     value: "text-[#3b82f6]" },
    neutral: { bg: "",                        border: "border-border/60",         icon: "text-muted-foreground", value: "text-foreground" },
  }[accent ?? "neutral"];

  return (
    <div className={cn(
      "rounded-2xl border p-4 flex flex-col gap-3 transition-shadow hover:shadow-sm",
      cfg.bg, cfg.border,
    )}>
      <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", cfg.bg)}>
        <Icon className={cn("h-4.5 w-4.5", cfg.icon)} />
      </div>
      <div>
        <p className={cn("text-2xl font-bold leading-none", cfg.value)}>{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{sub}</p>}
      </div>
      <p className={cn("text-[10px] font-semibold uppercase tracking-wider mt-auto", cfg.icon)}>{label}</p>
    </div>
  );
}

// ─── SeverityCard ──────────────────────────────────────────────────────────────

function SeverityCard({
  label, total, open, closed, avgHours, color,
}: {
  label: string; total: number; open: number; closed: number; avgHours: number; color: string;
}) {
  const resolvePct = total > 0 ? Math.round((closed / total) * 100) : 0;

  return (
    <div
      className="rounded-2xl border-l-4 border border-border/50 bg-card p-4 space-y-3 hover:shadow-sm transition-shadow"
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-center justify-between">
        <Badge
          className="text-[11px] font-semibold px-2.5 py-0.5"
          style={{ backgroundColor: `${color}20`, color, borderColor: `${color}40` }}
          variant="outline"
        >
          {label}
        </Badge>
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>{total}</span>
      </div>

      {/* Barra de resolução */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{closed} resolvidos</span>
          <span>{resolvePct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${resolvePct}%`, backgroundColor: color }}
          />
        </div>
      </div>

      <div className="flex justify-between text-xs">
        <span className="flex items-center gap-1 text-destructive">
          <AlertCircle className="h-3 w-3" /> {open} abertos
        </span>
        <span className="text-muted-foreground font-mono">∅ {avgHours}h</span>
      </div>
    </div>
  );
}

// ─── ChartCard (re-usado) ───────────────────────────────────────────────────────

function ChartCard({
  icon: Icon, title, subtitle, children,
}: {
  icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="pb-2 flex-row items-start gap-3">
        <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ─── QualityPanel ──────────────────────────────────────────────────────────────

export function QualityPanel({ activities, developers, hus, lastCol }: Props) {
  const bugActs    = useMemo(() => activities.filter((a: any) => a.activity_type === "bug"), [activities]);
  const bugsOpen   = bugActs.filter((a: any) => !a.is_closed).length;
  const bugsClosed = bugActs.filter((a: any) => a.is_closed).length;
  const totalBugs  = bugActs.length;

  const completedHUs = hus.filter((h: any) => h.status === lastCol);

  const defectDensity = completedHUs.length > 0
    ? Math.round((totalBugs / completedHUs.length) * 100) / 100
    : 0;

  const escapedBugs = bugActs.filter((a: any) => {
    const hu = hus.find((h: any) => h.id === a.hu_id);
    return hu && hu.status === lastCol;
  }).length;
  const escapedDefectsRate = completedHUs.length > 0
    ? Math.round((escapedBugs / completedHUs.length) * 100)
    : 0;

  const severityStats = useMemo(() => {
    return ["critica", "alta", "media", "baixa"].map((priority) => {
      const pBugs = bugActs.filter((a: any) => {
        const hu = hus.find((h: any) => h.id === a.hu_id);
        return hu?.priority === priority;
      });
      const closed = pBugs.filter((a: any) => a.is_closed);
      const avgHours = closed.length > 0
        ? Math.round(closed.reduce((s: number, a: any) => {
            if (a.closed_at && a.created_at)
              return s + (new Date(a.closed_at).getTime() - new Date(a.created_at).getTime()) / 3600000;
            return s + Number(a.hours);
          }, 0) / closed.length)
        : 0;
      return {
        priority,
        label: priority.charAt(0).toUpperCase() + priority.slice(1),
        total: pBugs.length,
        open: pBugs.filter((a: any) => !a.is_closed).length,
        closed: closed.length,
        avgHours,
        color: SEVERITY_COLORS[priority] || "#94a3b8",
      };
    }).filter((s) => s.total > 0);
  }, [bugActs, hus]);

  const bugsByMember = developers.map((dev: any) => {
    const devBugs = bugActs.filter((a: any) => a.assignee_id === dev.id);
    return {
      name: dev.name.split(" ")[0],
      abertos:    devBugs.filter((a: any) => !a.is_closed).length,
      resolvidos: devBugs.filter((a: any) => a.is_closed).length,
    };
  }).filter((d) => d.abertos + d.resolvidos > 0);

  const statusPie = [
    { name: "Abertos",    value: bugsOpen,   color: "#ef4444" },
    { name: "Resolvidos", value: bugsClosed, color: "#22c55e" },
  ].filter((d) => d.value > 0);

  if (totalBugs === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-12 text-center">
        <ShieldCheck className="h-14 w-14 mx-auto mb-3 text-emerald-500 opacity-50" />
        <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-base">Nenhum bug registrado</p>
        <p className="text-sm text-muted-foreground mt-1">
          Crie atividades do tipo &quot;Bug&quot; para visualizar métricas de qualidade
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <QualityKpiCard icon={AlertCircle}  label="Bugs Abertos"     value={bugsOpen}   accent={bugsOpen > 0 ? "red" : "green"} />
        <QualityKpiCard icon={CheckCircle2} label="Bugs Resolvidos"  value={bugsClosed} accent="green" />
        <QualityKpiCard icon={Bug}          label="Total de Bugs"    value={totalBugs}  accent="neutral" />
        <QualityKpiCard
          icon={Percent}
          label="Escaped Defects"
          value={`${escapedDefectsRate}%`}
          sub="bugs pós-entrega / HUs"
          accent={escapedDefectsRate > 20 ? "red" : "green"}
        />
        <QualityKpiCard
          icon={Layers}
          label="Defect Density"
          value={defectDensity}
          sub="bugs / HU entregue"
          accent={defectDensity > 2 ? "yellow" : "neutral"}
        />
        <QualityKpiCard
          icon={Activity}
          label="Taxa de Resolução"
          value={totalBugs > 0 ? `${Math.round((bugsClosed / totalBugs) * 100)}%` : "0%"}
          sub="bugs resolvidos / total"
          accent={totalBugs > 0 && bugsClosed / totalBugs >= 0.8 ? "green" : "yellow"}
        />
      </div>

      {/* Severity Cards + Status Pie */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Severity Cards */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pl-1">Por Severidade</p>
          {severityStats.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {severityStats.map((s) => (
                <SeverityCard key={s.priority} {...s} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
              Sem dados de severidade
            </div>
          )}
        </div>

        {/* Status Donut */}
        <ChartCard icon={Bug} title="Status dos Bugs" subtitle="Abertos vs Resolvidos">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={statusPie} cx="50%" cy="50%"
                innerRadius={55} outerRadius={85}
                dataKey="value" paddingAngle={3}
                label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                labelLine={false}
              >
                {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Bugs por Membro */}
      {bugsByMember.length > 0 && (
        <ChartCard icon={Users2} title="Bugs por Membro" subtitle="Abertos vs Resolvidos por desenvolvedor">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={bugsByMember} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar dataKey="abertos"    fill="#ef4444" name="Abertos"    radius={[0, 0, 0, 0]} />
              <Bar dataKey="resolvidos" fill="#22c55e" name="Resolvidos" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}
