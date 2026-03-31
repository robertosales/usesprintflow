import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Area, AreaChart, ReferenceLine,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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

const STATUS_COLORS: Record<string, string> = {
  aguardando_desenvolvimento: "#94a3b8",
  em_desenvolvimento: "#3b82f6",
  em_code_review: "#8b5cf6",
  em_teste: "#f59e0b",
  bug: "#ef4444",
  pronto_para_publicacao: "#22c55e",
};

export function TeamPerformance({
  sprints, hus, activities, developers, impediments, lastCol,
  allSprints, allHUs, allActivities, statusData, hoursPerMemberData,
}: Props) {
  // Burndown chart data
  const burndownData = useMemo(() => {
    if (sprints.length === 0) return [];
    const sprint = sprints[0];
    const start = new Date(sprint.start_date);
    const end = new Date(sprint.end_date);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalHUs = hus.length;

    const closedByDay: Record<string, number> = {};
    hus.forEach((hu: any) => {
      if (hu.status === lastCol) {
        const closedActs = activities.filter((a: any) => a.hu_id === hu.id && a.is_closed);
        const closeDate = closedActs.length > 0
          ? closedActs.reduce((latest: string, a: any) => a.closed_at && a.closed_at > latest ? a.closed_at : latest, "")
          : hu.updated_at;
        if (closeDate) {
          const day = closeDate.split("T")[0];
          closedByDay[day] = (closedByDay[day] || 0) + 1;
        }
      }
    });

    const data = [];
    let cumClosed = 0;
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      const today = new Date().toISOString().split("T")[0];

      cumClosed += closedByDay[dateStr] || 0;
      const ideal = totalHUs - (totalHUs / (totalDays - 1)) * i;
      const remaining = totalHUs - cumClosed;

      const entry: any = {
        day: `D${i + 1}`,
        date: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        ideal: Math.max(0, Math.round(ideal * 10) / 10),
        closedToday: closedByDay[dateStr] || 0,
      };

      if (dateStr <= today) {
        entry.real = remaining;
      }

      data.push(entry);
    }
    return data;
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
      const sHUs = allHUs.filter((h: any) => h.sprint_id === sprint.id);
      const sHuIds = new Set(sHUs.map((h: any) => h.id));
      const sActs = allActivities.filter((a: any) => sHuIds.has(a.hu_id));
      const completed = sHUs.filter((h: any) => h.status === lastCol);
      const velocity = completed.reduce((s: number, h: any) => s + (h.story_points || 0), 0);
      const bugActs = sActs.filter((a: any) => a.activity_type === "bug");
      const bugsOpen = bugActs.filter((a: any) => !a.is_closed).length;
      const totalH = sActs.reduce((s: number, a: any) => s + Number(a.hours), 0);
      const closedH = sActs.filter((a: any) => a.is_closed).reduce((s: number, a: any) => s + Number(a.hours), 0);
      const eff = totalH > 0 ? Math.round((closedH / totalH) * 100) : 0;
      return { velocity, husEntregues: completed.length, bugsAbertos: bugsOpen, eficiencia: eff };
    };

    const prevM = getMetrics(prev);
    const currM = getMetrics(curr);

    return {
      prevName: prev.name,
      currName: curr.name,
      metrics: [
        { label: "Velocity (SP)", prev: prevM.velocity, curr: currM.velocity },
        { label: "HUs Entregues", prev: prevM.husEntregues, curr: currM.husEntregues },
        { label: "Bugs Abertos", prev: prevM.bugsAbertos, curr: currM.bugsAbertos, invertColor: true },
        { label: "Eficiência Média", prev: prevM.eficiencia, curr: currM.eficiencia, suffix: "%" },
      ],
    };
  }, [sprints, allSprints, allHUs, allActivities, lastCol]);

  return (
    <div className="space-y-4">
      {/* Burndown Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Burndown Chart — HUs Restantes</CardTitle>
        </CardHeader>
        <CardContent>
          {burndownData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-xl">
                        <p className="font-semibold mb-1">{d?.day} — {label}</p>
                        <p>Ideal: <span className="font-mono">{d?.ideal}</span></p>
                        {d?.real !== undefined && <p>Real: <span className="font-mono font-bold">{d?.real}</span></p>}
                        <p>Concluídas no dia: <span className="font-mono">{d?.closedToday}</span></p>
                        {d?.real !== undefined && d?.ideal !== undefined && (
                          <p className={d.real <= d.ideal ? "text-[#22c55e]" : "text-[#ef4444]"}>
                            Variação: {d.real <= d.ideal ? "✅ Abaixo" : "⚠️ Acima"} da ideal
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Area
                  type="monotone"
                  dataKey="ideal"
                  stroke="#94a3b8"
                  strokeDasharray="6 3"
                  fill="transparent"
                  name="Linha Ideal"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="real"
                  stroke="#3b82f6"
                  fill="#3b82f620"
                  name="Linha Real"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#3b82f6" }}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              Selecione uma sprint para ver o burndown
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">HUs por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ value }) => `${value}`} paddingAngle={2}>
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
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sprint Comparison */}
      {sprintComparison && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Comparativo com Sprint Anterior</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 font-medium">Métrica</th>
                    <th className="text-center py-2 font-medium">{sprintComparison.prevName}</th>
                    <th className="text-center py-2 font-medium">{sprintComparison.currName}</th>
                    <th className="text-center py-2 font-medium">Variação</th>
                  </tr>
                </thead>
                <tbody>
                  {sprintComparison.metrics.map((m) => {
                    const diff = m.prev > 0 ? Math.round(((m.curr - m.prev) / m.prev) * 100) : (m.curr > 0 ? 100 : 0);
                    const isGood = m.invertColor ? diff <= 0 : diff >= 0;
                    return (
                      <tr key={m.label} className="border-b last:border-0">
                        <td className="py-2 font-medium">{m.label}</td>
                        <td className="text-center py-2">{m.prev}{m.suffix || ""}</td>
                        <td className="text-center py-2 font-semibold">{m.curr}{m.suffix || ""}</td>
                        <td className="text-center py-2">
                          <span className={`inline-flex items-center gap-1 font-semibold ${isGood ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                            {diff > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : diff < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                            {diff > 0 ? "+" : ""}{diff}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
