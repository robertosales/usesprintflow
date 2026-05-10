import { useMemo, useState } from "react";
import { User, CheckCircle, Clock, Zap, Bug } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList, LineChart, Line, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  ReportLayout,
  ReportPageHeader,
  ReportKPISummary,
  ReportChart,
  ReportFilterBar,
  ReportDataTable,
  exportToCSV,
} from "@/shared/components/reports";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/personName";

interface Props {
  sprints: { id: string; name: string; isActive?: boolean }[];
  developers: { id: string; name: string; role: string }[];
  rawData: {
    sprints: any[];
    hus: any[];
    activities: any[];
    impediments: any[];
    developers: any[];
  };
  teamName: string;
  currentUserName: string;
  onBack: () => void;
}

const MEMBER_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ef4444", "#06b6d4", "#ec4899", "#f97316",
];

const ACT_TYPE_LABEL: Record<string, string> = {
  task: "Tarefa", bug: "Bug", improvement: "Melhoria",
  feature: "Feature", test: "Teste", other: "Outro",
};

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length];
}

function effStatus(e: number): "good" | "warning" | "danger" {
  return e >= 80 ? "good" : e >= 60 ? "warning" : "danger";
}

export function RelatorioAtividades({ sprints, developers, rawData, teamName, onBack }: Props) {
  const [filters, setFilters] = useState<Record<string, string>>({
    sprintId: "all", memberId: "all", type: "all", status: "all",
  });

  const sprintOptions = [
    { value: "all", label: "Todas" },
    ...sprints.map((s) => ({ value: s.id, label: s.name })),
  ];
  const memberOptions = [
    { value: "all", label: "Todos" },
    ...developers.map((d) => ({ value: d.id, label: d.name })),
  ];
  const typeOptions = [
    { value: "all", label: "Todos" },
    { value: "task", label: "Tarefa" }, { value: "bug", label: "Bug" },
    { value: "improvement", label: "Melhoria" }, { value: "feature", label: "Feature" },
  ];
  const statusOptions = [
    { value: "all", label: "Todos" },
    { value: "done", label: "Concluída" }, { value: "open", label: "Em aberto" },
  ];

  const filteredActivities = useMemo(() => {
    let acts = rawData.activities;
    if (filters.sprintId !== "all") {
      const huIds = new Set(
        rawData.hus.filter((h: any) => h.sprint_id === filters.sprintId).map((h: any) => h.id),
      );
      acts = acts.filter((a: any) => huIds.has(a.hu_id));
    }
    if (filters.memberId !== "all") acts = acts.filter((a: any) => a.assignee_id === filters.memberId);
    if (filters.type !== "all") acts = acts.filter((a: any) => a.activity_type === filters.type);
    if (filters.status === "done") acts = acts.filter((a: any) => a.is_closed);
    if (filters.status === "open") acts = acts.filter((a: any) => !a.is_closed);
    return acts;
  }, [rawData, filters]);

  const memberMetrics = useMemo(() => {
    return developers.map((dev) => {
      const acts = filteredActivities.filter((a: any) => a.assignee_id === dev.id);
      const closed = acts.filter((a: any) => a.is_closed);
      const hoursP = acts.reduce((s: number, a: any) => s + Number(a.hours), 0);
      const hoursC = closed.reduce((s: number, a: any) => s + Number(a.hours), 0);
      const bugs = acts.filter((a: any) => a.activity_type === "bug");
      const bugsClosed = bugs.filter((a: any) => a.is_closed);
      const eff = hoursP > 0 ? Math.round((hoursC / hoursP) * 100) : 0;
      const cycleTime = (() => {
        const withDates = closed.filter((a: any) => a.start_date && (a.closed_at || a.end_date));
        if (!withDates.length) return 0;
        const total = withDates.reduce((s: number, a: any) => {
          const end = a.closed_at || a.end_date;
          return s + Math.max(0, (new Date(end).getTime() - new Date(a.start_date).getTime()) / 86400000);
        }, 0);
        return Math.round((total / withDates.length) * 10) / 10;
      })();
      return {
        id: dev.id, name: dev.name, role: dev.role,
        total: acts.length, closed: closed.length, open: acts.length - closed.length,
        hoursP, hoursC, hoursPending: hoursP - hoursC, eff,
        bugs: bugs.length, bugsClosed: bugsClosed.length, cycleTime,
      };
    }).filter((m) => m.total > 0);
  }, [filteredActivities, developers]);

  const totalActs = filteredActivities.length;
  const totalClosed = filteredActivities.filter((a: any) => a.is_closed).length;
  const totalHoursP = filteredActivities.reduce((s: number, a: any) => s + Number(a.hours), 0);
  const totalHoursC = filteredActivities.filter((a: any) => a.is_closed).reduce((s: number, a: any) => s + Number(a.hours), 0);
  const avgEff = memberMetrics.length > 0 ? Math.round(memberMetrics.reduce((s, m) => s + m.eff, 0) / memberMetrics.length) : 0;

  const kpis = [
    { label: "Atividades", value: totalActs, sub: `${totalClosed} concluídas`, icon: <CheckCircle className="h-4 w-4" />, status: totalClosed > 0 ? "good" : "neutral" as any },
    { label: "Horas Concluídas", value: `${totalHoursC}h`, sub: `de ${totalHoursP}h planejadas`, icon: <Clock className="h-4 w-4" />, status: totalHoursP > 0 && totalHoursC / totalHoursP >= 0.7 ? "good" : "warning" as any },
    { label: "Eficiência Média", value: `${avgEff}%`, sub: "meta ≥ 80%", icon: <Zap className="h-4 w-4" />, status: effStatus(avgEff) },
    { label: "Membros Ativos", value: memberMetrics.length, sub: `de ${developers.length} no time`, icon: <User className="h-4 w-4" />, status: "neutral" as any },
  ];

  const hoursBarData = memberMetrics.map((m) => ({
    name: m.name.split(" ")[0],
    "Concluídas": m.hoursC,
    Pendentes: m.hoursPending,
  }));

  const throughputData = useMemo(() => {
    return [...rawData.sprints]
      .sort((a: any, b: any) => a.start_date.localeCompare(b.start_date))
      .slice(-6)
      .map((sprint: any) => {
        const huIds = new Set(rawData.hus.filter((h: any) => h.sprint_id === sprint.id).map((h: any) => h.id));
        const entry: any = { sprint: sprint.name };
        developers.forEach((dev) => {
          entry[dev.name.split(" ")[0]] = rawData.activities.filter(
            (a: any) => huIds.has(a.hu_id) && a.assignee_id === dev.id && a.is_closed,
          ).length;
        });
        return entry;
      });
  }, [rawData, developers]);

  const radarData = memberMetrics.slice(0, 6).map((m) => ({
    membro: m.name.split(" ")[0],
    Eficiência: m.eff,
    "Concluídas": Math.min(100, Math.round((m.closed / Math.max(m.total, 1)) * 100)),
    "Bugs Resolvidos": m.bugs > 0 ? Math.round((m.bugsClosed / m.bugs) * 100) : 100,
  }));

  const tableData = useMemo(() => {
    return filteredActivities.map((a: any) => {
      const dev = developers.find((d) => d.id === a.assignee_id);
      const hu = rawData.hus.find((h: any) => h.id === a.hu_id);
      const sprint = hu ? rawData.sprints.find((s: any) => s.id === hu.sprint_id) : null;
      return {
        membro: dev?.name || "—", titulo: a.title,
        tipo: a.activity_type || "task", sprint: sprint?.name || "—",
        hu: hu?.code || "—", horas: Number(a.hours) || 0,
        inicio: a.start_date || "", fim: a.end_date || "", status: a.is_closed,
      };
    });
  }, [filteredActivities, developers, rawData]);

  function handleExport() {
    exportToCSV(
      tableData.map((r) => ({
        Membro: r.membro, Título: r.titulo,
        Tipo: ACT_TYPE_LABEL[r.tipo] ?? r.tipo,
        Sprint: r.sprint, HU: r.hu, Horas: r.horas,
        Início: r.inicio ? new Date(r.inicio).toLocaleDateString("pt-BR") : "",
        Fim: r.fim ? new Date(r.fim).toLocaleDateString("pt-BR") : "",
        Status: r.status ? "Concluída" : "Em aberto",
      })),
      `atividades_${teamName}`,
    );
  }

  return (
    <ReportLayout>
      <ReportPageHeader
        title="Atividades & Produtividade Individual"
        description={`Time: ${teamName} · ${totalActs} atividades no período`}
        icon={<User className="h-5 w-5" />}
        badge="Ágil"
        onBack={onBack}
        onExportCSV={handleExport}
      />

      <ReportFilterBar
        fields={[
          { key: "sprintId", label: "Sprint", type: "select", options: sprintOptions },
          { key: "memberId", label: "Membro", type: "select", options: memberOptions },
          { key: "type", label: "Tipo", type: "select", options: typeOptions },
          { key: "status", label: "Status", type: "select", options: statusOptions },
        ]}
        values={filters}
        onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        onReset={() => setFilters({ sprintId: "all", memberId: "all", type: "all", status: "all" })}
      />

      <ReportKPISummary items={kpis} cols={4} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportChart title="Horas por Membro" subtitle="Concluídas vs. pendentes" height="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hoursBarData} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Concluídas" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={48}>
                <LabelList dataKey="Concluídas" position="top" style={{ fontSize: 10, fontWeight: 600 }} formatter={(v: any) => v > 0 ? `${v}h` : ""} />
              </Bar>
              <Bar dataKey="Pendentes" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ReportChart>

        <ReportChart title="Throughput por Sprint" subtitle="Atividades concluídas por membro" height="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={throughputData} margin={{ top: 12, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="sprint" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              {developers.map((dev, i) => (
                <Line key={dev.id} type="monotone" dataKey={dev.name.split(" ")[0]}
                  stroke={MEMBER_COLORS[i % MEMBER_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ReportChart>
      </div>

      {radarData.length > 1 && (
        <ReportChart title="Comparação de Produtividade" subtitle="Eficiência, conclusões e resolução de bugs (%)" height="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="membro" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickCount={4} />
              <Radar name="Eficiência" dataKey="Eficiência" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
              <Radar name="Concluídas" dataKey="Concluídas" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} />
              <Radar name="Bugs Resolvidos" dataKey="Bugs Resolvidos" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </ReportChart>
      )}

      <ReportDataTable
        title="Produtividade por Membro"
        badge={memberMetrics.length}
        data={memberMetrics}
        rowKey={(r) => r.id}
        columns={[
          { key: "name", header: "Membro",
            render: (v, row) => (
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ background: avatarColor(v) }}>{getInitials(v)}</div>
                <div>
                  <p className="text-sm font-medium">{v}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{row.role}</p>
                </div>
              </div>
            ) },
          { key: "total", header: "Atividades", align: "center", sortable: true },
          { key: "closed", header: "Concluídas", align: "center", sortable: true,
            render: (v) => <span className="font-semibold text-emerald-600">{v}</span> },
          { key: "hoursC", header: "Horas Concl.", align: "center", sortable: true,
            render: (v, row) => `${v}h / ${row.hoursP}h` },
          { key: "eff", header: "Eficiência", align: "center", sortable: true,
            render: (v) => (
              <Badge className={cn("text-[10px]",
                v >= 80 ? "bg-emerald-500/15 text-emerald-600" :
                v >= 60 ? "bg-amber-400/15 text-amber-600" :
                "bg-red-500/15 text-red-600")}>{v}%</Badge>
            ) },
          { key: "bugs", header: "Bugs", align: "center",
            render: (v, row) => v > 0 ? (
              <Badge variant="secondary" className="text-[10px] bg-red-50 text-red-600">
                <Bug className="h-2.5 w-2.5 mr-0.5" />{row.bugsClosed}/{v}
              </Badge>
            ) : <span className="text-muted-foreground text-xs">—</span> },
          { key: "cycleTime", header: "Cycle Time", align: "center", sortable: true,
            render: (v) => v > 0 ? `${v}d` : "—" },
        ]}
      />

      <ReportDataTable
        title="Detalhamento de Atividades"
        badge={tableData.length}
        data={tableData}
        rowKey={(_, i) => i}
        columns={[
          { key: "membro", header: "Membro", sortable: true },
          { key: "titulo", header: "Título", sortable: true },
          { key: "tipo", header: "Tipo", align: "center",
            render: (v) => <span className="text-xs capitalize">{ACT_TYPE_LABEL[v] ?? v}</span> },
          { key: "sprint", header: "Sprint", sortable: true },
          { key: "hu", header: "HU", align: "center",
            render: (v) => v !== "—" ? <span className="font-mono text-xs">{v}</span> : "—" },
          { key: "horas", header: "Horas", align: "center", sortable: true, render: (v) => `${v}h` },
          { key: "inicio", header: "Início", align: "center",
            render: (v) => v ? new Date(v).toLocaleDateString("pt-BR") : "—" },
          { key: "fim", header: "Fim", align: "center",
            render: (v) => v ? new Date(v).toLocaleDateString("pt-BR") : "—" },
          { key: "status", header: "Status", align: "center",
            render: (v) => v
              ? <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600">Concluída</Badge>
              : <Badge className="text-[10px] bg-amber-400/15 text-amber-600">Em aberto</Badge> },
        ]}
      />
    </ReportLayout>
  );
}
