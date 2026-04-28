import { supabase } from "@/integrations/supabase/client";

export interface WorkflowStepRow {
  id?: string;
  team_id?: string;
  key: string;
  label: string;
  ordem: number;
}

export async function fetchWorkflowSteps(): Promise<WorkflowStepRow[]> {
  const { data, error } = await supabase
    .from("sustentacao_workflow_steps" as any)
    .select("*")
    .order("ordem");
  if (error) throw error;
  return (data ?? []) as unknown as WorkflowStepRow[];
}

export async function replaceWorkflowSteps(
  teamId: string,
  steps: { key: string; label: string; ordem: number }[],
): Promise<void> {
  const { error: delErr } = await supabase
    .from("sustentacao_workflow_steps" as any)
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (delErr) throw delErr;
  const rows = steps.map((s) => ({ ...s, team_id: teamId }));
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