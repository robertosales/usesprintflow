import { supabase } from "@/integrations/supabase/client";
import type { DemandaEvento } from "../utils/imrCalculations";

export async function fetchEventos(demandaId: string): Promise<DemandaEvento[]> {
  const { data, error } = await supabase
    .from("demanda_eventos" as any)
    .select("*")
    .eq("demanda_id", demandaId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as DemandaEvento[];
}

export async function fetchEventosByTeam(teamId: string): Promise<DemandaEvento[]> {
  // Get all demanda IDs for the team
  const { data: demandas } = await supabase
    .from("demandas" as any)
    .select("id")
    .eq("team_id", teamId);
  const ids = ((demandas || []) as any[]).map(d => d.id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("demanda_eventos" as any)
    .select("*")
    .in("demanda_id", ids)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as DemandaEvento[];
}

export async function addEvento(evento: Omit<DemandaEvento, 'id' | 'created_at'>) {
  const { error } = await supabase.from("demanda_eventos" as any).insert(evento as any);
  if (error) throw error;
}
