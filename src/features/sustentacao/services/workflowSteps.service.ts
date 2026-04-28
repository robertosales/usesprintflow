import { supabase } from "@/integrations/supabase/client";

export interface WorkflowStepRow {
  id: string;
  team_id: string;
  nome: string;
  cor: string;
  ordem: number;
  ativo: boolean;
}

/** Fetch all active steps globally (no team filter — workflow is shared). */
export async function fetchActiveWorkflowSteps(): Promise<WorkflowStepRow[]> {
  const { data, error } = await supabase
    .from("sustentacao_workflow_steps" as any)
    .select("*")
    .eq("ativo", true)
    .order("ordem");
  if (error) throw error;
  return (data ?? []) as unknown as WorkflowStepRow[];
}

/**
 * Globally replace all workflow steps. Used by the workflow manager —
 * deletes everything and inserts the new ordered list.
 */
export async function replaceWorkflowSteps(
  teamId: string,
  steps: { label: string; hex: string }[],
): Promise<void> {
  const { error: delErr } = await supabase
    .from("sustentacao_workflow_steps" as any)
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (delErr) throw delErr;
  const rows = steps.map((s, idx) => ({
    team_id: teamId,
    nome: s.label,
    cor: s.hex,
    ordem: idx,
    ativo: true,
  }));
  const { error: insErr } = await supabase
    .from("sustentacao_workflow_steps" as any)
    .insert(rows as any);
  if (insErr) throw insErr;
}

export async function fetchEvidenciasByDemandaIds(
  demandaIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (demandaIds.length === 0) return map;
  const { data } = await supabase
    .from("demanda_evidencias" as any)
    .select("demanda_id")
    .in("demanda_id", demandaIds);
  (data ?? []).forEach((e: any) => {
    map.set(e.demanda_id, (map.get(e.demanda_id) ?? 0) + 1);
  });
  return map;
}

/**
 * Returns a count of evidences keyed by `${demanda_id}:${fase}`.
 * Used by the Sustentação board cache.
 */
export async function fetchEvidenceCountsByDemandaAndFase(
  demandaIds: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (demandaIds.length === 0) return counts;
  const { data } = await supabase
    .from("demanda_evidencias" as any)
    .select("demanda_id, fase")
    .in("demanda_id", demandaIds);
  (data ?? []).forEach((row: any) => {
    const key = `${row.demanda_id}:${row.fase}`;
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return counts;
}