// IndividualReport — Sala Ágil
// Mesmo padrão do BillingReport: sem Tipo, agrupado por HU, exporta PDF via generateReport
import { useState } from 'react';
import { getInitials, formatPersonName } from '@/lib/personName';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { ReportConfigModal } from '../ReportConfigModal';
import { generateReport, ReportData } from '../ReportExporter';
import { ReportHeader } from '../ReportHeader';
import { toast } from 'sonner';

interface Props {
  data: ReportData;
  sprints: { id: string; name: string }[];
  emittedBy: string;
  module?: 'agil' | 'sustentacao';
}

function groupByHU(acts: ReportData['activities']) {
  const map = new Map<string, { huCode: string; huTitle: string; acts: typeof acts; subtotal: number }>();
  for (const a of acts) {
    const key = a.huCode || 'SEM-HU';
    if (!map.has(key)) map.set(key, { huCode: a.huCode || '—', huTitle: a.huTitle || '', acts: [], subtotal: 0 });
    const g = map.get(key)!;
    g.acts.push(a);
    g.subtotal += Number(a.hours) || 0;
  }
  return [...map.values()];
}

export function IndividualReport({ data, sprints, emittedBy, module = 'agil' }: Props) {
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState(sprints[0]?.id ?? '');

  const sprintName = sprints.find(s => s.id === selectedSprint)?.name ?? '';
  const totalH    = data.activities.reduce((s, a) => s + (Number(a.hours) || 0), 0);
  const totalActs = data.activities.length;

  const reportTitle = module === 'sustentacao'
    ? 'Relatório Individual — Sustentação'
    : 'Relatório de Produtividade Individual — Ágil';
  const restrictLabel = module === 'sustentacao'
    ? 'Uso restrito — Sustentação'
    : 'Uso restrito — Sala Ágil';

  async function handleGenerate(config: any, preview: boolean) {
    try {
      await generateReport(
        { ...config, sprintId: selectedSprint },
        data,
        emittedBy,
        preview,
        reportTitle,
        restrictLabel,
      );
      toast.success('Relatório gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar relatório');
    }
    setConfigOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border rounded-xl px-5 py-3 bg-card">
        <div>
          <ReportHeader
            title={reportTitle}
            icon={module === 'sustentacao' ? '🛠️' : '👤'}
            sprintName={sprintName}
            teamName={data.teamName}
            memberCount={data.developers.length}
            emittedBy={emittedBy}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {totalActs} atividades · {totalH}h lançadas · {data.developers.length} membros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedSprint} onValueChange={setSelectedSprint}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setConfigOpen(true)} className="gap-1.5">
            <Printer className="h-3.5 w-3.5" /> Gerar Relatório
          </Button>
        </div>
      </div>

      {data.developers.map(dev => {
        const acts = data.activities.filter(a => a.developerName === dev.name);
        const devH = acts.reduce((s, a) => s + (Number(a.hours) || 0), 0);
        const groups = groupByHU(acts);
        return (
          <div key={dev.id} className="border rounded-xl overflow-hidden bg-card">
            <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-b">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {getInitials(dev.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{formatPersonName(dev.name)}</p>
                  <p className="text-xs text-muted-foreground">{dev.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs">{devH}h lançadas</Badge>
                <Badge variant="outline" className="text-xs">{acts.length} atividades</Badge>
              </div>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/20">
                  {['Código', 'Título da Atividade', 'Status', 'Início', 'Fim', 'Horas', 'HU'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map(g => (
                  <>
                    <tr key={`hu-${g.huCode}`} className="bg-violet-50 dark:bg-violet-950/20">
                      <td colSpan={7} className="px-3 py-1.5">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded">{g.huCode}</span>
                          {g.huTitle && <span className="text-[11px] font-semibold text-violet-700 dark:text-violet-300">{g.huTitle}</span>}
                        </span>
                      </td>
                    </tr>
                    {g.acts.map((a, i) => (
                      <tr key={a.id} className={i % 2 === 0 ? '' : 'bg-muted/10'}>
                        <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{a.code}</td>
                        <td className="px-3 py-2 font-medium max-w-[260px] truncate">{a.title}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            a.status === 'Concluída'    ? 'bg-emerald-500/15 text-emerald-600' :
                            a.status === 'Em Progresso' ? 'bg-blue-500/15 text-blue-600' :
                            'bg-muted text-muted-foreground'
                          }`}>{a.status}</span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{a.startDate}</td>
                        <td className="px-3 py-2 text-muted-foreground">{a.endDate}</td>
                        <td className="px-3 py-2 font-bold text-primary">{a.hours}h</td>
                        <td className="px-3 py-2"><Badge variant="secondary" className="text-[10px]">{a.huCode}</Badge></td>
                      </tr>
                    ))}
                    {groups.length > 1 && (
                      <tr key={`sub-${g.huCode}`} className="bg-slate-50 dark:bg-slate-900/40 border-t">
                        <td colSpan={5} className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">SUBTOTAL {g.huCode}</td>
                        <td className="px-3 py-1.5 font-bold text-primary">{g.subtotal}h</td>
                        <td />
                      </tr>
                    )}
                  </>
                ))}
                <tr className="border-t bg-primary/5">
                  <td colSpan={5} className="px-3 py-2 text-xs font-semibold text-muted-foreground">Total: {acts.length} atividades</td>
                  <td className="px-3 py-2 font-bold text-primary">{devH}h</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}

      <ReportConfigModal
        open={configOpen}
        reportType="billing"
        sprints={sprints}
        developers={data.developers}
        onClose={() => setConfigOpen(false)}
        onGenerate={handleGenerate}
      />
    </div>
  );
}
