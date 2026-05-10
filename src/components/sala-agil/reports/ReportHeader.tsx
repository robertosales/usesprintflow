// ReportHeader — usado nos relatórios legados (BillingReport, IndividualReport etc.)
// Exibe logo Axion + título + metadados do sprint/time
import { formatPersonName } from '@/lib/personName';

interface ReportHeaderProps {
  title: string;
  icon?: string;
  sprintName?: string;
  teamName?: string;
  memberCount?: number;
  emittedBy?: string;
}

export function ReportHeader({ title, icon, sprintName, teamName, memberCount, emittedBy }: ReportHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Logo Axion */}
      <img
        src="/axion-logo.png"
        alt="Axion"
        className="h-8 w-auto object-contain shrink-0"
      />
      <div>
        <div className="flex items-center gap-1.5">
          {icon && <span>{icon}</span>}
          <span className="text-base font-bold tracking-tight">{title}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {[sprintName, teamName && `Time: ${teamName}`, memberCount != null && `${memberCount} membros`, emittedBy && `Emitido por: ${formatPersonName(emittedBy)}`]
            .filter(Boolean)
            .join('  ·  ')}
        </p>
      </div>
    </div>
  );
}
