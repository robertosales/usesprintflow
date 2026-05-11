import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportPageHeaderProps {
  title?: string;
  titulo?: string;
  description?: string;
  subtitulo?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: any;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline" | "destructive";
  modulo?: string;
  periodoLabel?: string;
  onBack?: () => void;
  onExportCSV?: () => void;
  extraActions?: ReactNode;
}

function renderIcon(icon: unknown): ReactNode {
  if (!icon) return null;
  // Componente Lucide passado como referencia (function ou forwardRef)
  if (
    typeof icon === "function" ||
    (typeof icon === "object" &&
      icon !== null &&
      "$$typeof" in (icon as Record<string, unknown>))
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ic = icon as React.FC<{ className?: string }>;
    return <Ic className="h-5 w-5" />;
  }
  return icon as ReactNode;
}

import React from "react";

export function ReportPageHeader({
  title,
  titulo,
  description,
  subtitulo,
  icon,
  badge,
  badgeVariant = "secondary",
  periodoLabel,
  onBack,
  onExportCSV,
  extraActions,
}: ReportPageHeaderProps) {
  const resolvedTitle = title ?? titulo ?? "";
  const resolvedDesc  = description ?? subtitulo;
  const iconNode      = renderIcon(icon);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="flex items-start gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mt-0.5 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        )}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            {iconNode && <span className="text-primary">{iconNode}</span>}
            <h1 className="text-xl font-bold tracking-tight">{resolvedTitle}</h1>
            {badge && <Badge variant={badgeVariant} className="text-[11px]">{badge}</Badge>}
            {periodoLabel && (
              <Badge variant="outline" className={cn("text-[11px]", badge && "ml-0")}>
                {periodoLabel}
              </Badge>
            )}
          </div>
          {resolvedDesc && (
            <p className="text-sm text-muted-foreground">{resolvedDesc}</p>
          )}
        </div>
      </div>

      {(onExportCSV || extraActions) && (
        <div className="flex items-center gap-2 flex-wrap">
          {extraActions}
          {onExportCSV && (
            <Button variant="outline" size="sm" onClick={onExportCSV} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Exportar CSV
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
