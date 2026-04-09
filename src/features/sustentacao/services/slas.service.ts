import { supabase } from "@/integrations/supabase/client";

export interface SLA {
  id: string;
  nome: string;
  regime_base: string;
  team_id: string;
  created_at: string;
  updated_at: string;
}

export async function fetchSLAs(teamId: string): Promise<SLA[]> {
  const { data, error } = await supabase
    .from("slas" as any)
    .select("*")
    .eq("team_id", teamId)
    .order("nome");
  if (error) throw error;
  return (data || []) as unknown as SLA[];
}

export async function createSLA(params: { nome: string; regime_base: string; team_id: string }): Promise<SLA> {
  const { data, error } = await supabase.from("slas" as any).insert(params as any).select().single();
  if (error) throw error;
  return data as unknown as SLA;
}

export async function deleteSLA(id: string) {
  const { error } = await supabase.from("slas" as any).delete().eq("id", id);
  if (error) throw error;
}

/**
 * Ensure default SLAs exist for a team. Called on first load.
 */
export async function ensureDefaultSLAs(teamId: string): Promise<SLA[]> {
  const existing = await fetchSLAs(teamId);
  const defaults = [
    { nome: 'Padrão', regime_base: 'padrao' },
    { nome: 'Contínuo', regime_base: 'continuo' },
  ];
  
  for (const d of defaults) {
    const exists = existing.some(s => s.nome.toLowerCase() === d.nome.toLowerCase());
    if (!exists) {
      try {
        const created = await createSLA({ ...d, team_id: teamId });
        existing.push(created);
      } catch { /* unique constraint - already exists */ }
    }
  }
  
  return existing;
}
