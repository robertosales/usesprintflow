import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type KPIStatus = "success" | "warning" | "danger" | "neutral";

export interface KPIItem {
  label: string;
  value: string | number;
  /** Texto de meta exibido abaixo do valor ex: "Meta: ≥ 95%" */
  meta?: string;
  /** Status semáforo — define cor do card */
  status: KPIStatus;
  /** Ícone Lucide */
  icon?: React.ElementType;
  /** Variação percentual — positivo = melhora, negativo = piora */
  variacao?: number;
  /** Badge extra ex: "Glosa 0,2%" */
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  /** Sub-texto adicional */
  sub?: string;
}

const STATUS_CONFIG: Record<KPIStatus, { border: string; bg: string; text: string; dot: string }> = {
  success: {
    border: "border-emerald-500/30",
    bg:     "bg-emerald-500/10",
    text:   "text-emerald-600 dark:text-emerald-400",
    dot:    "bg-emerald-500",
  },
  warning: {
    border: "border-orange-400/30",
    bg:     "bg-orange-400/10",
    text:   "text-orange-600 dark:text-orange-400",
    dot:    "bg-orange-400",
  },
  danger: {
    border: "border-destructive/30",
    bg:     "bg-destructive/10",
    text:   "text-destructive",
    dot:    "bg-destructive",
  },
  neutral: {
    border: "border-border",
    bg:     "bg-muted",
    text:   "text-muted-foreground",
    dot:    "bg-muted-foreground",
  },
};

function VariacaoIcon({ v }: { v: number }) {
  if (v > 0) return <TrendingUp className="h-3 w-3 text-emerald-500" />;
  if (v < 0) return <TrendingDown className="h-3 w-3 text-destructive" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

export function ReportKPISummary({ items }: { items: KPIItem[] }) {
  return (
    <div
      className={`grid gap-4 ${
        items.length === 1 ? "grid-cols-1" :
        items.length === 2 ? "grid-cols-2" :
        items.length === 3 ? "grid-cols-3" :
        items.length <= 4 ? "grid-cols-2 md:grid-cols-4" :
        "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
      }`}
    >
      {items.map((item, i) => {
        const cfg = STATUS_CONFIG[item.status];
        const Icon = item.icon;
        return (
          <Card key={i} className={`${cfg.border} transition-colors`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {/* Semáforo + label */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                      {item.label}
                    </p>
                  </div>

                  {/* Valor principal */}
                  <p className={`text-2xl font-bold leading-none ${cfg.text}`}>
                    {item.value}
                  </p>

                  {/* Meta */}
                  {item.meta && (
                    <p className="text-[10px] text-muted-foreground mt-1">{item.meta}</p>
                  )}

                  {/* Sub-texto */}
                  {item.sub && (
                    <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                  )}

                  {/* Variação */}
                  {item.variacao !== undefined && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <VariacaoIcon v={item.variacao} />
                      <span
                        className={`text-[10px] font-medium ${
                          item.variacao > 0 ? "text-emerald-500" :
                          item.variacao < 0 ? "text-destructive" :
                          "text-muted-foreground"
                        }`}
                      >
                        {item.variacao > 0 ? "+" : ""}{item.variacao.toFixed(1)}%
                      </span>
                    </div>
                  )}

                  {/* Badge extra */}
                  {item.badge && (
                    <Badge
                      variant={item.badgeVariant || "outline"}
                      className="text-[10px] mt-1.5"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>

                {/* Ícone */}
                {Icon && (
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}
                  >
                    <Icon className={`h-4 w-4 ${cfg.text}`} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
