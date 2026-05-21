import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { WORKFLOW_LABELS, WORKFLOW_COLORS } from "../../DemandaDetail";
import { SITUACAO_LABELS, SITUACAO_COLORS } from "../../../types/demanda";

interface HistoryTabProps {
  transitions: any[];
  loading: boolean;
}

const resolveLabel = (s: string) => WORKFLOW_LABELS[s] || SITUACAO_LABELS[s] || s;
const resolveColor = (s: string) => WORKFLOW_COLORS[s] || SITUACAO_COLORS[s] || "";

export function HistoryTab({ transitions, loading }: HistoryTabProps) {
  if (loading) return <p className="text-sm text-muted-foreground mt-5">Carregando...</p>;
  if (transitions.length === 0) return <p className="text-sm text-muted-foreground mt-5">Nenhuma transição registrada.</p>;

  return (
    <div className="space-y-3 mt-5">
      {transitions.map((t, idx) => {
        const isFirst = idx === 0;
        return (
          <div key={t.id} className="flex gap-3 text-sm">
            <div className="flex flex-col items-center">
              <div className={`h-2 w-2 rounded-full mt-1.5 ${isFirst ? "bg-info" : "bg-muted-foreground/40"}`} />
              {idx < transitions.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className="pb-3 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {t.from_status && (
                  <>
                    <Badge variant="outline" className="text-[10px] h-5">{resolveLabel(t.from_status)}</Badge>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  </>
                )}
                <Badge className={`text-[10px] h-5 ${resolveColor(t.to_status)}`}>{resolveLabel(t.to_status)}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{new Date(t.created_at).toLocaleString("pt-BR")}</p>
              {t.justificativa && <p className="text-xs italic text-muted-foreground mt-0.5">"{t.justificativa}"</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
