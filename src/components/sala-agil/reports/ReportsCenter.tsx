import { useState } from 'react';
import { ReportSelector } from './ReportSelector';
import { ReportConfigModal } from './ReportConfigModal';
import { BillingReport } from './reports/BillingReport';
import { ReportType, REPORT_META } from './types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// ── Placeholder para relatórios ainda não implementados
function ComingSoon({ type }: { type: ReportType }) {
  const meta = REPORT_META.find(r => r.type === type)!;
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <span className="text-5xl">{meta.icon}</span>
      <h3 className="text-lg font-semibold">{meta.title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{meta.description}</p>
      <Badge variant="outline" className="mt-2">Em desenvolvimento</Badge>
    </div>
  );
}

interface Props {
  // Dados reais virão do componente pai (MetricsDashboard)
  sprints?: { id: string; name: string }[];
  developers?: { id: string; name: string; role: string }[];
  billingData?: any;
  currentUserName?: string;
}

export function ReportsCenter({ sprints = [], developers = [], billingData, currentUserName = 'Usuário' }: Props) {
  const [selected, setSelected] = useState<ReportType | null>(null);

  return (
    <div className="space-y-0">
      {/* Seletor de tipo de relatório */}
      <div className="bg-white border-b">
        <div className="px-4 pt-3 pb-1">
          <h2 className="text-sm font-semibold text-foreground">Selecione o relatório</h2>
          <p className="text-xs text-muted-foreground">Clique em um relatório para configurar e gerar</p>
        </div>
        <ReportSelector selected={selected} onSelect={setSelected} />
      </div>

      <Separator />

      {/* Conteúdo do relatório selecionado */}
      <div className="p-4">
        {!selected && (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
            <span className="text-4xl">📊</span>
            <p className="text-sm text-muted-foreground">Selecione um relatório acima para começar</p>
          </div>
        )}

        {selected === 'billing' && billingData && (
          <BillingReport
            data={billingData}
            sprints={sprints}
            emittedBy={currentUserName}
          />
        )}

        {selected && selected !== 'billing' && <ComingSoon type={selected} />}
      </div>
    </div>
  );
}
