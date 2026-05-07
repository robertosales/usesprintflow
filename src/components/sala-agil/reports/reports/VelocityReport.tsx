import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ReportData } from '../ReportExporter';
import { TrendingUp, Target, CheckCircle, Clock, Zap, BarChart3, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface Props {
  data: ReportData;
  emittedBy: string;
  allSprintData?: { sprintName: string; planned: number; delivered: number; commitment: number }[];
}

function KpiCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  accent?: 'green' | 'red' | 'yellow' | 'blue' | 'purple';
}) {
  const colors: Record<string, string> = {
    green: 'text-[#22c55e]', red: 'text-destructive',
    yellow: 'text-[#eab308]', blue: 'text-[#3b82f6]', purple: 'text-[#8b5cf6]',
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

function TrendChip({ value, prev }: { value: number; prev: number }) {
  if (prev === 0) return null;
  const diff = value - prev;
  const pct  = Math.round(Math.abs(diff / prev) * 100);
  if (diff === 0) return <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><Minus className="h-3 w-3" /> Estável</span>;
  const up = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${ up ? 'text-[#22c55e]' : 'text-destructive'}`}>
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {pct}% vs. sprint anterior
    </span>
  );
}

export function VelocityReport({ data, emittedBy, allSprintData = [] }: Props) {
  const now = new Date().toLocaleString('pt-BR');

  const metrics = useMemo(() => {
    const acts      = data.activities;
    const closed    = acts.filter(a => a.status === 'Concluída');
    const huCodes   = [...new Set(acts.map(a => a.huCode).filter(c => c !== '?'))];
    const huDone    = [...new Set(closed.map(a => a.huCode).filter(c => c !== '?'))];
    const totalH    = acts.reduce((s, a) => s + a.hours, 0);
    const doneH     = closed.reduce((s, a) => s + a.hours, 0);
    const commitment = huCodes.length > 0 ? Math.round((huDone.length / huCodes.length) * 100) : 0;

    // Throughput: atividades concluídas por membro
    const byMember = data.developers.map(dev => {
      const devActs  = acts.filter(a => a.developerName === dev.name);
      const devDone  = devActs.filter(a => a.status === 'Concluída');
      const devH     = devActs.reduce((s, a) => s + a.hours, 0);
      const devDoneH = devDone.reduce((s, a) => s + a.hours, 0);
      const eff      = devH > 0 ? Math.round((devDoneH / devH) * 100) : 0;
      const throughput = devDone.length; // atividades/sprint
      return { ...dev, total: devActs.length, done: devDone.length, hours: devH, doneHours: devDoneH, eff, throughput };
    }).filter(m => m.total > 0).sort((a, b) => b.throughput - a.throughput);

    // Trend vs sprint anterior (usa allSprintData se disponível)
    const prevSprint  = allSprintData.length >= 2 ? allSprintData[allSprintData.length - 2] : null;
    const prevCommit  = prevSprint?.commitment ?? 0;
    const prevDeliv   = prevSprint?.delivered ?? 0;

    return { totalActs: acts.length, closedActs: closed.length, totalHUs: huCodes.length, doneHUs: huDone.length, totalH, doneH, commitment, byMember, prevCommit, prevDeliv };
  }, [data, allSprintData]);

  // Histórico de sprints para tabela de tendência
  const historyRows = allSprintData.length > 0 ? allSprintData : [
    { sprintName: data.sprintName, planned: metrics.totalHUs, delivered: metrics.doneHUs, commitment: metrics.commitment },
  ];

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="rounded-lg border bg-gradient-to-r from-purple-50 to-white p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">NexOps · Sala Ágil</p>
            <h2 className="text-lg font-bold">📈 Relatório de Velocity & Tendência</h2>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={Target}      label="HUs Planejadas"  value={String(metrics.totalHUs)} />
        <KpiCard icon={CheckCircle} label="HUs Entregues"   value={String(metrics.doneHUs)}  accent="green" />
        <KpiCard icon={TrendingUp}  label="Commitment"      value={`${metrics.commitment}%`}
          accent={metrics.commitment >= 80 ? 'green' : metrics.commitment >= 60 ? 'yellow' : 'red'} />
        <KpiCard icon={Zap}         label="Horas Entregues" value={`${metrics.doneH}h`}       accent="blue" />
        <KpiCard icon={Clock}       label="Horas Planejadas" value={`${metrics.totalH}h`} />
        <KpiCard icon={BarChart3}   label="Throughput"      value={String(metrics.closedActs)}
          sub="atividades concluídas" accent="purple" />
      </div>

      {/* Progresso + tendência */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" /> Progresso da Sprint
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>HUs Entregues</span>
                <span className="font-semibold">{metrics.doneHUs}/{metrics.totalHUs}</span>
              </div>
              <Progress value={metrics.totalHUs > 0 ? (metrics.doneHUs / metrics.totalHUs) * 100 : 0} className="h-2" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Commitment Accuracy</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{metrics.commitment}%</span>
                  <TrendChip value={metrics.commitment} prev={metrics.prevCommit} />
                </div>
              </div>
              <Progress value={metrics.commitment} className="h-2" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Horas Entregues</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{metrics.doneH}h / {metrics.totalH}h</span>
                  <TrendChip value={metrics.doneH} prev={metrics.prevDeliv} />
                </div>
              </div>
              <Progress value={metrics.totalH > 0 ? (metrics.doneH / metrics.totalH) * 100 : 0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Throughput por membro */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-400" /> Throughput por Membro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {metrics.byMember.map(m => (
              <div key={m.id} className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{m.name.split(' ')[0]}</span>
                  <span className="text-muted-foreground">{m.done} ativ. · {m.doneHours}h · {m.eff}% efic.</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${ m.eff >= 80 ? 'bg-[#22c55e]' : m.eff >= 60 ? 'bg-[#eab308]' : 'bg-destructive'}`}
                    style={{ width: `${Math.min(m.eff, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {metrics.byMember.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma atividade concluída.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Histórico de sprints */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-500" /> Histórico de Velocity por Sprint
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2 font-medium">Sprint</th>
                  <th className="text-center px-4 py-2 font-medium">HUs Planejadas</th>
                  <th className="text-center px-4 py-2 font-medium">HUs Entregues</th>
                  <th className="text-center px-4 py-2 font-medium">Commitment</th>
                  <th className="px-4 py-2 font-medium min-w-[140px]">Progresso</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((row, i) => (
                  <tr key={row.sprintName} className={`border-b last:border-0 ${ i === historyRows.length - 1 ? 'bg-purple-50 font-semibold' : i % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                    <td className="px-4 py-2">
                      {row.sprintName}
                      {i === historyRows.length - 1 && <Badge className="ml-2 text-[10px] bg-purple-100 text-purple-700">atual</Badge>}
                    </td>
                    <td className="text-center px-4 py-2">{row.planned}</td>
                    <td className="text-center px-4 py-2 text-[#22c55e]">{row.delivered}</td>
                    <td className="text-center px-4 py-2">
                      <Badge className={`text-[10px] ${ row.commitment >= 80 ? 'bg-[#22c55e]/15 text-[#22c55e]' : row.commitment >= 60 ? 'bg-[#eab308]/15 text-[#eab308]' : 'bg-destructive/15 text-destructive'}`}>
                        {row.commitment}%
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <Progress value={row.planned > 0 ? (row.delivered / row.planned) * 100 : 0} className="h-1.5" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
