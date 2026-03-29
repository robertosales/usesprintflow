import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  tasksByStatus: { name: string; value: number; color: string }[];
}

interface Props {
  members: MemberMetrics[];
  sprintName: string;
  hoursPerMemberData: { name: string; concluido: number; pendente: number }[];
  progressBySprintData: { sprint: string; [member: string]: string | number }[];
  memberNames: string[];
}

const STATUS_CHART_COLORS = [
  "hsl(142, 71%, 40%)",  // concluída
  "hsl(210, 92%, 55%)",  // em progresso
  "hsl(38, 92%, 50%)",   // não iniciada
  "hsl(0, 72%, 51%)",    // bloqueada/bug
  "hsl(262, 52%, 55%)",  // review
];

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
      "Não Iniciadas", "Horas Planejadas", "Horas Concluídas", "Horas Pendentes",
      "Eficiência %", "Bugs Atribuídos", "Bugs Resolvidos", "Story Points",
      "Tempo Médio (h)",
    ],
    rows: members.map((m) => [
      m.name, m.role, m.tasksAssigned, m.tasksStarted, m.tasksCompleted,
      m.tasksNotStarted, m.hoursPlanned, m.hoursCompleted, m.hoursPending,
      m.efficiency, m.bugsAssigned, m.bugsResolved, m.storyPointsCompleted,
      m.avgTimePerActivity,
    ]),
  });

  // Aggregate status pie data
  const allStatusData: Record<string, number> = {};
  members.forEach((m) => {
    m.tasksByStatus.forEach((s) => {
      allStatusData[s.name] = (allStatusData[s.name] || 0) + s.value;
    });
  });
  const statusPieData = Object.entries(allStatusData)
    .filter(([, v]) => v > 0)
    .map(([name, value], i) => ({
      name,
      value,
      color: STATUS_CHART_COLORS[i % STATUS_CHART_COLORS.length],
    }));

  const CHART_COLORS = [
    "hsl(210, 92%, 55%)", "hsl(142, 71%, 40%)", "hsl(38, 92%, 50%)",
    "hsl(262, 52%, 55%)", "hsl(0, 72%, 51%)", "hsl(180, 60%, 45%)",
  ];

  return (
    <div className="space-y-4">
      {/* Header with export */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <User className="h-4 w-4 text-primary" /> Desempenho Individual
        </h3>
        <ExportButton getData={getExportData} />
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KPICard
          icon={Target}
          label="Tarefas Atribuídas"
          value={members.reduce((s, m) => s + m.tasksAssigned, 0)}
          color="text-primary"
        />
        <KPICard
          icon={ActivityIcon}
          label="Iniciadas"
          value={members.reduce((s, m) => s + m.tasksStarted, 0)}
          color="text-info"
        />
        <KPICard
          icon={CheckCircle}
          label="Concluídas"
          value={members.reduce((s, m) => s + m.tasksCompleted, 0)}
          color="text-success"
        />
        <KPICard
          icon={Clock}
          label="Horas Planejadas"
          value={`${members.reduce((s, m) => s + m.hoursPlanned, 0)}h`}
          color="text-muted-foreground"
        />
        <KPICard
          icon={TrendingUp}
          label="Eficiência Média"
          value={`${members.length > 0 ? Math.round(members.reduce((s, m) => s + m.efficiency, 0) / members.length) : 0}%`}
          color="text-primary"
          alert={members.length > 0 && members.reduce((s, m) => s + m.efficiency, 0) / members.length < 50 ? "warning" : undefined}
        />
        <KPICard
          icon={Bug}
          label="Bugs Atribuídos"
          value={members.reduce((s, m) => s + m.bugsAssigned, 0)}
          color="text-destructive"
        />
        <KPICard
          icon={Zap}
          label="Story Points"
          value={members.reduce((s, m) => s + m.storyPointsCompleted, 0)}
          color="text-primary"
        />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Hours: Completed vs Pending per member */}
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
                  <Bar dataKey="concluido" fill="hsl(142, 71%, 40%)" name="Concluído" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="pendente" fill="hsl(210, 92%, 55%)" name="Pendente" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>

        {/* Tasks by status pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Tarefas por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    dataKey="value"
                    label={({ value }) => `${value}`}
                    paddingAngle={2}
                  >
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
        {/* Progress per sprint */}
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
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Radar chart */}
        {members.length > 0 && members.length <= 8 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Perfil de Produtividade</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={members.map((m) => ({
                  name: m.name.split(" ")[0],
                  tarefas: m.tasksCompleted,
                  horas: m.hoursCompleted,
                  eficiencia: m.efficiency,
                  points: m.storyPointsCompleted,
                  bugs: m.bugsResolved,
                }))}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} />
                  <Radar name="Tarefas" dataKey="tarefas" stroke="hsl(210, 92%, 55%)" fill="hsl(210, 92%, 55%)" fillOpacity={0.15} />
                  <Radar name="Eficiência" dataKey="eficiencia" stroke="hsl(142, 71%, 40%)" fill="hsl(142, 71%, 40%)" fillOpacity={0.15} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detail Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Detalhamento por Membro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">Membro</th>
                  <th className="text-center py-2 font-medium">Função</th>
                  <th className="text-center py-2 font-medium">Atribuídas</th>
                  <th className="text-center py-2 font-medium">Iniciadas</th>
                  <th className="text-center py-2 font-medium">Concluídas</th>
                  <th className="text-center py-2 font-medium">Não Inic.</th>
                  <th className="text-center py-2 font-medium">Hrs Plan.</th>
                  <th className="text-center py-2 font-medium">Hrs Conc.</th>
                  <th className="text-center py-2 font-medium">Hrs Pend.</th>
                  <th className="text-center py-2 font-medium">Bugs</th>
                  <th className="text-center py-2 font-medium">SP</th>
                  <th className="text-center py-2 font-medium">Tempo Médio</th>
                  <th className="text-center py-2 font-medium">Eficiência</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 font-medium">{m.name}</td>
                    <td className="text-center py-2.5">
                      <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
                    </td>
                    <td className="text-center py-2.5">{m.tasksAssigned}</td>
                    <td className="text-center py-2.5 text-info">{m.tasksStarted}</td>
                    <td className="text-center py-2.5 text-success font-medium">{m.tasksCompleted}</td>
                    <td className="text-center py-2.5">
                      {m.tasksNotStarted > 0 ? (
                        <Badge variant="secondary" className="text-[10px] bg-warning/15 text-warning">{m.tasksNotStarted}</Badge>
                      ) : "—"}
                    </td>
                    <td className="text-center py-2.5">{m.hoursPlanned}h</td>
                    <td className="text-center py-2.5 text-success">{m.hoursCompleted}h</td>
                    <td className="text-center py-2.5 text-info">{m.hoursPending}h</td>
                    <td className="text-center py-2.5">
                      {m.bugsAssigned > 0 ? (
                        <span className="text-destructive font-medium">{m.bugsResolved}/{m.bugsAssigned}</span>
                      ) : "—"}
                    </td>
                    <td className="text-center py-2.5 font-medium">{m.storyPointsCompleted}</td>
                    <td className="text-center py-2.5 text-xs">{m.avgTimePerActivity}h</td>
                    <td className="text-center py-2.5">
                      <div className="flex items-center gap-1.5 justify-center">
                        <Progress value={m.efficiency} className="h-1.5 w-12" />
                        <span className={`text-xs font-bold ${
                          m.efficiency >= 80 ? "text-success" :
                          m.efficiency >= 50 ? "text-warning" :
                          "text-destructive"
                        }`}>
                          {m.efficiency}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color, alert }: {
  icon: React.ElementType; label: string; value: string | number;
  color: string; alert?: "warning" | "destructive";
}) {
  return (
    <Card className={alert === "warning" ? "border-warning/30" : alert === "destructive" ? "border-destructive/30" : ""}>
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
