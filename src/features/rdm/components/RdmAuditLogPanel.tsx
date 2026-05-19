import { Loader2, Clock, ArrowRight } from "lucide-react";
import { cn }             from "@/lib/utils";
import { useRdmAuditLog } from "../hooks/useRdmAuditLog";
import type { RdmStatus } from "../types/rdm";
import { RDM_STATUS_LABELS, RDM_STATUS_COLORS } from "../types/rdm";

function StatusChip({ status }: { status: string }) {
  const s = status as RdmStatus;
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border",
        RDM_STATUS_COLORS[s] ?? "bg-slate-500/15 text-slate-400 border-slate-500/20"
      )}
    >
      {RDM_STATUS_LABELS[s] ?? status}
    </span>
  );
}

const ACAO_LABELS: Record<string, string> = {
  criacao:          "Criação",
  atualizacao:      "Atualização",
  mudanca_status:   "Mudança de status",
  checklist_update: "Checklist atualizado",
  gonogo_vote:      "Voto Go/No-Go",
  participante_add: "Participante adicionado",
  participante_rem: "Participante removido",
};

interface Props { rdmId: string }

export function RdmAuditLogPanel({ rdmId }: Props) {
  const { logs, loading, error } = useRdmAuditLog(rdmId);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive text-center py-6">{error}</p>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground space-y-2">
        <Clock className="h-10 w-10 opacity-25" />
        <p className="text-sm">Nenhuma entrada no histórico</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Linha vertical da timeline */}
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

      {logs.map((log, idx) => {
        const payload = (log.payload ?? {}) as Record<string, unknown>;
        const de  = payload.de  as string | undefined;
        const para = payload.para as string | undefined;

        return (
          <div key={log.id} className="relative flex gap-4 pb-5">
            {/* Círculo na timeline */}
            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-sidebar">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0 pt-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground">
                  {ACAO_LABELS[log.acao] ?? log.acao}
                </p>
                {de && para && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <StatusChip status={de} />
                    <ArrowRight className="h-3 w-3" />
                    <StatusChip status={para} />
                  </span>
                )}
              </div>

              {payload.descricao && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {String(payload.descricao)}
                </p>
              )}

              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {new Date(log.created_at).toLocaleString("pt-BR")}
                {log.actor_id && <> · {log.actor_id.slice(0, 8)}&hellip;</>}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
