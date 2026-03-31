import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  CheckCircle, Clock, AlertTriangle, Bug, Zap, Target,
  TrendingUp, User, Activity as ActivityIcon,
} from "lucide-react";
import { ExportButton } from "./ExportButton";

interface MemberMetrics {
  id: string;
  name: string;
  role: string;
  tasksAssigned: number;
  tasksStarted: number;
  tasksCompleted: number;
  tasksNotStarted: number;
  hoursPlanned: number;
  hoursCompleted: number;
  hoursPending: number;
  efficiency: number;
  bugsAssigned: number;
  bugsResolved: number;
  storyPointsCompleted: number;
  avgTimePerActivity: number;
  wip: number;
  cycleTime: number;
  tasksByStatus: { name: string; value: number; color: string }[];
}

interface Props {
  members: MemberMetrics[];
  sprintName: string;
  hoursPerMemberData: { name: string; concluido: number; pendente: number }[];
  progressBySprintData: { sprint: string; [member: string]: string | number }[];
  memberNames: string[];
}

const STATUS_PIE_COLORS: Record<string, string> = {
  "Concluída": "#22c55e",
  "Em Progresso": "#3b82f6",
  "Não Iniciada": "#94a3b8",
  "Bloqueada": "#ef4444",
  "Impedida": "#eab308",
};

const MEMBER_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16", "#e11d48",
];

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
}

