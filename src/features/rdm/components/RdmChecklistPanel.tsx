import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, MinusCircle, Clock } from "lucide-react";
import { useRdmChecklist } from "../hooks/useRdmChecklist";
import type { RdmChecklistStatus } from "../types/rdm";
import { RDM_CHECKLIST_STATUS_LABELS } from "../types/rdm";

const STATUS_ICON: Record<RdmChecklistStatus, React.ReactNode> = {
  pendente:      <Circle       className="h-4 w-4 text-slate-400" />,
  em_andamento:  <Clock        className="h-4 w-4 text-yellow-400" />,
  concluido:     <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  nao_aplicavel: <MinusCircle  className="h-4 w-4 text-muted-foreground" />,
};

const NEXT_STATUS: Record<RdmChecklistStatus, RdmChecklistStatus> = {
  pendente:      "em_andamento",
  em_andamento:  "concluido",
  concluido:     "nao_aplicavel",
  nao_aplicavel: "pendente",
};

interface Props { rdmId: string }

export function RdmChecklistPanel({ rdmId }: Props) {
  const { grouped, progress, loading, update } = useRdmChecklist(rdmId);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Progresso */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Progresso do Checklist</span>
          <span className="text-muted-foreground font-mono">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Grupos */}
      {Object.entries(grouped).map(([categoria, items]) => (
        <div key={categoria} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {categoria}
          </p>
          <div className="space-y-1">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  update(item.id, {
                    status: NEXT_STATUS[item.status as RdmChecklistStatus],
                    concluido_em:
                      NEXT_STATUS[item.status as RdmChecklistStatus] === "concluido"
                        ? new Date().toISOString()
                        : null,
                  })
                }
                className={cn(
                  "w-full flex items-start gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm",
                  "hover:bg-muted/60 border border-transparent hover:border-border"
                )}
              >
                <span className="mt-0.5 shrink-0">
                  {STATUS_ICON[item.status as RdmChecklistStatus] ?? STATUS_ICON.pendente}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm leading-snug",
                      item.status === "concluido" && "line-through text-muted-foreground",
                      item.status === "nao_aplicavel" && "text-muted-foreground/60"
                    )}
                  >
                    {item.descricao}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {RDM_CHECKLIST_STATUS_LABELS[item.status as RdmChecklistStatus]}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {Object.keys(grouped).length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-6">
          Nenhum item de checklist cadastrado.
        </p>
      )}
    </div>
  );
}
