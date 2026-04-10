import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ALL_SITUACOES, SITUACAO_LABELS } from "../types/demanda";

export interface WorkflowStep {
  id?: string;
  key: string;
  label: string;
  hex: string;
  ordem: number;
}

const SITUACAO_HEX: Record<string, string> = {
  nova: "#3b82f6", planejamento: "#6366f1", envio_aprovacao: "#a855f7",
  planejamento_aprovado: "#8b5cf6", execucao_dev: "#eab308", bloqueada: "#ef4444",
  aguardando_retorno: "#f97316", teste: "#06b6d4", aguardando_homologacao: "#f59e0b",
  homologada: "#10b981", fila_producao: "#14b8a6", producao: "#22c55e", aceite_final: "#84cc16",
};

function buildDefaultSteps(): WorkflowStep[] {
  return ALL_SITUACOES.map((sit, idx) => ({
    key: sit,
    label: SITUACAO_LABELS[sit] || sit,
    hex: SITUACAO_HEX[sit] || "#3b82f6",
    ordem: idx,
  }));
}

/**
 * Global workflow steps hook — NOT filtered by team.
 * The workflow is unique and shared across all teams.
 */
export function useWorkflowSteps() {
  const [steps, setSteps] = useState<WorkflowStep[]>(buildDefaultSteps);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Load ALL workflow steps (global, no team filter)
      const { data, error } = await supabase
        .from("sustentacao_workflow_steps" as any)
        .select("*")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      if (data && (data as any[]).length > 0) {
        // Deduplicate by nome (take the first occurrence)
        const seen = new Set<string>();
        const unique = (data as any[]).filter((d: any) => {
          const key = d.nome.toLowerCase().replace(/\s+/g, '_');
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setSteps(unique.map((d: any) => ({
          id: d.id,
          key: d.nome.toLowerCase().replace(/\s+/g, '_'),
          label: d.nome,
          hex: d.cor,
          ordem: d.ordem,
        })));
      } else {
        setSteps(buildDefaultSteps());
      }
    } catch {
      setSteps(buildDefaultSteps());
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription for instant sync
  useEffect(() => {
    const channel = supabase
      .channel('workflow-steps-global')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sustentacao_workflow_steps' },
        () => { load(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return { steps, loading, reload: load, buildDefaultSteps };
}
