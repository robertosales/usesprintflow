import { Badge } from '@/components/ui/badge';
import { AxionLogo } from '@/components/AxionLogo';

interface ReportHeaderProps {
  title: string;
  icon?: string;
  sprintName?: string;
  periodStart?: string;
  periodEnd?: string;
  teamName?: string;
  memberCount?: number;
  emittedBy?: string;
  extra?: React.ReactNode;
}

export function ReportHeader({
  title,
  icon = '📄',
  sprintName,
  periodStart,
  periodEnd,
  teamName,
  memberCount,
  emittedBy,
  extra,
}: ReportHeaderProps) {
  const now = new Date().toLocaleString('pt-BR');
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AxionLogo size={28} showText tagline />
          <div className="h-6 w-px bg-border" />
          <h2 className="text-lg font-bold">
            {icon} {title}
          </h2>
        </div>
        {sprintName && (
          <Badge variant="outline" className="text-xs font-mono">
            {sprintName}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
        {periodStart && periodEnd && (
          <span>📅 Período: <strong>{periodStart} — {periodEnd}</strong></span>
        )}
        {teamName && (
          <span>🏢 Time: <strong>{teamName}</strong></span>
        )}
        {memberCount !== undefined && (
          <span>👥 Membros: <strong>{memberCount}</strong></span>
        )}
        {emittedBy && (
          <><span>🕐 Emitido em: <strong>{now}</strong></span>
          <span>👤 Por: <strong>{emittedBy}</strong></span></>
        )}
      </div>
      {extra}
    </div>
  );
}

export function ReportFooter({ emittedBy }: { emittedBy: string }) {
  const now = new Date().toLocaleString('pt-BR');
  return (
    <div className="border-t pt-3 flex justify-between text-[10px] text-muted-foreground">
      <span>Axion · Operações & Fluxo Ágil · Relatório gerado automaticamente</span>
      <span>Emitido por {emittedBy} em {now}</span>
    </div>
  );
}
