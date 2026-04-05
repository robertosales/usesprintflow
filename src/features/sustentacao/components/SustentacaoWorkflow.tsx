import { Card, CardContent } from "@/components/ui/card";
import { GitBranch, Check, Circle, AlertCircle, Clock } from "lucide-react";
import { ALL_SITUACOES, SITUACAO_LABELS, SITUACAO_COLORS, REQUIRES_JUSTIFICATIVA } from "../types/demanda";
import { EVIDENCIAS_OBRIGATORIAS } from "../services/evidencias.service";

export function SustentacaoWorkflow() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-info" />
          <h2 className="text-lg font-bold tracking-tight">Fluxo de Trabalho — Sustentação</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Visualize as etapas do fluxo e suas regras de progressão.
        </p>
      </div>

      {/* Stepper-style pipeline */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-0 overflow-x-auto pb-2">
            {ALL_SITUACOES.map((sit, idx) => {
              const isLast = idx === ALL_SITUACOES.length - 1;
              const requiresJust = REQUIRES_JUSTIFICATIVA.includes(sit);
              const hasRequiredEvidence = !!EVIDENCIAS_OBRIGATORIAS[sit];

              return (
                <div key={sit} className="flex items-center shrink-0">
                  <div className="flex flex-col items-center gap-2 min-w-[100px]">
                    <div className={`flex items-center justify-center h-10 w-10 rounded-full border-2 transition-all ${SITUACAO_COLORS[sit] || 'bg-muted'}`}>
                      <Circle className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-semibold text-center leading-tight max-w-[90px]">
                      {SITUACAO_LABELS[sit]}
                    </span>
                    <div className="flex items-center gap-1">
                      {requiresJust && (
                        <span title="Exige justificativa">
                          <AlertCircle className="h-3 w-3 text-warning" />
                        </span>
                      )}
                      {hasRequiredEvidence && (
                        <span title="Exige evidência obrigatória">
                          <Check className="h-3 w-3 text-info" />
                        </span>
                      )}
                    </div>
                  </div>
                  {!isLast && (
                    <div className="w-6 h-0.5 bg-border mx-0.5 mt-[-28px]" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rules */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><GitBranch className="h-4 w-4 text-info" />Regras de Progressão</h3>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li>• A movimentação é estritamente sequencial — apenas avanço para etapas posteriores</li>
              <li>• Retrocesso manual não é permitido em nenhuma hipótese</li>
              <li>• Status <strong>Bloqueada</strong> e <strong>Aguardando Retorno</strong> exigem justificativa obrigatória</li>
              <li>• O desbloqueio retorna automaticamente à etapa anterior</li>
              <li>• Demandas <strong>Evolutivas</strong> incluem etapas de Planejamento antes da Execução</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Check className="h-4 w-4 text-info" />Evidências Obrigatórias</h3>
            <ul className="text-xs text-muted-foreground space-y-2">
              {Object.entries(EVIDENCIAS_OBRIGATORIAS).map(([fase, reqs]) => (
                <li key={fase}>• <strong>{SITUACAO_LABELS[fase] || fase}</strong>: {reqs.join(', ')}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-2">Ao arrastar um card no Kanban, o sistema valida automaticamente todas as condições antes de permitir a transição.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
