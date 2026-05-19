import { Loader2, Clock, User } from "lucide-react";
import { useRdmAuditLog }  from "../hooks/useRdmAuditLog";

interface Props { rdmId: string }

// Labels amigáveis para campos do audit log
const CAMPO_LABELS: Record<string, string> = {
  status:                 "Status",
  nome:                   "Nome",
  objetivo:               "Objetivo",
  sistema_modulo:         "Sistema / Módulo",
  tipo_mudanca:           "Tipo de Mudança",
  risco:                  "Risco",
  ambiente:               "Ambiente",
  data_implantacao:       "Data de Implantação",
  hora_inicio:            "Hora Início",
  hora_fim_prevista:      "Hora Fim Prevista",
  downtime_previsto:      "Downtime Previsto",
  rollback_previsto:      "Rollback Previsto",
  tempo_rollback_minutos: "Tempo de Rollback (min)",
  observacoes:            "Observações",
};

export function RdmAuditLogPanel({ rdmId }: Props) {
  const { logs, loading, error } = useRdmAuditLog(rdmId);

  if (loading) return (
    <div className="flex justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (error) return (
    <p className="text-sm text-destructive text-center py-6">{error}</p>
  );

  if (logs.length === 0) return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground space-y-2">
      <Clock className="h-10 w-10 opacity-25" />
      <p className="text-sm">Nenhuma entrada no histórico</p>
    </div>
  );

  return (
    <div className="relative space-y-0">
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

      {logs.map((log) => (
        <div key={log.id} className="relative flex gap-4 pb-5">
          <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-sidebar">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0 pt-1.5">
            <p className="text-sm font-semibold text-foreground">
              {CAMPO_LABELS[log.campo] ?? log.campo}
            </p>
            {(log.valor_anterior !== null || log.valor_novo !== null) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="line-through opacity-70">{log.valor_anterior ?? "—"}</span>
                {" → "}
                <span className="text-foreground font-medium">{log.valor_novo ?? "—"}</span>
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <User className="h-3 w-3 text-muted-foreground/50" />
              <span
                className="text-[10px] text-muted-foreground/60 font-mono"
                title={log.profile_id}
              >
                {log.profile_id.slice(0, 8)}…
              </span>
              <span className="text-[10px] text-muted-foreground/40">·</span>
              <span className="text-[10px] text-muted-foreground/60">
                {new Date(log.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
