import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Minus,
  Flame, BarChart3, Users2, GitCompareArrows,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { cn } from "@/lib/utils";

interface Props {
  sprints: any[];
  hus: any[];
  activities: any[];
  developers: any[];
  impediments: any[];
  lastCol: string;
  allSprints: any[];
  allHUs: any[];
  allActivities: any[];
  statusData: { name: string; value: number; color: string }[];
  hoursPerMemberData: { name: string; concluido: number; pendente: number }[];
}

// ─── Componente de cabeçalho de card padronizado ────────────────────────────────────

function ChartCard({
  icon: Icon,
  title,
  subtitle,
  children,
  className,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("rounded-2xl border-border/60", className)}>
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

// ─── Tooltip customizado para burndown ───────────────────────────────────────────

function BurndownTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-xl border bg-background px-4 py-3 text-xs shadow-xl space-y-1">
      <p className="font-bold text-foreground">{d?.day} — {label}</p>
      <p className="text-muted-foreground">Ideal: <span className="font-mono text-foreground">{d?.ideal}</span></p>
      {d?.real !== undefined && (
        <p className="text-muted-foreground">Real: <span className="font-mono font-bold text-foreground">{d?.real}</span></p>
      )}
      <p className="text-muted-foreground">Concluídas hoje: <span className="font-mono text-foreground">{d?.closedToday}</span></p>
      {d?.real !== undefined && d?.ideal !== undefined && (
        <p className={d.real <= d.ideal ? "text-emerald-500" : "text-destructive"}>
          {d.real <= d.ideal ? "✅ Abaixo da ideal" : "⚠️ Acima da ideal"}
        </p>
      )}
    </div>
  );
}

// ─── Sprint Comparison Cards ───────────────────────────────────────────────────

function ComparisonMetricCard({
  label, prev, curr, suffix, invertColor, prevName, currName,
}: {
  label: string;
  prev: number;
  curr: number;
  suffix?: string;
  invertColor?: boolean;
  prevName: string;
  currName: string;
}) {
  const diff = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0;
  const isGood = invertColor ? diff <= 0 : diff >= 0;
  const TrendIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const trendColor = isGood ? "text-emerald-500" : "text-destructive";
  const trendBg   = isGood ? "bg-emerald-500/10" : "bg-destructive/10";

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>

      <div className="flex items-end justify-between gap-4">
        {/* Anterior */}
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground truncate max-w-[80px]">{prevName}</p>
          <p className="text-xl font-bold text-muted-foreground tabular-nums">{prev}{suffix}</p>
        </div>

        {/* Variação */}
        <div className={cn("flex items-center gap-1 rounded-xl px-3 py-1.5", trendBg)}>
          <TrendIcon className={cn("h-4 w-4", trendColor)} />
          <span className={cn("text-sm font-bold tabular-nums", trendColor)}>
            {diff > 0 ? "+" : ""}{diff}%
          </span>
        </div>

        {/* Atual */}
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground truncate max-w-[80px]">{currName}</p>
          <p className="text-xl font-bold text-foreground tabular-nums">{curr}{suffix}</p>
        </div>
      </div>
    </div>
  );
}

// ─── TeamPerformance ─────────────────────────────────────────────────────────────

