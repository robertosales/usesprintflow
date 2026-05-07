import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReportData } from '../ReportExporter';
import { TrendingDown, CheckCircle, Clock, AlertTriangle, BarChart3 } from 'lucide-react';

interface Props {
  data: ReportData;
  emittedBy: string;
  sprintDurationDays?: number;
}

function KpiCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  accent?: 'green' | 'red' | 'yellow' | 'blue';
}) {
  const colors: Record<string, string> = {
    green: 'text-[#22c55e]', red: 'text-destructive',
    yellow: 'text-[#eab308]', blue: 'text-[#3b82f6]',
  };
  const c = accent ? colors[accent] : 'text-primary';
  return (
    <Card><CardContent className="p-3 text-center">
      <Icon className={`h-4 w-4 mx-auto mb-1 ${c}`} />
      <p className={`text-xl font-bold ${c}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{label}</p>
    </CardContent></Card>
  );
}

export function BurndownReport({ data, emittedBy, sprintDurationDays = 14 }: Props) {
  const now = new Date().toLocaleString('pt-BR');

  const metrics = useMemo(() => {
    const acts     = data.activities;
    const closed   = acts.filter(a => a.status === 'Concluída');
    const open     = acts.filter(a => a.status !== 'Concluída');
    const totalH   = acts.reduce((s, a) => s + a.hours, 0);
    const doneH    = closed.reduce((s, a) => s + a.hours, 0);
    const remainH  = totalH - doneH;
    const burnRate = sprintDurationDays > 0 ? Math.round((doneH / sprintDurationDays) * 10) / 10 : 0;
    const daysLeft = burnRate > 0 ? Math.ceil(remainH / burnRate) : null;
    const onTrack  = daysLeft !== null && daysLeft <= sprintDurationDays;

    // Simula pontos do burndown por dia (ideal vs real)
    // Usa endDate das atividades concluídas para distribuir no tempo
    const dayMap: Record<string, number> = {};
    closed.forEach(a => {
      if (!a.endDate) return;
      const d = a.endDate;
      dayMap[d] = (dayMap[d] || 0) + a.hours;
    });
    const sortedDays = Object.keys(dayMap).sort();
    let cumDone = 0;
    const burnPoints = sortedDays.map(d => {
      cumDone += dayMap[d];
      return { date: d, done: cumDone, remaining: Math.max(0, totalH - cumDone) };
    });

    // Cumulative flow por status
    const statusCounts: Record<string, number> = {};
    acts.forEach(a => {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
    });

    return { totalActs: acts.length, closedActs: closed.length, openActs: open.length, totalH, doneH, remainH, burnRate, daysLeft, onTrack, burnPoints, statusCounts };
  }, [data, sprintDurationDays]);

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="rounded-lg border bg-gradient-to-r from-blue-50 to-white p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">NexOps · Sala Ágil</p>
            <h2 className="text-lg font-bold">📉 Burndown do Sprint</h2>
          </div>
          <Badge variant="outline" className="text-xs">{data.sprintName}</Badge>
        </div>
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
          <span>📅 Período: <strong>{data.periodStart} — {data.periodEnd}</strong></span>
          <span>🏢 Time: <strong>{data.teamName}</strong></span>
          <span>🕐 Emitido em: <strong>{now}</strong></span>
          <span>👤 Por: <strong>{emittedBy}</strong></span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={BarChart3}    label="Total Atividades" value={String(metrics.totalActs)} />
        <KpiCard icon={CheckCircle}  label="Concluídas"       value={String(metrics.closedActs)} accent="green" />
        <KpiCard icon={Clock}        label="Horas Restantes"  value={`${metrics.remainH}h`}
          accent={metrics.remainH === 0 ? 'green' : metrics.remainH > metrics.doneH ? 'red' : 'yellow'} />
        <KpiCard icon={TrendingDown} label="Burn Rate"        value={`${metrics.burnRate}h/dia`}
          sub={metrics.daysLeft !== null ? `~${metrics.daysLeft} dias restantes` : undefined}
          accent={metrics.onTrack ? 'green' : 'red'} />
      </div>

      {/* Status da sprint */}
      <Card className={metrics.onTrack ? 'border-[#22c55e]/40' : 'border-[#eab308]/40'}>
        <CardContent className="py-3 px-4 flex items-center gap-3">
          {metrics.onTrack
            ? <CheckCircle className="h-5 w-5 text-[#22c55e] shrink-0" />
            : <AlertTriangle className="h-5 w-5 text-[#eab308] shrink-0" />}
          <div>
            <p className={`text-sm font-semibold ${metrics.onTrack ? 'text-[#22c55e]' : 'text-[#eab308]'}`}>
              {metrics.onTrack ? '✅ Sprint no prazo' : '⚠️ Sprint em risco'}
            </p>
            <p className="text-xs text-muted-foreground">
              {metrics.doneH}h concluídas de {metrics.totalH}h totais ·
              {metrics.burnRate}h/dia de burn rate
              {metrics.daysLeft !== null && ` · estimativa: ${metrics.daysLeft} dias para zerar`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de burndown por dia */}
      {metrics.burnPoints.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-blue-500" /> Progresso Diário (Horas Concluídas)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 font-medium">Data</th>
                    <th className="text-center px-4 py-2 font-medium">Horas Concluídas (acum.)</th>
                    <th className="text-center px-4 py-2 font-medium">Horas Restantes</th>
                    <th className="px-4 py-2 font-medium min-w-[160px]">Progresso</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.burnPoints.map((p, i) => (
                    <tr key={p.date} className={`border-b last:border-0 ${i % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                      <td className="px-4 py-2 font-mono text-xs">{p.date}</td>
                      <td className="text-center px-4 py-2 text-[#22c55e] font-semibold">{p.done}h</td>
                      <td className="text-center px-4 py-2">{p.remaining}h</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-[#3b82f6]"
                              style={{ width: `${metrics.totalH > 0 ? Math.min((p.done / metrics.totalH) * 100, 100) : 0}%` }} />
                          </div>
                          <span className="text-xs w-8 text-right">
                            {metrics.totalH > 0 ? Math.round((p.done / metrics.totalH) * 100) : 0}%
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
      )}

      {/* Cumulative Flow */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-400" /> Cumulative Flow — Distribuição por Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(metrics.statusCounts).map(([status, count]) => (
            <div key={status} className="space-y-0.5">
              <div className="flex justify-between text-xs">
                <span className="capitalize font-medium">{status}</span>
                <span className="text-muted-foreground">{count} atividade{count !== 1 ? 's' : ''}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    status === 'Concluída' ? 'bg-[#22c55e]' : 'bg-[#3b82f6]'
                  }`}
                  style={{ width: `${metrics.totalActs > 0 ? (count / metrics.totalActs) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Rodapé */}
      <div className="border-t pt-3 flex justify-between text-[10px] text-muted-foreground">
        <span>NexOps · useSprintFlow · Relatório gerado automaticamente</span>
        <span>Emitido por {emittedBy} em {now}</span>
      </div>
    </div>
  );
}
