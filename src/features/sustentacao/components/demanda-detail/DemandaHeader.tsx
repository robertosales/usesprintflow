import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, Edit, Save, X } from "lucide-react";
import { Demanda } from "../../types/demanda";
import { WORKFLOW_LABELS, WORKFLOW_COLORS } from "../DemandaDetail";
import { SITUACAO_LABELS, SITUACAO_COLORS } from "../../types/demanda";

interface DemandaHeaderProps {
  demanda: Demanda;
  slaStatus: { label: string; cor: string };
  isBloqueada: boolean;
  isRejeitada: boolean;
  isTerminal: boolean;
  editing: boolean;
  onBack: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}

const SLA_COR_CLASS: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  orange: "bg-orange-100 text-orange-800 border-orange-200",
  red: "bg-destructive/10 text-destructive border-destructive/30",
  muted: "bg-muted text-muted-foreground",
};

const resolveLabel = (s: string) => WORKFLOW_LABELS[s] || SITUACAO_LABELS[s] || s;
const resolveColor = (s: string) => WORKFLOW_COLORS[s] || SITUACAO_COLORS[s] || "";

export function DemandaHeader({
  demanda,
  slaStatus,
  isBloqueada,
  isRejeitada,
  isTerminal,
  editing,
  onBack,
  onEdit,
  onCancel,
  onSave,
}: DemandaHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Demandas
        </Button>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono font-semibold text-info">{demanda.rhm}</span>
      </div>

      <div className="bg-card rounded-xl border shadow-sm">
        <div className="px-6 py-5 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight font-mono text-foreground">{demanda.rhm}</h1>
                <Badge className={`text-xs ${resolveColor(demanda.situacao)}`}>{resolveLabel(demanda.situacao)}</Badge>
                <Badge className={`text-xs ${SLA_COR_CLASS[slaStatus.cor]}`}>
                  {slaStatus.cor === "green" ? "🟢" : slaStatus.cor === "yellow" ? "🟡" : slaStatus.cor === "orange" ? "🟠" : "🔴"}{" "}
                  {slaStatus.label}
                </Badge>
                {isBloqueada && <Badge className="text-xs bg-red-100 text-red-700 border-red-300">🔒 Bloqueada</Badge>}
                {isRejeitada && <Badge className="text-xs bg-rose-100 text-rose-800 border-rose-300">❌ Rejeitada</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {demanda.projeto} · <span>{demanda.tipo}</span> · Criada em{" "}
                {new Date(demanda.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isTerminal ? (
                <Badge className="bg-gray-200 text-gray-700 border-gray-300 text-xs">Somente leitura</Badge>
              ) : editing ? (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={onCancel}>
                    <X className="h-4 w-4" />Cancelar
                  </Button>
                  <Button size="sm" className="gap-1.5 bg-info hover:bg-info/90 text-info-foreground" onClick={onSave}>
                    <Save className="h-4 w-4" />Salvar
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={onEdit}>
                  <Edit className="h-4 w-4" />Editar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
