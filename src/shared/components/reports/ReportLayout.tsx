import { Separator } from "@/components/ui/separator";

export interface ReportLayoutProps {
  /** Zona 1 — ReportPageHeader */
  header: React.ReactNode;
  /** Zona 2 — ReportFilterBar */
  filters?: React.ReactNode;
  /** Zona 3 — ReportKPISummary */
  kpis?: React.ReactNode;
  /** Zona 4 — ReportChart(s) */
  chart?: React.ReactNode;
  /** Zona 5 — ReportDataTable */
  table?: React.ReactNode;
  /** Conteúdo extra após a tabela (ex: legenda, notas) */
  footer?: React.ReactNode;
}

/**
 * ReportLayout
 *
 * Orquestra as 5 zonas padrão de relatório em ordem consistente:
 *   1. Cabeçalho (ReportPageHeader)
 *   2. Filtros   (ReportFilterBar)
 *   3. KPIs      (ReportKPISummary)
 *   4. Gráfico   (ReportChart)
 *   5. Tabela    (ReportDataTable)
 *   6. Rodapé    (legenda / notas)
 *
 * Cada zona é opcional — se não fornecida, não ocupa espaço.
 */
export function ReportLayout({ header, filters, kpis, chart, table, footer }: ReportLayoutProps) {
  return (
    <div className="space-y-5 print:space-y-4">
      {/* Zona 1 — Cabeçalho */}
      {header}

      {/* Zona 2 — Filtros (oculto na impressão) */}
      {filters && (
        <div className="print:hidden">{filters}</div>
      )}

      {/* Zona 3 — KPIs */}
      {kpis}

      {/* Separador visual entre KPIs e gráfico */}
      {kpis && chart && <Separator className="print:hidden" />}

      {/* Zona 4 — Gráfico */}
      {chart}

      {/* Separador visual entre gráfico e tabela */}
      {chart && table && <Separator className="print:hidden" />}

      {/* Zona 5 — Tabela */}
      {table}

      {/* Rodapé — legenda, notas */}
      {footer && (
        <>
          <Separator />
          {footer}
        </>
      )}
    </div>
  );
}
