import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ReportData } from '../ReportExporter';
import { CheckCircle, Clock, Bug, TrendingUp, User, Target, Zap, AlertTriangle } from 'lucide-react';

interface Props {
  data: ReportData;
  emittedBy: string;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: 'green' | 'red' | 'yellow' | 'blue';
}) {
  const colors = {
    green:  'text-[#22c55e]',
    red:    'text-destructive',
    yellow: 'text-[#eab308]',
    blue:   'text-[#3b82f6]',
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

// ── Efficiency bar ────────────────────────────────────────────────────────────
function EfficiencyBar({ value }: { value: number }) {
  const color =
    value >= 80 ? 'bg-[#22c55e]' : value >= 60 ? 'bg-[#eab308]' : 'bg-destructive';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs font-semibold w-10 text-right">{value}%</span>
    </div>
  );
}

// ── IndividualReport ──────────────────────────────────────────────────────────
export function IndividualReport({ data, emittedBy }: Props) {
  const now = new Date().toLocaleString('pt-BR');

  // Agrega métricas por desenvolvedor
  const memberStats = useMemo(() => {
    return data.developers.map(dev => {
      const devActs = data.activities.filter(a => a.developerName === dev.name);
      const closed   = devActs.filter(a => a.status === 'Concluída');
      const bugs     = devActs.filter(a => a.type === 'bug');
      const bugsClosed = bugs.filter(a => a.status === 'Concluída');
      const hoursTotal     = devActs.reduce((s, a) => s + a.hours, 0);
      const hoursClosed    = closed.reduce((s, a) => s + a.hours, 0);
      const efficiency     = hoursTotal > 0 ? Math.round((hoursClosed / hoursTotal) * 100) : 0;
      const avgHours       = closed.length > 0 ? Math.round((hoursClosed / closed.length) * 10) / 10 : 0;
      const bugRate        = devActs.length > 0 ? Math.round((bugs.length / devActs.length) * 100) : 0;
      return {
        ...dev,
        total:      devActs.length,
        completed:  closed.length,
        pending:    devActs.length - closed.length,
        hoursTotal,
        hoursClosed,
        efficiency,
        avgHours,
        bugsTotal:  bugs.length,
        bugsFixed:  bugsClosed.length,
        bugRate,
      };
    }).sort((a, b) => b.efficiency - a.efficiency);
  }, [data]);

  const totals = useMemo(() => ({
    activities:  data.activities.length,
    completed:   data.activities.filter(a => a.status === 'Concluída').length,
    hours:       data.activities.reduce((s, a) => s + a.hours, 0),
    hoursDone:   data.activities.filter(a => a.status === 'Concluída').reduce((s, a) => s + a.hours, 0),
    avgEff:      memberStats.length > 0
                   ? Math.round(memberStats.reduce((s, m) => s + m.efficiency, 0) / memberStats.length)
                   : 0,
  }), [data.activities, memberStats]);

  return (
    <div className="space-y-5">

      {/* ── Cabeçalho institucional ───────────────────────────────────────── */}
      <div className="rounded-lg border bg-gradient-to-r from-indigo-50 to-white p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">NexOps · Sala Ágil</p>
            <h2 className="text-lg font-bold">👤 Relatório de Desempenho Individual</h2>
          </div>
          <Badge variant="outline" className="text-xs">{data.sprintName}</Badge>
        </div>
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
          <span>📅 Período: <strong>{data.periodStart} — {data.periodEnd}</strong></span>
          <span>🏢 Time: <strong>{data.teamName}</strong></span>
          <span>👥 Membros: <strong>{data.developers.length}</strong></span>
          <span>🕐 Emitido em: <strong>{now}</strong></span>
          <span>👤 Por: <strong>{emittedBy}</strong></span>
        </div>
      </div>

      {/* ── KPIs gerais ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KpiCard icon={Target}    label="Atividades"    value={String(totals.activities)} />
        <KpiCard icon={CheckCircle} label="Concluídas"  value={String(totals.completed)}  accent="green" />
        <KpiCard icon={Clock}     label="Horas Plan."   value={`${totals.hours}h`} />
        <KpiCard icon={Zap}       label="Horas Feitas"  value={`${totals.hoursDone}h`}    accent="blue" />
        <KpiCard icon={TrendingUp} label="Efic. Média"  value={`${totals.avgEff}%`}
          accent={totals.avgEff >= 80 ? 'green' : totals.avgEff >= 60 ? 'yellow' : 'red'} />
      </div>

      {/* ── Tabela por membro ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-500" /> Desempenho por Membro
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2 font-medium">Membro</th>
                  <th className="text-left px-4 py-2 font-medium">Cargo</th>
                  <th className="text-center px-3 py-2 font-medium">Atividades</th>
                  <th className="text-center px-3 py-2 font-medium">Concluídas</th>
                  <th className="text-center px-3 py-2 font-medium">Pendentes</th>
                  <th className="text-center px-3 py-2 font-medium">Horas Plan.</th>
                  <th className="text-center px-3 py-2 font-medium">Horas Feitas</th>
                  <th className="text-center px-3 py-2 font-medium">Bugs</th>
                  <th className="px-4 py-2 font-medium min-w-[140px]">Eficiência</th>
                </tr>
              </thead>
              <tbody>
                {memberStats.map((m, idx) => (
                  <tr key={m.id} className={`border-b last:border-0 ${idx % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                    <td className="px-4 py-2.5 font-medium">{m.name}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">{m.role}</td>
                    <td className="text-center px-3 py-2.5">{m.total}</td>
                    <td className="text-center px-3 py-2.5">
                      <span className="text-[#22c55e] font-semibold">{m.completed}</span>
                    </td>
                    <td className="text-center px-3 py-2.5">
                      {m.pending > 0
                        ? <span className="text-[#eab308] font-semibold">{m.pending}</span>
                        : <span className="text-muted-foreground">0</span>}
                    </td>
                    <td className="text-center px-3 py-2.5">{m.hoursTotal}h</td>
                    <td className="text-center px-3 py-2.5 font-semibold">{m.hoursClosed}h</td>
                    <td className="text-center px-3 py-2.5">
                      {m.bugsTotal > 0
                        ? <Badge className="text-[10px] bg-destructive/15 text-destructive">{m.bugsFixed}/{m.bugsTotal}</Badge>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <EfficiencyBar value={m.efficiency} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30 font-semibold">
                  <td className="px-4 py-2" colSpan={2}>Total / Média</td>
                  <td className="text-center px-3 py-2">{totals.activities}</td>
                  <td className="text-center px-3 py-2 text-[#22c55e]">{totals.completed}</td>
                  <td className="text-center px-3 py-2">{totals.activities - totals.completed}</td>
                  <td className="text-center px-3 py-2">{totals.hours}h</td>
                  <td className="text-center px-3 py-2">{totals.hoursDone}h</td>
                  <td className="text-center px-3 py-2">—</td>
                  <td className="px-4 py-2">
                    <EfficiencyBar value={totals.avgEff} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Detalhe de atividades por membro ──────────────────────────────── */}
      {memberStats.map(m => (
        <Card key={m.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-400" />
              {m.name}
              <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
              <Badge className={`text-[10px] ml-auto ${
                m.efficiency >= 80 ? 'bg-[#22c55e]/15 text-[#22c55e]'
                : m.efficiency >= 60 ? 'bg-[#eab308]/15 text-[#eab308]'
                : 'bg-destructive/15 text-destructive'
              }`}>{m.efficiency}% eficiência</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {m.total === 0 ? (
              <p className="text-xs text-muted-foreground px-4 py-3">Nenhuma atividade no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-1.5 font-medium">Código</th>
                      <th className="text-left px-4 py-1.5 font-medium">Título</th>
                      <th className="text-center px-3 py-1.5 font-medium">Tipo</th>
                      <th className="text-center px-3 py-1.5 font-medium">Status</th>
                      <th className="text-center px-3 py-1.5 font-medium">Início</th>
                      <th className="text-center px-3 py-1.5 font-medium">Fim</th>
                      <th className="text-center px-3 py-1.5 font-medium">Horas</th>
                      <th className="text-center px-3 py-1.5 font-medium">HU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.activities
                      .filter(a => a.developerName === m.name)
                      .map((a, i) => (
                        <tr key={a.id} className={`border-b last:border-0 ${i % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                          <td className="px-4 py-1.5 font-mono font-bold">{a.code}</td>
                          <td className="px-4 py-1.5 max-w-[220px] truncate">{a.title}</td>
                          <td className="text-center px-3 py-1.5 capitalize">{a.type}</td>
                          <td className="text-center px-3 py-1.5">
                            <Badge className={`text-[10px] ${
                              a.status === 'Concluída'
                                ? 'bg-[#22c55e]/15 text-[#22c55e]'
                                : 'bg-[#3b82f6]/15 text-[#3b82f6]'
                            }`}>{a.status}</Badge>
                          </td>
                          <td className="text-center px-3 py-1.5">{a.startDate}</td>
                          <td className="text-center px-3 py-1.5">{a.endDate}</td>
                          <td className="text-center px-3 py-1.5 font-semibold">{a.hours}h</td>
                          <td className="text-center px-3 py-1.5 font-mono">{a.huCode}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* ── Rodapé ────────────────────────────────────────────────────────── */}
      <div className="border-t pt-3 flex justify-between text-[10px] text-muted-foreground">
        <span>NexOps · useSprintFlow · Relatório gerado automaticamente</span>
        <span>Emitido por {emittedBy} em {now}</span>
      </div>
    </div>
  );
}
