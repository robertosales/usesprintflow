import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, GripVertical } from "lucide-react";
import { ALL_SITUACOES, SITUACAO_LABELS, SITUACAO_COLORS } from "../types/demanda";

export function SustentacaoWorkflow() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <GitBranch className="h-5 w-5 text-info" />
        <h2 className="text-lg font-bold tracking-tight">Fluxo de Trabalho — Sustentação</h2>
        <Badge variant="secondary">{ALL_SITUACOES.length} etapas</Badge>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {ALL_SITUACOES.map((sit, idx) => (
              <div key={sit} className="flex items-center gap-1 shrink-0">
                <div className={`rounded-lg px-3 py-2 border min-w-[140px] ${SITUACAO_COLORS[sit] || 'bg-muted'}`}>
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-3 w-3 opacity-30" />
                    <span className="text-xs font-semibold">{SITUACAO_LABELS[sit] || sit}</span>
                  </div>
                </div>
                {idx < ALL_SITUACOES.length - 1 && (
                  <div className="text-muted-foreground/40 text-lg">→</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          O fluxo de Sustentação é predefinido. Demandas <strong>Corretivas</strong> seguem: Nova → Execução Dev → Teste → Homologação → Produção → Aceite Final.
        </p>
        <p className="text-xs text-muted-foreground">
          Demandas <strong>Evolutivas</strong> incluem etapas adicionais de Planejamento antes da Execução.
        </p>
        <p className="text-xs text-muted-foreground">
          Status <strong>Bloqueada</strong> e <strong>Aguardando Retorno</strong> exigem justificativa obrigatória.
        </p>
      </div>
    </div>
  );
}
