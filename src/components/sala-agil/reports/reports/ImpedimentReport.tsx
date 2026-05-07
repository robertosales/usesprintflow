import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReportData } from '../ReportExporter';
import { ShieldAlert, CheckCircle, AlertTriangle, Clock, TrendingDown } from 'lucide-react';

interface ImpedimentItem {
  id: string;
  huCode: string;
  reason: string;
  type: string;
  criticality: 'critica' | 'alta' | 'media' | 'baixa';
  ticketId?: string;
  reportedAt: string;
  resolvedAt?: string;
  resolution?: string;
}

interface Props {
  data: ReportData;
  emittedBy: string;
  impediments?: ImpedimentItem[];
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

const CRITICALITY_STYLE: Record<string, string> = {
  critica: 'bg-destructive/15 text-destructive',
  alta:    'bg-[#eab308]/15 text-[#eab308]',
  media:   'bg-[#3b82f6]/15 text-[#3b82f6]',
  baixa:   'bg-muted text-muted-foreground',
};

export function ImpedimentReport({ data, emittedBy, impediments = [] }: Props) {
  const now = new Date().toLocaleString('pt-BR');

  const metrics = useMemo(() => {
    const resolved  = impediments.filter(i => !!i.resolvedAt);
    const open      = impediments.filter(i => !i.resolvedAt);
    const resRate   = impediments.length > 0 ? Math.round((resolved.length / impediments.length) * 100) : 0;

    // Tempo médio de resolução
    const withTime  = resolved.filter(i => i.reportedAt && i.resolvedAt);
    const avgDays   = withTime.length > 0
      ? Math.round(withTime.reduce((s, i) => {
          const diff = new Date(i.resolvedAt!).getTime() - new Date(i.reportedAt).getTime();
          return s + diff / 86400000;
        }, 0) / withTime.length * 10) / 10
      : 0;

    // Por criticidade
    const byCrit: Record<string, number> = { critica: 0, alta: 0, media: 0, baixa: 0 };
    impediments.forEach(i => { byCrit[i.criticality] = (byCrit[i.criticality] || 0) + 1; });

    return { total: impediments.length, resolved: resolved.length, open: open.length, resRate, avgDays, byCrit };
  }, [impediments]);

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="rounded-lg border bg-gradient-to-r from-amber-50 to-white p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">NexOps · Sala Ágil</p>
            <h2 className="text-lg font-bold">⚠️ Relatório de Impedimentos</h2>
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

      {impediments.length === 0 ? (
        <Card className="border-dashed border-[#22c55e]/40">
          <CardContent className="py-16 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-[#22c55e] opacity-60" />
            <p className="font-semibold text-[#22c55e]">Nenhum impedimento registrado neste período.</p>
            <p className="text-sm text-muted-foreground mt-1">O time está livre de bloqueios!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard icon={ShieldAlert}  label="Total"            value={String(metrics.total)} />
            <KpiCard icon={CheckCircle}  label="Resolvidos"       value={String(metrics.resolved)} accent="green" />
            <KpiCard icon={AlertTriangle} label="Em Aberto"       value={String(metrics.open)}
              accent={metrics.open > 0 ? 'red' : 'green'} />
            <KpiCard icon={Clock}        label="Tempo Méd. Resol." value={`${metrics.avgDays}d`}
              accent={metrics.avgDays <= 2 ? 'green' : metrics.avgDays <= 5 ? 'yellow' : 'red'} />
          </div>

          {/* Por criticidade */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-amber-500" /> Distribuição por Criticidade
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {Object.entries(metrics.byCrit).map(([crit, count]) => (
                count > 0 && (
                  <div key={crit} className="flex items-center gap-2">
                    <Badge className={`text-xs ${CRITICALITY_STYLE[crit]}`}>{crit}</Badge>
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                )
              ))}
            </CardContent>
          </Card>

          {/* Tabela completa */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" /> Histórico Completo ({impediments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-2 font-medium">HU</th>
                      <th className="text-left px-4 py-2 font-medium">Descrição</th>
                      <th className="text-center px-3 py-2 font-medium">Tipo</th>
                      <th className="text-center px-3 py-2 font-medium">Criticidade</th>
                      <th className="text-center px-3 py-2 font-medium">Chamado</th>
                      <th className="text-center px-3 py-2 font-medium">Reportado</th>
                      <th className="text-center px-3 py-2 font-medium">Resolvido</th>
                      <th className="text-center px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impediments.map((imp, i) => (
                      <tr key={imp.id} className={`border-b last:border-0 ${i % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                        <td className="px-4 py-2 font-mono text-xs font-bold">{imp.huCode}</td>
                        <td className="px-4 py-2 max-w-[200px] truncate text-xs">{imp.reason}</td>
                        <td className="text-center px-3 py-2 text-xs capitalize">{imp.type}</td>
                        <td className="text-center px-3 py-2">
                          <Badge className={`text-[10px] ${CRITICALITY_STYLE[imp.criticality]}`}>
                            {imp.criticality}
                          </Badge>
                        </td>
                        <td className="text-center px-3 py-2 text-xs">{imp.ticketId || '—'}</td>
                        <td className="text-center px-3 py-2 text-xs">
                          {new Date(imp.reportedAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="text-center px-3 py-2 text-xs">
                          {imp.resolvedAt ? new Date(imp.resolvedAt).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="text-center px-3 py-2">
                          {imp.resolvedAt
                            ? <Badge className="text-[10px] bg-[#22c55e]/15 text-[#22c55e] gap-1"><CheckCircle className="h-3 w-3" /> Resolvido</Badge>
                            : <Badge className="text-[10px] bg-[#eab308]/15 text-[#eab308] gap-1"><ShieldAlert className="h-3 w-3" /> Ativo</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Rodapé */}
      <div className="border-t pt-3 flex justify-between text-[10px] text-muted-foreground">
        <span>NexOps · useSprintFlow · Relatório gerado automaticamente</span>
        <span>Emitido por {emittedBy} em {now}</span>
      </div>
    </div>
  );
}
