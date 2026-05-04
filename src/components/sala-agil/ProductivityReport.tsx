import { useMemo } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/common/EmptyState";
import { Users, BarChart2, Clock, Bug, ListTodo } from "lucide-react";

interface DeveloperProductivity {
  developerId: string;
  developerName: string;
  totalHours: number;
  taskCount: number;
  bugCount: number;
  closedActivities: number;
  openActivities: number;
}

interface HuProductivity {
  huId: string;
  huCode: string;
  huTitle: string;
  totalHours: number;
  activityCount: number;
  closedActivities: number;
}

export function ProductivityReport() {
  const { activities, userStories, developers, activeSprint } = useSprint();
  const { currentTeamId } = useAuth();

  const { devMetrics, huMetrics, totalHours, totalActivities, totalBugs, closedActivities } = useMemo(() => {
    if (!activeSprint) {
      return {
        devMetrics: [] as DeveloperProductivity[],
        huMetrics: [] as HuProductivity[],
        totalHours: 0,
        totalActivities: 0,
        totalBugs: 0,
        closedActivities: 0,
      };
    }

    const sprintActivities = activities.filter((a) =>
      userStories.some((hu) => hu.id === a.huId && hu.sprintId === activeSprint.id),
    );

    const devMap = new Map<string, DeveloperProductivity>();
    const huMap = new Map<string, HuProductivity>();

    let totalH = 0;
    let totalA = 0;
    let totalBugsCount = 0;
    let closedA = 0;

    for (const act of sprintActivities) {
      totalH += act.hours || 0;
      totalA += 1;
      if (act.activityType === "bug") totalBugsCount += 1;
      if (act.isClosed) closedA += 1;

      // Por desenvolvedor
      if (act.assigneeId) {
        const dev = developers.find((d) => d.id === act.assigneeId);
        const key = act.assigneeId;
        if (!devMap.has(key)) {
          devMap.set(key, {
            developerId: key,
            developerName: dev?.name || "Sem responsável",
            totalHours: 0,
            taskCount: 0,
            bugCount: 0,
            closedActivities: 0,
            openActivities: 0,
          });
        }
        const entry = devMap.get(key)!;
        entry.totalHours += act.hours || 0;
        if (act.activityType === "bug") entry.bugCount += 1;
        else entry.taskCount += 1;
        if (act.isClosed) entry.closedActivities += 1;
        else entry.openActivities += 1;
      }

      // Por HU
      const hu = userStories.find((h) => h.id === act.huId);
      if (hu) {
        const key = hu.id;
        if (!huMap.has(key)) {
          huMap.set(key, {
            huId: key,
            huCode: hu.code,
            huTitle: hu.title,
            totalHours: 0,
            activityCount: 0,
            closedActivities: 0,
          });
        }
        const entryHu = huMap.get(key)!;
        entryHu.totalHours += act.hours || 0;
        entryHu.activityCount += 1;
        if (act.isClosed) entryHu.closedActivities += 1;
      }
    }

    const devMetrics = Array.from(devMap.values()).sort((a, b) => b.totalHours - a.totalHours);
    const huMetrics = Array.from(huMap.values()).sort((a, b) => b.totalHours - a.totalHours);

    return {
      devMetrics,
      huMetrics,
      totalHours: totalH,
      totalActivities: totalA,
      totalBugs: totalBugsCount,
      closedActivities: closedA,
    };
  }, [activities, userStories, developers, activeSprint]);

  if (!activeSprint || !currentTeamId) {
    return (
      <EmptyState
        icon={BarChart2}
        title="Nenhuma sprint ativa"
        description="Selecione um time e inicie uma sprint na Sala Ágil para visualizar o relatório de produtividade."
      />
    );
  }

  if (totalActivities === 0) {
    return (
      <EmptyState
        icon={BarChart2}
        title="Sem atividades registradas"
        description="Crie atividades vinculadas às User Stories da sprint para acompanhar a produtividade do time."
      />
    );
  }

  const avgHoursPerActivity = totalActivities > 0 ? totalHours / totalActivities : 0;
  const completionRate = totalActivities > 0 ? (closedActivities / totalActivities) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Relatório de Produtividade</h1>
            <p className="text-xs text-muted-foreground">
              Visão analítica das horas, atividades e distribuição de esforço da sprint ativa.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">
            Sprint ativa: <span className="font-semibold ml-1">{activeSprint.name}</span>
          </Badge>
          <Badge variant="secondary">
            Atividades: <span className="font-semibold ml-1">{totalActivities}</span>
          </Badge>
        </div>
      </div>

      {/* KPIs gerais */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              Horas Lançadas
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-2xl font-semibold">{totalHours.toFixed(1)}h</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Média de {avgHoursPerActivity.toFixed(2)}h por atividade
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ListTodo className="h-4 w-4 text-primary" />
              Atividades Concluídas
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-2xl font-semibold">
              {closedActivities}/{totalActivities}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Taxa de conclusão de {completionRate.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bug className="h-4 w-4 text-destructive" />
              Bugs
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-2xl font-semibold text-destructive">{totalBugs}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {totalActivities > 0 ? ((totalBugs / totalActivities) * 100).toFixed(1) : "0.0"}% das atividades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-primary" />
              Colaboradores
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-2xl font-semibold">{devMetrics.length}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Distribuição de esforço entre membros do time</p>
          </CardContent>
        </Card>
      </div>

      {/* Produtividade por desenvolvedor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-primary" />
            Produtividade por Membro do Time
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          {devMetrics.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma atividade atribuída a membros do time nesta sprint.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Membro</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Horas</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Tarefas</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Bugs</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Concluídas</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Abertas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {devMetrics.map((dev) => (
                    <tr key={dev.developerId} className="hover:bg-muted/40">
                      <td className="px-3 py-2">
                        <span className="font-medium">{dev.developerName}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{dev.totalHours.toFixed(1)}h</td>
                      <td className="px-3 py-2 text-right">{dev.taskCount}</td>
                      <td className="px-3 py-2 text-right text-destructive">{dev.bugCount}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{dev.closedActivities}</td>
                      <td className="px-3 py-2 text-right text-amber-600">{dev.openActivities}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Produtividade por User Story */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ListTodo className="h-4 w-4 text-primary" />
            Distribuição por User Story
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          {huMetrics.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhuma User Story com atividades registrada para esta sprint.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">HU</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Título</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Horas</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Atividades</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Concluídas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {huMetrics.map((hu) => (
                    <tr key={hu.huId} className="hover:bg-muted/40">
                      <td className="px-3 py-2 font-mono text-[11px]">{hu.huCode}</td>
                      <td className="px-3 py-2">
                        <span className="truncate block max-w-[260px]">{hu.huTitle}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{hu.totalHours.toFixed(1)}h</td>
                      <td className="px-3 py-2 text-right">{hu.activityCount}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{hu.closedActivities}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
