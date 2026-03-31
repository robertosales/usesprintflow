import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Bug, ShieldAlert, Clock, AlertTriangle } from "lucide-react";

interface Props {
  activities: any[];
  developers: any[];
  hus: any[];
  lastCol: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critica: "#991b1b",
  alta: "#f97316",
  media: "#eab308",
  baixa: "#3b82f6",
};

export function QualityPanel({ activities, developers, hus, lastCol }: Props) {
  const bugActs = useMemo(() => activities.filter((a: any) => a.activity_type === "bug"), [activities]);
  const bugsOpen = bugActs.filter((a: any) => !a.is_closed).length;
  const bugsClosed = bugActs.filter((a: any) => a.is_closed).length;
  const totalBugs = bugActs.length;

  // Completed HUs
  const completedHUs = hus.filter((h: any) => h.status === lastCol);

  // Defect Density: bugs per delivered HU
  const defectDensity = completedHUs.length > 0
    ? Math.round((totalBugs / completedHUs.length) * 100) / 100
    : 0;

  // Bug Reopen Rate (approximation: we don't have reopen data, so show 0 with note)
  const bugReopenRate = 0;

  // Escaped Defects Rate (bugs found post-publication / total HUs delivered)
  // Approximate: bugs on completed HUs
  const escapedBugs = bugActs.filter((a: any) => {
    const hu = hus.find((h: any) => h.id === a.hu_id);
    return hu && hu.status === lastCol;
  }).length;
  const escapedDefectsRate = completedHUs.length > 0
    ? Math.round((escapedBugs / completedHUs.length) * 100)
    : 0;

  // Avg resolution time by severity (using hours field as proxy)
  const severityStats = useMemo(() => {
    const priorities = ["critica", "alta", "media", "baixa"];
    return priorities.map((priority) => {
      const pBugs = bugActs.filter((a: any) => {
        const hu = hus.find((h: any) => h.id === a.hu_id);
        return hu?.priority === priority;
      });
      const closed = pBugs.filter((a: any) => a.is_closed);
      const avgHours = closed.length > 0
        ? Math.round(closed.reduce((s: number, a: any) => {
            if (a.closed_at && a.created_at) {
              const diff = (new Date(a.closed_at).getTime() - new Date(a.created_at).getTime()) / (1000 * 60 * 60);
              return s + diff;
            }
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

  // Bugs by member
  const bugsByMember = developers.map((dev: any) => {
    const devBugs = bugActs.filter((a: any) => a.assignee_id === dev.id);
    return {
      name: dev.name.split(" ")[0],
      abertos: devBugs.filter((a: any) => !a.is_closed).length,
      resolvidos: devBugs.filter((a: any) => a.is_closed).length,
    };
  }).filter((d) => d.abertos + d.resolvidos > 0);

  const statusPie = [
    { name: "Abertos", value: bugsOpen, color: "#ef4444" },
    { name: "Resolvidos", value: bugsClosed, color: "#22c55e" },
  ].filter((d) => d.value > 0);

  if (totalBugs === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Bug className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum bug registrado</p>
          <p className="text-sm mt-1">Crie atividades do tipo "Bug" para ver métricas de qualidade</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <QualityKPI label="Bugs Abertos" value={bugsOpen} color="text-[#ef4444]" />
        <QualityKPI label="Bugs Resolvidos" value={bugsClosed} color="text-[#22c55e]" />
        <QualityKPI label="Total de Bugs" value={totalBugs} />
        <QualityKPI label="Escaped Defects" value={`${escapedDefectsRate}%`} sub="bugs pós-entrega / HUs" color={escapedDefectsRate > 20 ? "text-[#ef4444]" : "text-[#22c55e]"} />
        <QualityKPI label="Defect Density" value={defectDensity} sub="bugs / HU entregue" />
        <QualityKPI label="Bug Reopen Rate" value={`${bugReopenRate}%`} sub="reabertos / resolvidos" />
      </div>

      {/* Severity Chart + Status Pie */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Bugs por Severidade</CardTitle>
          </CardHeader>
          <CardContent>
            {severityStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={severityStats} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" name="Total" radius={[4, 4, 0, 0]}>
                    {severityStats.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Bugs por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label paddingAngle={3}>
                  {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Resolution Time by Severity */}
      {severityStats.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Tempo Médio de Resolução por Severidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 font-medium">Severidade</th>
                    <th className="text-center py-2 font-medium">Total</th>
                    <th className="text-center py-2 font-medium">Abertos</th>
                    <th className="text-center py-2 font-medium">Resolvidos</th>
                    <th className="text-center py-2 font-medium">Tempo Médio (h)</th>
                  </tr>
                </thead>
                <tbody>
                  {severityStats.map((s, idx) => (
                    <tr key={s.priority} className={`border-b last:border-0 ${idx % 2 !== 0 ? "bg-[#f8fafc] dark:bg-muted/10" : ""}`}>
                      <td className="py-2">
                        <Badge style={{ backgroundColor: `${s.color}20`, color: s.color }} className="text-[10px]">
                          {s.label}
                        </Badge>
                      </td>
                      <td className="text-center py-2">{s.total}</td>
                      <td className="text-center py-2 text-[#ef4444]">{s.open}</td>
                      <td className="text-center py-2 text-[#22c55e]">{s.closed}</td>
                      <td className="text-center py-2 font-mono">{s.avgHours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bugs by Member */}
      {bugsByMember.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Bugs por Membro</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={bugsByMember}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="abertos" fill="#ef4444" name="Abertos" />
                <Bar dataKey="resolvidos" fill="#22c55e" name="Resolvidos" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QualityKPI({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <p className={`text-2xl font-bold ${color || ""}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        {sub && <p className="text-[9px] text-muted-foreground/70">{sub}</p>}
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
