import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ReportData } from '../ReportExporter';
import {
  Rocket, Target, CheckCircle, Clock, TrendingUp,
  Users, AlertTriangle, Zap, ShieldAlert, BarChart3,
} from 'lucide-react';

interface Props {
  data: ReportData;
  emittedBy: string;
  sprintGoal?: string;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
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

// ── SprintReport ──────────────────────────────────────────────────────────────
export function SprintReport({ data, emittedBy, sprintGoal }: Props) {
  const now = new Date().toLocaleString('pt-BR');

  // ── Métricas consolidadas ─────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const acts       = data.activities;
    const closed     = acts.filter(a => a.status === 'Concluída');
    const bugs       = acts.filter(a => a.type === 'bug');
    const bugsClosed = bugs.filter(a => a.status === 'Concluída');

    // HUs únicas referenciadas pelas atividades
    const huCodes    = [...new Set(acts.map(a => a.huCode).filter(c => c !== '?'))];
    const huDone     = [...new Set(closed.map(a => a.huCode).filter(c => c !== '?'))];

    const totalHours = acts.reduce((s, a) => s + a.hours, 0);
    const doneHours  = closed.reduce((s, a) => s + a.hours, 0);
    const commitment = huCodes.length > 0 ? Math.round((huDone.length / huCodes.length) * 100) : 0;
    const velocity   = doneHours; // proxy: horas entregues (SP viriam de outro campo)

    // Por membro
    const byMember = data.developers.map(dev => {
      const devActs  = acts.filter(a => a.developerName === dev.name);
      const devDone  = devActs.filter(a => a.status === 'Concluída');
      const devHours = devActs.reduce((s, a) => s + a.hours, 0);
      const devDoneH = devDone.reduce((s, a) => s + a.hours, 0);
      const eff      = devHours > 0 ? Math.round((devDoneH / devHours) * 100) : 0;
      return { ...dev, total: devActs.length, done: devDone.length, hours: devHours, doneHours: devDoneH, eff };
    }).filter(m => m.total > 0);

    // Por tipo de atividade
    const byType: Record<string, { total: number; done: number }> = {};
    acts.forEach(a => {
      if (!byType[a.type]) byType[a.type] = { total: 0, done: 0 };
      byType[a.type].total++;
      if (a.status === 'Concluída') byType[a.type].done++;
    });

    return {
      totalActs: acts.length,
      closedActs: closed.length,
      totalHUs: huCodes.length,
      doneHUs: huDone.length,
      totalHours,
      doneHours,
      commitment,
      bugsTotal: bugs.length,
      bugsClosed: bugsClosed.length,
      byMember,
      byType,
    };
  }, [data]);

  return (
    <div className="space-y-5">

      {/* ── Cabeçalho institucional ───────────────────────────────────────── */}
      <div className="rounded-lg border bg-gradient-to-r from-violet-50 to-white p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">NexOps · Sala Ágil</p>
            <h2 className="text-lg font-bold">🚀 Sprint Report</h2>
          </div>
          <Badge variant="outline" className="text-xs font-mono">{data.sprintName}</Badge>
        </div>
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
          <span>📅 Período: <strong>{data.periodStart} — {data.periodEnd}</strong></span>
          <span>🏢 Time: <strong>{data.teamName}</strong></span>
          <span>👥 Membros: <strong>{data.developers.length}</strong></span>
          <span>🕐 Emitido em: <strong>{now}</strong></span>
          <span>👤 Por: <strong>{emittedBy}</strong></span>
        </div>
        {sprintGoal && (
          <div className="mt-2 bg-violet-50 border border-violet-200 rounded p-2 text-xs">
            <span className="font-semibold text-violet-700">🎯 Meta da Sprint:</span>{' '}
            <span className="text-violet-600">{sprintGoal}</span>
          </div>
        )}
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <KpiCard icon={Target}      label="HUs Planejadas"  value={String(metrics.totalHUs)} />
        <KpiCard icon={CheckCircle} label="HUs Entregues"   value={String(metrics.doneHUs)}   accent="green" />
        <KpiCard icon={TrendingUp}  label="Commitment"      value={`${metrics.commitment}%`}
          accent={metrics.commitment >= 80 ? 'green' : metrics.commitment >= 60 ? 'yellow' : 'red'} />
        <KpiCard icon={Zap}         label="Horas Entregues" value={`${metrics.doneHours}h`}    accent="blue" />
        <KpiCard icon={Clock}       label="Horas Planejadas" value={`${metrics.totalHours}h`} />
        <KpiCard icon={BarChart3}   label="Atividades"      value={String(metrics.totalActs)} />
        <KpiCard icon={CheckCircle} label="Concluídas"      value={String(metrics.closedActs)} accent="green" />
        <KpiCard icon={ShieldAlert} label="Bugs"            value={`${metrics.bugsClosed}/${metrics.bugsTotal}`}
          accent={metrics.bugsTotal > 0 ? 'red' : 'green'} />
      </div>

      {/* ── Progresso geral ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-violet-500" /> Progresso Geral da Sprint
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>HUs Entregues</span>
              <span className="font-semibold">{metrics.doneHUs}/{metrics.totalHUs}</span>
            </div>
            <Progress value={metrics.totalHUs > 0 ? (metrics.doneHUs / metrics.totalHUs) * 100 : 0}
              className="h-2" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Atividades Concluídas</span>
              <span className="font-semibold">{metrics.closedActs}/{metrics.totalActs}</span>
            </div>
            <Progress value={metrics.totalActs > 0 ? (metrics.closedActs / metrics.totalActs) * 100 : 0}
              className="h-2" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Horas Entregues</span>
              <span className="font-semibold">{metrics.doneHours}h / {metrics.totalHours}h</span>
            </div>
            <Progress value={metrics.totalHours > 0 ? (metrics.doneHours / metrics.totalHours) * 100 : 0}
              className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* ── Por tipo de atividade ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-400" /> Atividades por Tipo
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2 font-medium">Tipo</th>
                  <th className="text-center px-4 py-2 font-medium">Total</th>
                  <th className="text-center px-4 py-2 font-medium">Concluídas</th>
                  <th className="text-center px-4 py-2 font-medium">Pendentes</th>
                  <th className="px-4 py-2 font-medium min-w-[140px]">Progresso</th>
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

      {/* ── Desempenho por membro ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-500" /> Desempenho do Time
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2 font-medium">Membro</th>
                  <th className="text-left px-4 py-2 font-medium">Cargo</th>
                  <th className="text-center px-3 py-2 font-medium">Total</th>
                  <th className="text-center px-3 py-2 font-medium">Feitas</th>
                  <th className="text-center px-3 py-2 font-medium">Horas</th>
                  <th className="text-center px-3 py-2 font-medium">H. Entregues</th>
                  <th className="px-4 py-2 font-medium min-w-[120px]">Eficiência</th>
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

      {/* ── Bloco de retrospectiva ────────────────────────────────────────── */}
      <Card className="border-violet-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-violet-700">📝 Espaço para Retrospectiva</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: '✅ O que foi bem nesta sprint?',   rows: 3 },
            { label: '⚠️ O que pode melhorar?',          rows: 3 },
            { label: '🎯 Ações para próxima sprint',     rows: 3 },
          ].map(({ label, rows }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
              <textarea
                rows={rows}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-violet-400 placeholder:text-muted-foreground"
                placeholder="Clique para preencher antes de exportar..."
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Rodapé ────────────────────────────────────────────────────────── */}
      <div className="border-t pt-3 flex justify-between text-[10px] text-muted-foreground">
        <span>NexOps · useSprintFlow · Relatório gerado automaticamente</span>
        <span>Emitido por {emittedBy} em {now}</span>
      </div>
    </div>
  );
}