export function TeamPerformance({
  sprints, hus, activities, developers, impediments, lastCol,
  allSprints, allHUs, allActivities, statusData, hoursPerMemberData,
}: Props) {
  // Burndown
  const burndownData = useMemo(() => {
    if (sprints.length === 0) return [];
    const sprint = sprints[0];
    const start = new Date(sprint.start_date);
    const end   = new Date(sprint.end_date);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
    const totalHUs  = hus.length;

    const closedByDay: Record<string, number> = {};
    hus.forEach((hu: any) => {
      if (hu.status === lastCol) {
        const closedActs = activities.filter((a: any) => a.hu_id === hu.id && a.is_closed);
        const closeDate = closedActs.length > 0
          ? closedActs.reduce((latest: string, a: any) => a.closed_at && a.closed_at > latest ? a.closed_at : latest, "")
          : hu.updated_at;
        if (closeDate) closedByDay[closeDate.split("T")[0]] = (closedByDay[closeDate.split("T")[0]] || 0) + 1;
      }
    });

    const today = new Date().toISOString().split("T")[0];
    let cumClosed = 0;
    return Array.from({ length: totalDays }, (_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      cumClosed += closedByDay[dateStr] || 0;
      const ideal = Math.max(0, Math.round((totalHUs - (totalHUs / (totalDays - 1)) * i) * 10) / 10);
      const entry: any = {
        day: `D${i + 1}`,
        date: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        ideal,
        closedToday: closedByDay[dateStr] || 0,
      };
      if (dateStr <= today) entry.real = totalHUs - cumClosed;
      return entry;
    });
  }, [sprints, hus, activities, lastCol]);

  // Sprint comparison
  const sprintComparison = useMemo(() => {
    if (allSprints.length < 2 || sprints.length === 0) return null;
    const sorted = [...allSprints].sort((a, b) => a.start_date.localeCompare(b.start_date));
    const currentIdx = sorted.findIndex((s) => s.id === sprints[0].id);
    if (currentIdx <= 0) return null;
    const prev = sorted[currentIdx - 1];
    const curr = sorted[currentIdx];

    const getMetrics = (sprint: any) => {
      const sHUs  = allHUs.filter((h: any) => h.sprint_id === sprint.id);
      const sHuIds = new Set(sHUs.map((h: any) => h.id));
      const sActs  = allActivities.filter((a: any) => sHuIds.has(a.hu_id));
      const completed = sHUs.filter((h: any) => h.status === lastCol);
      const velocity  = completed.reduce((s: number, h: any) => s + (h.story_points || 0), 0);
      const bugsOpen  = sActs.filter((a: any) => a.activity_type === "bug" && !a.is_closed).length;
      const totalH    = sActs.reduce((s: number, a: any) => s + Number(a.hours), 0);
      const closedH   = sActs.filter((a: any) => a.is_closed).reduce((s: number, a: any) => s + Number(a.hours), 0);
      const eff = totalH > 0 ? Math.round((closedH / totalH) * 100) : 0;
      return { velocity, husEntregues: completed.length, bugsAbertos: bugsOpen, eficiencia: eff };
    };

    const prevM = getMetrics(prev);
    const currM = getMetrics(curr);

    return {
      prevName: prev.name,
      currName: curr.name,
      metrics: [
        { label: "Velocity (SP)",     prev: prevM.velocity,      curr: currM.velocity },
        { label: "HUs Entregues",     prev: prevM.husEntregues,  curr: currM.husEntregues },
        { label: "Bugs Abertos",      prev: prevM.bugsAbertos,   curr: currM.bugsAbertos,  invertColor: true },
        { label: "Eficiência Média",  prev: prevM.eficiencia,    curr: currM.eficiencia,   suffix: "%" },
      ],
    };
  }, [sprints, allSprints, allHUs, allActivities, lastCol]);

  return (
    <div className="space-y-4">
      {/* Burndown */}
      <ChartCard icon={Flame} title="Burndown Chart" subtitle="HUs restantes ao longo da sprint">
        {burndownData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={burndownData}>
              <defs>
                <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<BurndownTooltip />} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Area type="monotone" dataKey="ideal" stroke="#94a3b8" strokeDasharray="6 3"
                fill="transparent" name="Linha Ideal" strokeWidth={2} />
              <Area type="monotone" dataKey="real"  stroke="#3b82f6"
                fill="url(#realGrad)" name="Linha Real" strokeWidth={2.5}
                dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }} connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            Selecione uma sprint para ver o burndown
          </div>
        )}
      </ChartCard>

      {/* HUs por Status + Carga por membro */}
      <div className="grid md:grid-cols-2 gap-4">
        <ChartCard icon={BarChart3} title="HUs por Status" subtitle="Distribuição atual">
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={52} outerRadius={82}
                  dataKey="value" paddingAngle={2}
                  label={({ value }) => `${value}`} labelLine={false}
                >
                  {statusData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          )}
        </ChartCard>

        <ChartCard icon={Users2} title="Carga por Membro" subtitle="Horas concluídas vs pendentes">
          {hoursPerMemberData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hoursPerMemberData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="concluido" stackId="a" fill="#22c55e" name="Concluído" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pendente"  stackId="a" fill="#3b82f6" name="Pendente"  radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          )}
        </ChartCard>
      </div>

      {/* Comparativo de sprints */}
      {sprintComparison && (
        <ChartCard icon={GitCompareArrows} title="Comparativo com Sprint Anterior"
          subtitle={`${sprintComparison.prevName} → ${sprintComparison.currName}`}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {sprintComparison.metrics.map((m) => (
              <ComparisonMetricCard
                key={m.label}
                label={m.label}
                prev={m.prev}
                curr={m.curr}
                suffix={(m as any).suffix}
                invertColor={(m as any).invertColor}
                prevName={sprintComparison.prevName}
                currName={sprintComparison.currName}
              />
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
}
