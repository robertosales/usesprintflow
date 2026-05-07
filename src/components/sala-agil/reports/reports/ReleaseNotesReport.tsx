import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReportData } from '../ReportExporter';
import { Rocket, CheckCircle, Bug, Tag, Users, FileText } from 'lucide-react';

interface ReleaseItem {
  code: string;
  title: string;
  type: 'feature' | 'bug' | 'improvement' | 'task';
  huCode: string;
  developer: string;
  hours: number;
}

interface Props {
  data: ReportData;
  emittedBy: string;
  version?: string;
  environment?: string;
  releaseItems?: ReleaseItem[];
}

const TYPE_STYLE: Record<string, { label: string; style: string; icon: React.ElementType }> = {
  feature:     { label: 'Feature',     style: 'bg-[#22c55e]/15 text-[#22c55e]',  icon: Rocket },
  improvement: { label: 'Melhoria',    style: 'bg-[#3b82f6]/15 text-[#3b82f6]',  icon: CheckCircle },
  bug:         { label: 'Bug Fix',     style: 'bg-destructive/15 text-destructive', icon: Bug },
  task:        { label: 'Tarefa',      style: 'bg-muted text-muted-foreground',    icon: FileText },
};

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

export function ReleaseNotesReport({ data, emittedBy, version = '1.0.0', environment = 'Produção', releaseItems }: Props) {
  const now = new Date().toLocaleString('pt-BR');

  // Se releaseItems não vier via prop, deriva das atividades concluídas
  const items: ReleaseItem[] = useMemo(() => {
    if (releaseItems) return releaseItems;
    return data.activities
      .filter(a => a.status === 'Concluída')
      .map(a => ({
        code: a.code,
        title: a.title,
        type: (a.type === 'bug' ? 'bug' : a.type === 'improvement' ? 'improvement' : 'feature') as ReleaseItem['type'],
        huCode: a.huCode,
        developer: a.developerName.split(' ')[0],
        hours: a.hours,
      }));
  }, [releaseItems, data.activities]);

  const metrics = useMemo(() => {
    const features     = items.filter(i => i.type === 'feature' || i.type === 'improvement');
    const bugFixes     = items.filter(i => i.type === 'bug');
    const totalHours   = items.reduce((s, i) => s + i.hours, 0);
    const devs         = [...new Set(items.map(i => i.developer))];
    return { total: items.length, features: features.length, bugFixes: bugFixes.length, totalHours, devs };
  }, [items]);

  const groupedByType = useMemo(() => {
    const groups: Partial<Record<ReleaseItem['type'], ReleaseItem[]>> = {};
    items.forEach(item => {
      if (!groups[item.type]) groups[item.type] = [];
      groups[item.type]!.push(item);
    });
    return groups;
  }, [items]);

  return (
    <div className="space-y-5">
      {/* Cabeçalho institucional */}
      <div className="rounded-lg border bg-gradient-to-r from-emerald-50 to-white p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">NexOps · Sala Ágil</p>
            <h2 className="text-lg font-bold">📋 Release Notes</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-100 text-emerald-700 text-xs">v{version}</Badge>
            <Badge variant="outline" className="text-xs">{environment}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
          <span>🚀 Sprint: <strong>{data.sprintName}</strong></span>
          <span>📅 Período: <strong>{data.periodStart} — {data.periodEnd}</strong></span>
          <span>🏢 Time: <strong>{data.teamName}</strong></span>
          <span>🕐 Emitido em: <strong>{now}</strong></span>
          <span>👤 Por: <strong>{emittedBy}</strong></span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={Rocket}      label="Total Entregues" value={String(metrics.total)} />
        <KpiCard icon={CheckCircle} label="Features/Melhorias" value={String(metrics.features)} accent="green" />
        <KpiCard icon={Bug}         label="Bug Fixes"       value={String(metrics.bugFixes)}
          accent={metrics.bugFixes > 0 ? 'red' : 'green'} />
        <KpiCard icon={Users}       label="Contribuidores"  value={String(metrics.devs.length)} accent="blue" />
      </div>

      {/* Itens agrupados por tipo */}
      {(Object.entries(groupedByType) as [ReleaseItem['type'], ReleaseItem[]][]).map(([type, typeItems]) => {
        const meta = TYPE_STYLE[type] ?? TYPE_STYLE.task;
        const Icon = meta.icon;
        return (
          <Card key={type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{meta.label}s</span>
                <Badge className={`text-[10px] ${meta.style}`}>{typeItems.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-2 font-medium">Código</th>
                      <th className="text-left px-4 py-2 font-medium">Título</th>
                      <th className="text-center px-3 py-2 font-medium">HU</th>
                      <th className="text-center px-3 py-2 font-medium">Responsável</th>
                      <th className="text-center px-3 py-2 font-medium">Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeItems.map((item, i) => (
                      <tr key={item.code} className={`border-b last:border-0 ${i % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                        <td className="px-4 py-2 font-mono text-xs font-bold">{item.code}</td>
                        <td className="px-4 py-2 max-w-[260px] truncate">{item.title}</td>
                        <td className="text-center px-3 py-2 font-mono text-xs">{item.huCode}</td>
                        <td className="text-center px-3 py-2 text-xs">{item.developer}</td>
                        <td className="text-center px-3 py-2 font-semibold">{item.hours}h</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20 font-semibold">
                      <td className="px-4 py-2 text-xs" colSpan={4}>Total</td>
                      <td className="text-center px-3 py-2 text-xs">{typeItems.reduce((s, i) => s + i.hours, 0)}h</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {items.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Tag className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhuma atividade concluída para incluir no release.</p>
          </CardContent>
        </Card>
      )}

      {/* Campo de observações */}
      <Card className="border-emerald-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-emerald-700">📝 Observações do Release</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            rows={4}
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-emerald-400 placeholder:text-muted-foreground"
            placeholder="Notas adicionais, dependências, instruções de deploy, rollback..."
          />
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
