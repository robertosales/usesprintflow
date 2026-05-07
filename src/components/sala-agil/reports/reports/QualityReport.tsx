import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ReportData } from '../ReportExporter';
import { Bug, CheckCircle, AlertTriangle, ShieldAlert, TrendingDown, Users } from 'lucide-react';

interface Props {
  data: ReportData;
  emittedBy: string;
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

export function QualityReport({ data, emittedBy }: Props) {
  const now = new Date().toLocaleString('pt-BR');

  const metrics = useMemo(() => {
    const bugs        = data.activities.filter(a => a.type === 'bug');
    const bugsClosed  = bugs.filter(a => a.status === 'Concluída');
    const bugsOpen    = bugs.filter(a => a.status !== 'Concluída');
    const resolutionRate = bugs.length > 0 ? Math.round((bugsClosed.length / bugs.length) * 100) : 0;

    // Bugs por tipo de atividade / categoria
    const byCategory: Record<string, { total: number; closed: number }> = {};
    bugs.forEach(b => {
      const cat = b.huCode || 'sem-hu';
      if (!byCategory[cat]) byCategory[cat] = { total: 0, closed: 0 };
      byCategory[cat].total++;
      if (b.status === 'Concluída') byCategory[cat].closed++;
    });

    // Bugs por membro
    const byMember = data.developers.map(dev => {
      const devBugs   = bugs.filter(b => b.developerName === dev.name);
      const devClosed = devBugs.filter(b => b.status === 'Concluída');
      const rate      = devBugs.length > 0 ? Math.round((devClosed.length / devBugs.length) * 100) : 0;
      return { ...dev, total: devBugs.length, closed: devClosed.length, rate };
    }).filter(m => m.total > 0).sort((a, b) => b.total - a.total);

    // Horas gastas em bugs
    const bugHours      = bugs.reduce((s, b) => s + b.hours, 0);
    const totalHours    = data.activities.reduce((s, a) => s + a.hours, 0);
    const bugHoursRate  = totalHours > 0 ? Math.round((bugHours / totalHours) * 100) : 0;

    return { bugs, bugsClosed, bugsOpen, resolutionRate, byCategory, byMember, bugHours, totalHours, bugHoursRate };
  }, [data]);

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="rounded-lg border bg-gradient-to-r from-red-50 to-white p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">NexOps · Sala Ágil</p>
            <h2 className="text-lg font-bold">🐛 Relatório de Qualidade & Bugs</h2>
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
        <KpiCard icon={Bug}          label="Total de Bugs"     value={String(metrics.bugs.length)} />
        <KpiCard icon={CheckCircle}  label="Bugs Resolvidos"   value={String(metrics.bugsClosed.length)} accent="green" />
        <KpiCard icon={AlertTriangle} label="Bugs em Aberto"   value={String(metrics.bugsOpen.length)}
          accent={metrics.bugsOpen.length > 0 ? 'red' : 'green'} />
        <KpiCard icon={TrendingDown} label="Taxa de Resolução" value={`${metrics.resolutionRate}%`}
          accent={metrics.resolutionRate >= 80 ? 'green' : metrics.resolutionRate >= 50 ? 'yellow' : 'red'} />
      </div>

      {/* Horas em bugs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-500" /> Impacto de Bugs nas Horas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Horas gastas em bugs: <strong>{metrics.bugHours}h</strong> de <strong>{metrics.totalHours}h</strong> totais</span>
            <span className="font-semibold text-destructive">{metrics.bugHoursRate}% do esforço</span>
          </div>
          <Progress value={metrics.bugHoursRate} className="h-2" />
        </CardContent>
      </Card>

      {/* Bugs por membro */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-red-400" /> Bugs por Membro
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {metrics.byMember.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-[#22c55e]">
              <CheckCircle className="h-5 w-5" /> Nenhum bug registrado neste período.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 font-medium">Membro</th>
                    <th className="text-left px-4 py-2 font-medium">Cargo</th>
                    <th className="text-center px-3 py-2 font-medium">Bugs</th>
                    <th className="text-center px-3 py-2 font-medium">Resolvidos</th>
                    <th className="text-center px-3 py-2 font-medium">Abertos</th>
                    <th className="px-4 py-2 font-medium min-w-[140px]">Taxa Resolução</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.byMember.map((m, i) => (
                    <tr key={m.id} className={`border-b last:border-0 ${i % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                      <td className="px-4 py-2.5 font-medium">{m.name}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">{m.role}</td>
                      <td className="text-center px-3 py-2.5 font-semibold">{m.total}</td>
                      <td className="text-center px-3 py-2.5 text-[#22c55e] font-semibold">{m.closed}</td>
                      <td className="text-center px-3 py-2.5">
                        {m.total - m.closed > 0
                          ? <span className="text-destructive font-semibold">{m.total - m.closed}</span>
                          : <span className="text-muted-foreground">0</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${
                              m.rate >= 80 ? 'bg-[#22c55e]' : m.rate >= 50 ? 'bg-[#eab308]' : 'bg-destructive'
                            }`} style={{ width: `${Math.min(m.rate, 100)}%` }} />
                          </div>
                          <span className="text-xs font-semibold w-10 text-right">{m.rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de bugs em aberto */}
      {metrics.bugsOpen.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Bugs em Aberto ({metrics.bugsOpen.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-1.5 font-medium">Código</th>
                    <th className="text-left px-4 py-1.5 font-medium">Título</th>
                    <th className="text-center px-3 py-1.5 font-medium">Responsável</th>
                    <th className="text-center px-3 py-1.5 font-medium">HU</th>
                    <th className="text-center px-3 py-1.5 font-medium">Horas</th>
                    <th className="text-center px-3 py-1.5 font-medium">Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.bugsOpen.map((b, i) => (
                    <tr key={b.id} className={`border-b last:border-0 ${i % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                      <td className="px-4 py-1.5 font-mono font-bold">{b.code}</td>
                      <td className="px-4 py-1.5 max-w-[220px] truncate">{b.title}</td>
                      <td className="text-center px-3 py-1.5">{b.developerName.split(' ')[0]}</td>
                      <td className="text-center px-3 py-1.5 font-mono">{b.huCode}</td>
                      <td className="text-center px-3 py-1.5">{b.hours}h</td>
                      <td className="text-center px-3 py-1.5">{b.endDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rodapé */}
      <div className="border-t pt-3 flex justify-between text-[10px] text-muted-foreground">
        <span>NexOps · useSprintFlow · Relatório gerado automaticamente</span>
        <span>Emitido por {emittedBy} em {now}</span>
      </div>
    </div>
  );
}
