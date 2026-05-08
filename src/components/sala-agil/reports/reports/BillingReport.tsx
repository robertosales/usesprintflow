import { useState } from 'react';
import { getInitials, formatPersonName } from "@/lib/personName";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Printer, Download, Eye } from 'lucide-react';
import { ReportConfigModal } from '../ReportConfigModal';
import { generateReport, ReportData } from '../ReportExporter';
import { toast } from 'sonner';

interface Props {
  data: ReportData;
  sprints: { id: string; name: string }[];
  emittedBy: string;
}

export function BillingReport({ data, sprints, emittedBy }: Props) {
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState(sprints[0]?.id ?? '');

  const sprintName = sprints.find(s => s.id === selectedSprint)?.name ?? '';
  const totalH = data.activities.reduce((s, a) => s + a.hours, 0);
  const totalActs = data.activities.length;

  async function handleGenerate(config: any, preview: boolean) {
    try {
      await generateReport({ ...config, sprintId: selectedSprint }, data, emittedBy, preview);
      toast.success(`Relatório gerado com sucesso!`);
    } catch (e) {
      toast.error('Erro ao gerar relatório');
    }
    setConfigOpen(false);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border rounded-xl px-5 py-3">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            💼 Produtividade Individual — Faturamento
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalActs} atividades · {totalH}h lançadas · {data.developers.length} membros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedSprint} onValueChange={setSelectedSprint}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setConfigOpen(true)} className="gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            Gerar Relatório
          </Button>
        </div>
      </div>

      {/* Tabela por membro */}
      {data.developers.map(dev => {
        const acts = data.activities.filter(a => a.developerName === dev.name);
        const devH = acts.reduce((s, a) => s + a.hours, 0);
        return (
          <div key={dev.id} className="bg-white border rounded-xl overflow-hidden">
            {/* Membro header */}
            <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-b">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">
                  {getInitials(dev.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{formatPersonName(dev.name)}</p>
                  <p className="text-xs text-muted-foreground">{dev.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Badge variant="outline">{devH}h lançadas</Badge>
                <Badge variant="outline">{acts.length} atividades</Badge>
              </div>
            </div>

            {/* Atividades */}
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/20">
                  {['Código','Título','Tipo','Status','Início','Fim','Horas','HU'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {acts.map((a, i) => (
                  <tr key={a.id} className={i%2===0 ? 'bg-white' : 'bg-muted/10'}>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{a.code}</td>
                    <td className="px-3 py-2 font-medium text-foreground max-w-[280px] truncate">{a.title}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px]">{a.type}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        a.status === 'Concluída' ? 'bg-green-100 text-green-700' :
                        a.status === 'Em Progresso' ? 'bg-blue-100 text-blue-700' :
                        'bg-muted text-muted-foreground'
                      }`}>{a.status}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{a.startDate}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.endDate}</td>
                    <td className="px-3 py-2 font-bold text-blue-600">{a.hours}h</td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className="text-[10px]">{a.huCode}</Badge>
                    </td>
                  </tr>
                ))}
                {/* subtotal */}
                <tr className="border-t bg-primary/5">
                  <td colSpan={6} className="px-3 py-2 text-xs font-semibold text-muted-foreground">Subtotal</td>
                  <td className="px-3 py-2 font-bold text-blue-700">{devH}h</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Modal de configuração */}
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
