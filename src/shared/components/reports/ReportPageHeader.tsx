import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Printer, Download, ChevronLeft } from "lucide-react";

export interface ReportPageHeaderProps {
  /** Título principal do relatório */
  titulo: string;
  /** Subtítulo / descrição curta */
  subtitulo?: string;
  /** Módulo de origem — define cor do badge */
  modulo: "sustentacao" | "sala_agil";
  /** Período legível exibido no cabeçalho */
  periodoLabel: string;
  /** Callback para exportar CSV — se omitido, botão não aparece */
  onExportCSV?: () => void;
  /** Callback para voltar ao catálogo — se omitido, botão não aparece */
  onBack?: () => void;
  /** Ícone opcional (componente Lucide) */
  icon?: React.ElementType;
}

const MODULE_CONFIG = {
  sustentacao: { label: "Sustentação", badgeClass: "bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-300" },
  sala_agil:   { label: "Sala Ágil",   badgeClass: "bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:text-emerald-300" },
};

function genDocId() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RPT-${y}${m}${d}-${rand}`;
}

const DOC_ID = genDocId();

export function ReportPageHeader({
  titulo,
  subtitulo,
  modulo,
  periodoLabel,
  onExportCSV,
  onBack,
  icon: Icon = FileText,
}: ReportPageHeaderProps) {
  const { profile } = useAuth();
  const now = new Date();
  const cfg = MODULE_CONFIG[modulo];

  const handlePrint = () => window.print();

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden print:shadow-none print:border-none">
      {/* Topo colorido por módulo */}
      <div
        className={`h-1 w-full ${
          modulo === "sustentacao" ? "bg-blue-500" : "bg-emerald-500"
        }`}
      />

      <div className="px-5 py-4">
        {/* Linha 1 — voltar + título + badge + ações */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground"
                onClick={onBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div
              className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                modulo === "sustentacao" ? "bg-blue-500/10 text-blue-600" : "bg-emerald-500/10 text-emerald-600"
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-foreground leading-tight">{titulo}</h2>
                <Badge variant="outline" className={`text-[10px] font-semibold px-2 ${cfg.badgeClass}`}>
                  {cfg.label}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">Interno</Badge>
              </div>
              {subtitulo && (
                <p className="text-xs text-muted-foreground mt-0.5">{subtitulo}</p>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 shrink-0 print:hidden">
            {onExportCSV && (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={onExportCSV}>
                <Download className="h-3.5 w-3.5" />
                Exportar CSV
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" />
              Imprimir PDF
            </Button>
          </div>
        </div>

        <Separator className="my-3" />

        {/* Linha 2 — metadados do documento */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 items-center justify-between">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
            <span>
              Período:{" "}
              <strong className="text-foreground">{periodoLabel}</strong>
            </span>
            <span>
              Gerado por:{" "}
              <strong className="text-foreground">{profile?.display_name || "Sistema"}</strong>
            </span>
            <span>
              Data:{" "}
              <strong className="text-foreground">
                {now.toLocaleDateString("pt-BR")}{" "}
                {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </strong>
            </span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground/70 select-all">{DOC_ID}</span>
        </div>
      </div>
    </div>
  );
}
