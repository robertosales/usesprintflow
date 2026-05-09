import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

export interface ReportCatalogItem {
  /** Chave interna de identificação do relatório */
  key: string;
  /** Título exibido no card */
  titulo: string;
  /** Descrição curta */
  descricao: string;
  /** Ícone Lucide */
  icon: React.ElementType;
  /** Badge opcional ex: "Novo" | "IMR" */
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

export interface ReportCatalogProps {
  /** Título da seção ex: "Relatórios de Sustentação" */
  titulo?: string;
  items: ReportCatalogItem[];
  /** Chave do relatório selecionado — marca o card com anel de seleção */
  selected?: string;
  onSelect: (key: string) => void;
  /** Módulo — define cor de acento */
  modulo?: "sustentacao" | "sala_agil";
}

const ACCENT = {
  sustentacao: "ring-blue-500 bg-blue-500/5 border-blue-400/50",
  sala_agil:   "ring-emerald-500 bg-emerald-500/5 border-emerald-400/50",
};

const ICON_BG = {
  sustentacao: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  sala_agil:   "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export function ReportCatalog({
  titulo,
  items,
  selected,
  onSelect,
  modulo = "sustentacao",
}: ReportCatalogProps) {
  return (
    <div className="space-y-3">
      {titulo && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {titulo}
          </h3>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isSelected = selected === item.key;
          return (
            <Card
              key={item.key}
              className={`cursor-pointer transition-all duration-150 group hover:shadow-md ${
                isSelected
                  ? `ring-2 ${ACCENT[modulo]}`
                  : "hover:border-muted-foreground/30"
              }`}
              onClick={() => onSelect(item.key)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Ícone */}
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? ICON_BG[modulo] : "bg-muted group-hover:" + ICON_BG[modulo]
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Texto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold leading-tight">{item.titulo}</p>
                      {item.badge && (
                        <Badge
                          variant={item.badgeVariant || "secondary"}
                          className="text-[9px] px-1.5 h-4"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {item.descricao}
                    </p>
                  </div>

                  {/* Seta */}
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 mt-0.5 transition-transform ${
                      isSelected ? "text-foreground" : "text-muted-foreground/40 group-hover:translate-x-0.5"
                    }`}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
