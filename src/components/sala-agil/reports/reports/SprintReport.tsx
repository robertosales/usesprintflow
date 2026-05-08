import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ReportData } from '../ReportExporter';
import { ReportHeader, ReportFooter } from '../ReportHeader';
import {
  Rocket, Target, CheckCircle, Clock, TrendingUp,
  Users, AlertTriangle, Zap, ShieldAlert, BarChart3,
} from 'lucide-react';

interface Props {
  data: ReportData;
  emittedBy: string;
  sprintGoal?: string;
}

function KpiCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: 'green' | 'red' | 'yellow' | 'blue' | 'purple';
}) {
  const colors: Record<string, string> = {
    green:  'text-[#22c55e]',
    red:    'text-destructive',
    yellow: 'text-[#eab308]',
    blue:   'text-[#3b82f6]',
    purple: 'text-[#8b5cf6]',
  };
  const color = accent ? colors[accent] : 'text-primary';
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

export function SprintReport({ data, emittedBy, sprintGoal }: Props) {
  const metrics = useMemo(() => {
    const acts       = data.activities;
    const closed     = acts.filter(a => a.status === 'Concluída');
    const bugs       = acts.filter(a => a.type === 'bug');
    const bugsClosed = bugs.filter(a => a.status === 'Concluída');
    const huCodes    = [...new Set(acts.map(a => a.huCode).filter(c => c !== '?'))];
    const huDone     = [...new Set(closed.map(a => a.huCode).filter(c => c !== '?'))];
    const totalHours = acts.reduce((s, a) => s + a.hours, 0);
    const doneHours  = closed.reduce((s, a) => s + a.hours, 0);
    const commitment = huCodes.length > 0 ? Math.round((huDone.length / huCodes.length) * 100) : 0;
    const byMember = data.developers.map(dev => {
      const devActs  = acts.filter(a => a.developerName === dev.name);
      const devDone  = devActs.filter(a => a.status === 'Concluída');
      const devHours = devActs.reduce((s, a) => s + a.hours, 0);
      const devDoneH = devDone.reduce((s, a) => s + a.hours, 0);
      const eff      = devHours > 0 ? Math.round((devDoneH / devHours) * 100) : 0;
      return { ...dev, total: devActs.length, done: devDone.length, hours: devHours, doneHours: devDoneH, eff };
    }).filter(m => m.total > 0);
    const byType: Record<string, { total: number; done: number }> = {};
    acts.forEach(a => {
      if (!byType[a.type]) byType[a.type] = { total: 0, done: 0 };
      byType[a.type].total++;
      if (a.status === 'Concluída') byType[a.type].done++;
    });
    return {
      totalActs: acts.length, closedActs: closed.length,
      totalHUs: huCodes.length, doneHUs: huDone.length,
      totalHours, doneHours, commitment,
      bugsTotal: bugs.length, bugsClosed: bugsClosed.length,
      byMember, byType,
    };
  }, [data]);

  return (
    <div className="space-y-5">
      <ReportHeader
        title="Sprint Report"
        icon="🚀"
        sprintName={data.sprintName}
        periodStart={data.periodStart}
        periodEnd={data.periodEnd}
        teamName={data.teamName}
        memberCount={data.developers.length}
        emittedBy={emittedBy}
        extra={
          sprintGoal ? (
            <div className="mt-2 rounded border border-primary/20 bg-primary/5 p-2 text-xs">
              <span className="font-semibold text-primary">🎯 Meta da Sprint:</span>{' '}
              <span className="text-foreground">{sprintGoal}</span>
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <KpiCard icon={Target}      label="HUs Planejadas"   value={String(metrics.totalHUs)} />
        <KpiCard icon={CheckCircle} label="HUs Entregues"    value={String(metrics.doneHUs)}   accent="green" />
        <KpiCard icon={TrendingUp}  label="Commitment"       value={`${metrics.commitment}%`}
          accent={metrics.commitment >= 80 ? 'green' : metrics.commitment >= 60 ? 'yellow' : 'red'} />
        <KpiCard icon={Zap}         label="Horas Entregues"  value={`${metrics.doneHours}h`}    accent="blue" />
        <KpiCard icon={Clock}       label="Horas Planejadas" value={`${metrics.totalHours}h`} />
        <KpiCard icon={BarChart3}   label="Atividades"       value={String(metrics.totalActs)} />
        <KpiCard icon={CheckCircle} label="Concluídas"       value={String(metrics.closedActs)} accent="green" />
        <KpiCard icon={ShieldAlert} label="Bugs"             value={`${metrics.bugsClosed}/${metrics.bugsTotal}`}
          accent={metrics.bugsTotal > 0 ? 'red' : 'green'} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Progresso Geral da Sprint
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'HUs Entregues',         val: metrics.doneHUs,   total: metrics.totalHUs,  suffix: '' },
            { label: 'Atividades Concluídas',  val: metrics.closedActs, total: metrics.totalActs, suffix: '' },
            { label: 'Horas Entregues',        val: metrics.doneHours, total: metrics.totalHours, suffix: 'h' },
          ].map(({ label, val, total, suffix }) => (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{label}</span>
                <span className="font-semibold">{val}{suffix}/{total}{suffix}</span>
              </div>
              <Progress value={total > 0 ? (val / total) * 100 : 0} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Atividades por Tipo
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {['Tipo','Total','Concluídas','Pendentes','Progresso'].map(h => (
                    <th key={h} className={`${h === 'Progresso' ? 'px-4 py-2 font-medium min-w-[140px]' : h === 'Tipo' ? 'text-left px-4 py-2 font-medium' : 'text-center px-4 py-2 font-medium'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(metrics.byType).map(([type, d], i) => (
                  <tr key={type} className={`border-b last:border-0 ${i % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                    <td className="px-4 py-2 capitalize font-medium">{type}</td>
                    <td className="text-center px-4 py-2">{d.total}</td>
                    <td className="text-center px-4 py-2 text-[#22c55e] font-semibold">{d.done}</td>
                    <td className="text-center px-4 py-2">
                      {d.total - d.done > 0
                        ? <span className="text-[#eab308] font-semibold">{d.total - d.done}</span>
                        : <span className="text-muted-foreground">0</span>}
                    </td>
                    <td className="px-4 py-2">
                      <Progress value={d.total > 0 ? (d.done / d.total) * 100 : 0} className="h-1.5" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Desempenho do Time
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {['Membro','Cargo','Total','Feitas','Horas','H. Entregues','Eficiência'].map((h, i) => (
                    <th key={h} className={`${i < 2 ? 'text-left px-4 py-2 font-medium' : i === 6 ? 'px-4 py-2 font-medium min-w-[120px]' : 'text-center px-3 py-2 font-medium'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.byMember.map((m, i) => (
                  <tr key={m.id} className={`border-b last:border-0 ${i % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                    <td className="px-4 py-2.5 font-medium">{m.name}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">{m.role}</td>
                    <td className="text-center px-3 py-2.5">{m.total}</td>
                    <td className="text-center px-3 py-2.5 text-[#22c55e] font-semibold">{m.done}</td>
                    <td className="text-center px-3 py-2.5">{m.hours}h</td>
                    <td className="text-center px-3 py-2.5 font-semibold">{m.doneHours}h</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              m.eff >= 80 ? 'bg-[#22c55e]' : m.eff >= 60 ? 'bg-[#eab308]' : 'bg-destructive'
                            }`}
                            style={{ width: `${Math.min(m.eff, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold w-10 text-right">{m.eff}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-primary">📝 Espaço para Retrospectiva</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: '✅ O que foi bem nesta sprint?', rows: 3 },
            { label: '⚠️ O que pode melhorar?',       rows: 3 },
            { label: '🎯 Ações para próxima sprint',   rows: 3 },
          ].map(({ label, rows }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
              <textarea
                rows={rows}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground text-foreground"
                placeholder="Clique para preencher antes de exportar..."
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <ReportFooter emittedBy={emittedBy} />
    </div>
  );
}