export function IndividualPerformance({ members, sprintName, hoursPerMemberData, progressBySprintData, memberNames }: Props) {
  if (members.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sem dados de desempenho individual</p>
          <p className="text-sm mt-1">Atribua atividades aos membros do time</p>
        </CardContent>
      </Card>
    );
  }

  const getExportData = () => ({
    title: `Desempenho Individual - ${sprintName}`,
    headers: [
      "Membro", "Função", "Tarefas Atribuídas", "Iniciadas", "Concluídas",
      "Não Iniciadas", "WIP", "Cycle Time (dias)", "Horas Planejadas", "Horas Concluídas",
      "Horas Pendentes", "Eficiência %", "Bugs Atribuídos", "Bugs Resolvidos",
      "Story Points", "Tempo Médio (h)",
    ],
    rows: members.map((m) => [
      m.name, m.role, m.tasksAssigned, m.tasksStarted, m.tasksCompleted,
      m.tasksNotStarted, m.wip, m.cycleTime, m.hoursPlanned, m.hoursCompleted,
      m.hoursPending, m.efficiency, m.bugsAssigned, m.bugsResolved,
      m.storyPointsCompleted, m.avgTimePerActivity,
    ]),
  });

  const allStatusData: Record<string, number> = {};
  members.forEach((m) => {
    m.tasksByStatus.forEach((s) => {
      allStatusData[s.name] = (allStatusData[s.name] || 0) + s.value;
    });
  });
  const statusPieData = Object.entries(allStatusData)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name, value,
      color: STATUS_PIE_COLORS[name] || "#94a3b8",
    }));

  const totals = {
    tasksAssigned: members.reduce((s, m) => s + m.tasksAssigned, 0),
    tasksStarted: members.reduce((s, m) => s + m.tasksStarted, 0),
    tasksCompleted: members.reduce((s, m) => s + m.tasksCompleted, 0),
    tasksNotStarted: members.reduce((s, m) => s + m.tasksNotStarted, 0),
    wip: members.reduce((s, m) => s + m.wip, 0),
    cycleTime: members.length > 0 ? Math.round(members.reduce((s, m) => s + m.cycleTime, 0) / members.length * 10) / 10 : 0,
    hoursPlanned: members.reduce((s, m) => s + m.hoursPlanned, 0),
    hoursCompleted: members.reduce((s, m) => s + m.hoursCompleted, 0),
    hoursPending: members.reduce((s, m) => s + m.hoursPending, 0),
    bugsAssigned: members.reduce((s, m) => s + m.bugsAssigned, 0),
    bugsResolved: members.reduce((s, m) => s + m.bugsResolved, 0),
    storyPoints: members.reduce((s, m) => s + m.storyPointsCompleted, 0),
    avgTime: members.length > 0 ? Math.round(members.reduce((s, m) => s + m.avgTimePerActivity, 0) / members.length * 10) / 10 : 0,
    efficiency: members.length > 0 ? Math.round(members.reduce((s, m) => s + m.efficiency, 0) / members.length) : 0,
  };

  const radarMetrics = ["Tarefas", "Horas", "Eficiência", "SP", "Bugs Res."];
  const radarData = radarMetrics.map((metric) => {
    const entry: any = { metric };
    members.forEach((m) => {
      const key = m.name.split(" ")[0];
      switch (metric) {
        case "Tarefas": entry[key] = m.tasksCompleted; break;
        case "Horas": entry[key] = m.hoursCompleted; break;
        case "Eficiência": entry[key] = m.efficiency; break;
        case "SP": entry[key] = m.storyPointsCompleted; break;
        case "Bugs Res.": entry[key] = m.bugsResolved; break;
      }
    });
    return entry;
  });

  const columnTooltips: Record<string, string> = {
    "Membro": "Nome do desenvolvedor ou membro do time",
    "Função": "Papel exercido no time (Dev, SM, PO, etc.)",
    "Atribuídas": "Total de tarefas atribuídas ao membro",
    "Iniciadas": "Tarefas em andamento (não concluídas e com data de início atingida)",
    "Concluídas": "Tarefas finalizadas (is_closed = true)",
    "Não Inic.": "Tarefas atribuídas mas ainda não iniciadas",
    "WIP": "Work In Progress — tarefas simultâneas em progresso",
    "Cycle": "Cycle Time médio em dias por tarefa concluída",
    "Hrs Plan.": "Soma das horas estimadas de todas as tarefas atribuídas",
    "Hrs Conc.": "Soma das horas das tarefas concluídas",
    "Hrs Pend.": "Diferença entre horas planejadas e concluídas",
    "Bugs": "Bugs resolvidos / total de bugs atribuídos",
    "SP": "Story Points das HUs concluídas vinculadas às tarefas do membro",
    "Tempo Médio": "Média de horas por tarefa concluída",
    "Eficiência": "Percentual de horas concluídas vs planejadas",
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Desempenho Individual
          </h3>
          <ExportButton getData={getExportData} />
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <KPICard icon={Target} label="Tarefas Atribuídas" value={totals.tasksAssigned} color="text-primary" />
          <KPICard icon={ActivityIcon} label="Iniciadas" value={totals.tasksStarted} color="text-[#3b82f6]" />
          <KPICard icon={CheckCircle} label="Concluídas" value={totals.tasksCompleted} color="text-[#22c55e]" />
          <KPICard icon={Clock} label="Horas Planejadas" value={`${totals.hoursPlanned}h`} color="text-muted-foreground" />
          <KPICard
            icon={TrendingUp}
            label="Eficiência Média"
            value={`${totals.efficiency}%`}
            color="text-primary"
            alert={totals.efficiency < 50 ? "warning" : undefined}
          />
          <KPICard icon={Bug} label="Bugs Atribuídos" value={totals.bugsAssigned} color="text-destructive" />
          <KPICard icon={Zap} label="Story Points" value={totals.storyPoints} color="text-primary" />
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Horas Concluídas vs Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              {hoursPerMemberData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={hoursPerMemberData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="concluido" fill="#22c55e" name="Concluído" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="pendente" fill="#3b82f6" name="Pendente" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Tarefas por Status</CardTitle>
            </CardHeader>
            <CardContent>
              {statusPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} paddingAngle={2}>
                      {statusPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Progress line chart & Radar */}
        <div className="grid md:grid-cols-2 gap-4">
          {progressBySprintData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Progresso Individual por Sprint</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={progressBySprintData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="sprint" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    {memberNames.map((name, i) => (
                      <Line key={name} type="monotone" dataKey={name} stroke={MEMBER_COLORS[i % MEMBER_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {members.length > 0 && members.length <= 8 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Perfil de Produtividade</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fontSize: 9 }} />
                    {members.map((m, i) => (
                      <Radar key={m.id} name={m.name.split(" ")[0]} dataKey={m.name.split(" ")[0]}
                        stroke={MEMBER_COLORS[i % MEMBER_COLORS.length]}
                        fill={MEMBER_COLORS[i % MEMBER_COLORS.length]}
                        fillOpacity={0.1} strokeWidth={2} />
                    ))}
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Detail Table with WIP and Cycle Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Detalhamento por Membro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    {Object.entries(columnTooltips).map(([header, tip]) => (
                      <th key={header} className={`${header === "Membro" ? "text-left" : "text-center"} py-2 font-medium`}>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help border-b border-dotted border-muted-foreground/40">
                              {header}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px] text-xs">
                            {tip}
                          </TooltipContent>
                        </UITooltip>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, idx) => (
                    <tr
                      key={m.id}
                      className={`border-b last:border-0 hover:bg-muted/40 transition-colors ${
                        idx % 2 === 0 ? "" : "bg-[#f8fafc] dark:bg-muted/10"
                      }`}
                    >
                      <td className="py-2.5 font-medium">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                            style={{ backgroundColor: getAvatarColor(m.name) }}
                          >
                            {getInitials(m.name)}
                          </div>
                          {m.name}
                        </div>
                      </td>
                      <td className="text-center py-2.5">
                        <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
                      </td>
                      <td className="text-center py-2.5">{m.tasksAssigned}</td>
                      <td className="text-center py-2.5" style={{ color: "#3b82f6" }}>{m.tasksStarted}</td>
                      <td className="text-center py-2.5 font-medium" style={{ color: "#22c55e" }}>{m.tasksCompleted}</td>
                      <td className="text-center py-2.5">
                        {m.tasksNotStarted > 0 ? (
                          <Badge variant="secondary" className="text-[10px]" style={{ backgroundColor: "rgba(148,163,184,0.15)", color: "#94a3b8" }}>
                            {m.tasksNotStarted}
                          </Badge>
                        ) : "—"}
                      </td>
                      {/* WIP */}
                      <td className="text-center py-2.5">
                        <span className={`font-semibold ${m.wip > 2 ? "text-[#eab308] bg-[#eab308]/10 px-1.5 py-0.5 rounded" : ""}`}>
                          {m.wip}
                        </span>
                      </td>
                      {/* Cycle Time */}
                      <td className="text-center py-2.5 font-mono text-xs">
                        {m.cycleTime > 0 ? `${m.cycleTime}d` : "—"}
                      </td>
                      <td className="text-center py-2.5">{m.hoursPlanned}h</td>
                      <td className="text-center py-2.5" style={{ color: "#22c55e" }}>{m.hoursCompleted}h</td>
                      <td className="text-center py-2.5" style={{ color: "#3b82f6" }}>{m.hoursPending}h</td>
                      <td className="text-center py-2.5">
                        {m.bugsAssigned > 0 ? (
                          <span style={{ color: "#ef4444" }} className="font-medium">{m.bugsResolved}/{m.bugsAssigned}</span>
                        ) : "—"}
                      </td>
                      <td className="text-center py-2.5 font-medium">{m.storyPointsCompleted}</td>
                      <td className="text-center py-2.5 text-xs">{m.avgTimePerActivity}h</td>
                      <td className="text-center py-2.5">
                        <EfficiencyBar value={m.efficiency} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold bg-muted/20">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">Σ</div>
                        Total / Média
                      </div>
                    </td>
                    <td className="text-center py-2.5">—</td>
                    <td className="text-center py-2.5">{totals.tasksAssigned}</td>
                    <td className="text-center py-2.5">{totals.tasksStarted}</td>
                    <td className="text-center py-2.5">{totals.tasksCompleted}</td>
                    <td className="text-center py-2.5">{totals.tasksNotStarted}</td>
                    <td className="text-center py-2.5">{totals.wip}</td>
                    <td className="text-center py-2.5 font-mono text-xs">{totals.cycleTime}d</td>
                    <td className="text-center py-2.5">{totals.hoursPlanned}h</td>
                    <td className="text-center py-2.5">{totals.hoursCompleted}h</td>
                    <td className="text-center py-2.5">{totals.hoursPending}h</td>
                    <td className="text-center py-2.5">
                      {totals.bugsAssigned > 0 ? `${totals.bugsResolved}/${totals.bugsAssigned}` : "—"}
                    </td>
                    <td className="text-center py-2.5">{totals.storyPoints}</td>
                    <td className="text-center py-2.5 text-xs">{totals.avgTime}h</td>
                    <td className="text-center py-2.5">
                      <EfficiencyBar value={totals.efficiency} />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function EfficiencyBar({ value }: { value: number }) {
  const color = value >= 80 ? "#22c55e" : value >= 40 ? "#eab308" : "#ef4444";
  return (
    <div className="flex items-center gap-1.5 justify-center">
      <div className="w-14 h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-bold" style={{ color }}>
        {value}%
      </span>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color, alert }: {
  icon: React.ElementType; label: string; value: string | number;
  color: string; alert?: "warning" | "destructive";
}) {
  return (
    <Card className={alert === "warning" ? "border-[#eab308]/30" : alert === "destructive" ? "border-destructive/30" : ""}>
      <CardContent className="p-3 text-center">
        <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
        <p className="text-xl font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{label}</p>
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
