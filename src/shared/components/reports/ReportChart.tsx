import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ReportChartProps {
  /** Título do gráfico */
  titulo: string;
  /** Altura mínima em px — default 280 */
  height?: number;
  /** Badge exibido ao lado do título ex: "Período: 30d" */
  badge?: string;
  /** Conteúdo — qualquer lib de gráfico (Recharts, Nivo etc) */
  children: React.ReactNode;
  /** Itens de legenda manual */
  legenda?: Array<{ cor: string; label: string }>;
  /** Nota de rodapé do gráfico */
  nota?: string;
}

export function ReportChart({
  titulo,
  height = 280,
  badge,
  children,
  legenda,
  nota,
}: ReportChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold">{titulo}</CardTitle>
          {badge && (
            <Badge variant="secondary" className="text-[10px]">
              {badge}
            </Badge>
          )}
        </div>

        {/* Legenda manual */}
        {legenda && legenda.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-1">
            {legenda.map((l, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: l.cor }}
                />
                <span className="text-[10px] text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0 pb-4">
        <div style={{ minHeight: height }}>
          {children}
        </div>
        {nota && (
          <p className="text-[10px] text-muted-foreground mt-2 border-t border-border/50 pt-2">
            * {nota}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
