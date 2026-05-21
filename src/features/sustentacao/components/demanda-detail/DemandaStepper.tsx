import React from "react";
import { Circle, Check } from "lucide-react";

interface DemandaStepperProps {
  situacao: string;
  currentStepIdx: number;
  stepperSteps: string[];
  stepperLabels: Record<string, string>;
  isBloqueada: boolean;
  isRejeitada: boolean;
}

export function DemandaStepper({
  situacao,
  currentStepIdx,
  stepperSteps,
  stepperLabels,
  isBloqueada,
  isRejeitada,
}: DemandaStepperProps) {
  return (
    <div className="px-6 py-4 border-b bg-muted/30 overflow-x-auto">
      <div className="flex items-center min-w-max">
        {stepperSteps.map((step, idx) => {
          const isActive = situacao === step;
          const isPast = currentStepIdx >= 0 && idx < currentStepIdx;
          const isLast = idx === stepperSteps.length - 1;
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`flex items-center justify-center h-7 w-7 rounded-full border-2 transition-all ${
                  isPast ? "bg-emerald-500 border-emerald-500 text-white" :
                  isActive ? "bg-info border-info text-info-foreground shadow-md shadow-info/25" :
                  "bg-muted border-border text-muted-foreground"
                }`}>
                  {isPast ? <Check className="h-3.5 w-3.5" /> : isActive ? <Circle className="h-2.5 w-2.5 fill-current" /> : <span className="text-[10px] font-medium">{idx + 1}</span>}
                </div>
                <span className={`text-[10px] font-medium text-center leading-tight max-w-[72px] ${
                  isActive ? "text-info font-semibold" : isPast ? "text-emerald-600" : "text-muted-foreground"
                }`}>{stepperLabels[step]}</span>
              </div>
              {!isLast && (
                <div className={`flex-1 h-0.5 mx-1.5 mt-[-18px] rounded-full transition-colors ${
                  isPast ? "bg-emerald-500" : isActive ? "bg-gradient-to-r from-info to-border" : "bg-border"
                }`} />
              )}
            </div>
          );
        })}
      </div>
      {(isBloqueada || isRejeitada) && (
        <div className={`mt-2 flex items-center gap-2 text-xs font-medium px-1 ${isBloqueada ? "text-red-600" : "text-rose-700"}`}>
          <div className="h-3.5 w-3.5 flex items-center justify-center">!</div>
          {isBloqueada ? "Demanda pausada — aguardando desbloqueio para retomar o fluxo" : "Demanda rejeitada — necessário corrigir e retornar para Execução"}
        </div>
      )}
    </div>
  );
}
