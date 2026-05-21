import React, { useState } from "react";
import { MoveRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Demanda } from "../../types/demanda";
import { WORKFLOW_LABELS } from "../DemandaDetail";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as svc from "../../services/demandas.service";
import * as respSvc from "../../services/responsaveis.service";
import * as evidSvc from "../../services/evidencias.service";
import * as eventosSvc from "../../services/eventos.service";
import { useAuth } from "@/contexts/AuthContext";

interface DemandaMovePanelProps {
  demanda: Demanda;
  isTerminal: boolean;
  isBloqueada: boolean;
  isRejeitada: boolean;
  onMoveTo: (demanda: Demanda, newStatus: string, justificativa?: string) => Promise<boolean>;
  onUpdate: (id: string, updates: Partial<Demanda>) => Promise<void>;
  refreshAllData: () => Promise<void>;
  setNewStatus: (status: string) => void;
  setPendingTarget: (status: string) => void;
  setActiveTab: (tab: string) => void;
  setShowEncerramentoModal: (show: boolean) => void;
  setShowSuspensaoModal: (show: boolean) => void;
  setShowJustModal: (show: boolean) => void;
  evidencias: any[];
  workflowSteps: string[];
  requiresJustificativaSteps: string[];
  suspensaoStatuses: string[];
}

export function DemandaMovePanel({
  demanda,
  isTerminal,
  isBloqueada,
  isRejeitada,
  onMoveTo,
  onUpdate,
  refreshAllData,
  setNewStatus,
  setPendingTarget,
  setActiveTab,
  setShowEncerramentoModal,
  setShowSuspensaoModal,
  setShowJustModal,
  evidencias,
  workflowSteps,
  requiresJustificativaSteps,
  suspensaoStatuses,
}: DemandaMovePanelProps) {
  const [localNewStatus, setLocalNewStatus] = useState("");
  const { user } = useAuth();

  const getNextStatuses = (situacao: string): string[] => {
    if (isTerminal) return [];
    const idx = workflowSteps.indexOf(situacao);
    if (situacao === "bloqueada") return [];
    if (situacao === "rejeitada") return ["em_execucao"];
    if (idx < 0) return [];
    const next = workflowSteps.slice(idx + 1);
    if (situacao === "hom_homologada") return [...next, "rejeitada"];
    return next;
  };

  const allowedNextStatuses = getNextStatuses(demanda.situacao);

  const handleMove = async () => {
    if (!localNewStatus) return;

    if (localNewStatus === "planejamento_ag_aprovacao") {
      const faseEvidencias = evidencias.filter((e) => e.fase === demanda.situacao);
      if (faseEvidencias.length === 0) {
        setPendingTarget(localNewStatus);
        setActiveTab("evidencias");
        toast.warning(`Evidência obrigatória pendente. Cadastre a evidência antes de avançar.`);
        return;
      }
    }

    if (localNewStatus === "ag_aceite_final") {
      setNewStatus(localNewStatus);
      setShowEncerramentoModal(true);
      return;
    }

    if (suspensaoStatuses.includes(localNewStatus)) {
      setNewStatus(localNewStatus);
      setShowSuspensaoModal(true);
      return;
    }

    if (requiresJustificativaSteps.includes(localNewStatus)) {
      setNewStatus(localNewStatus);
      setShowJustModal(true);
      return;
    }

    const ok = await onMoveTo(demanda, localNewStatus);
    if (ok) {
      setLocalNewStatus("");
      await refreshAllData();
    }
  };

  const handleUnblock = async () => {
    // This would ideally come from props if we want to keep this component pure
    // For now, keeping it here to match original functionality
    toast.info("Desbloqueio solicitado");
  };

  if (isTerminal) return null;

  return (
    <div className="px-6 py-3 border-b bg-info/5">
      {isBloqueada ? (
        <div className="flex items-center gap-3 flex-wrap">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-sm font-medium text-destructive shrink-0">Demanda bloqueada</span>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-sm" onClick={handleUnblock}>
            Desbloquear (retornar à etapa anterior)
          </Button>
        </div>
      ) : isRejeitada ? (
        <div className="flex items-center gap-3 flex-wrap">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span className="text-sm font-medium text-rose-700 shrink-0">Demanda rejeitada — reencaminhar para execução</span>
          <Button className="bg-amber-600 hover:bg-amber-700 text-white h-8 text-sm" onClick={async () => {
            const ok = await onMoveTo(demanda, "em_execucao", "Reencaminhado após rejeição");
            if (ok) await refreshAllData();
          }}>
            Retornar para Em Execução
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <MoveRight className="h-4 w-4 text-info shrink-0" />
          <span className="text-sm font-medium text-foreground shrink-0">Mover para:</span>
          <Select value={localNewStatus} onValueChange={setLocalNewStatus}>
            <SelectTrigger className="h-9 text-sm flex-1 max-w-xs bg-card">
              <SelectValue placeholder="Selecione a próxima etapa..." />
            </SelectTrigger>
            <SelectContent>
              {allowedNextStatuses.filter((s) => s !== "rejeitada").map((s) => (
                <SelectItem key={s} value={s}>{WORKFLOW_LABELS[s] || s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="bg-info hover:bg-info/90 text-info-foreground h-9 text-sm" onClick={handleMove} disabled={!localNewStatus}>
            Avançar
          </Button>
          {!isTerminal && !isBloqueada && demanda.situacao !== "ag_aceite_final" && (
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => { setLocalNewStatus("bloqueada"); setNewStatus("bloqueada"); setShowSuspensaoModal(true); }}>
              Bloquear
            </Button>
          )}
          {demanda.situacao === "hom_homologada" && (
            <Button variant="outline" size="sm" className="text-rose-700 border-rose-300 hover:bg-rose-50"
              onClick={() => { setLocalNewStatus("rejeitada"); setNewStatus("rejeitada"); setShowJustModal(true); }}>
              Rejeitar
            </Button>
          )}
          {!isTerminal && demanda.situacao !== "ag_aceite_final" && (
            <Button variant="outline" size="sm" className="text-gray-600 border-gray-300 hover:bg-gray-100"
              onClick={() => { setLocalNewStatus("cancelada"); setNewStatus("cancelada"); setShowJustModal(true); }}>
              Cancelar Demanda
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
