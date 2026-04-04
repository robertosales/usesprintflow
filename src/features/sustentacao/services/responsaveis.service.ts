import { supabase } from "@/integrations/supabase/client";

export interface DemandaResponsavel {
  id: string;
  demanda_id: string;
  user_id: string;
  papel: string;
  created_at: string;
  profile?: { display_name: string; email: string };
}

export async function fetchResponsaveis(demandaId: string): Promise<DemandaResponsavel[]> {
  const { data, error } = await supabase
    .from("demanda_responsaveis" as any)
    .select("*")
    .eq("demanda_id", demandaId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = (data || []) as unknown as DemandaResponsavel[];

  // Enrich with profile names
  const userIds = rows.map(r => r.user_id);
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, email")
      .in("user_id", userIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    rows.forEach(r => {
      const p = profileMap.get(r.user_id);
      if (p) r.profile = { display_name: p.display_name, email: p.email };
    });
  }

  return rows;
}

export async function addResponsavel(demandaId: string, userId: string, papel: string) {
  const { error } = await supabase
    .from("demanda_responsaveis" as any)
    .insert({ demanda_id: demandaId, user_id: userId, papel } as any);
  if (error) throw error;
}

export async function removeResponsavel(id: string) {
  const { error } = await supabase
    .from("demanda_responsaveis" as any)
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function searchProfiles(query: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, email")
    .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10);
  if (error) throw error;
  return data || [];
}
