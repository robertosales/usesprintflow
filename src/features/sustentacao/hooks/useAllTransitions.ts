import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { DemandaTransition, DemandaHour } from "../types/demanda";

export function useAllTransitions() {
  const { currentTeamId } = useAuth();
  const [transitions, setTransitions] = useState<DemandaTransition[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!currentTeamId) return;
    setLoading(true);
    try {
      // Get all demanda IDs for this team first
      const { data: demandas } = await supabase
        .from("demandas" as any)
        .select("id")
        .eq("team_id", currentTeamId);
      const ids = ((demandas || []) as any[]).map(d => d.id);
      if (ids.length === 0) { setTransitions([]); setLoading(false); return; }

      const { data } = await supabase
        .from("demanda_transitions" as any)
        .select("*")
        .in("demanda_id", ids)
        .order("created_at", { ascending: true });
      setTransitions((data || []) as unknown as DemandaTransition[]);
    } catch {
      setTransitions([]);
    } finally {
      setLoading(false);
    }
  }, [currentTeamId]);

  useEffect(() => { load(); }, [load]);
  return { transitions, loading, reload: load };
}

export function useAllHours() {
  const { currentTeamId } = useAuth();
  const [hours, setHours] = useState<DemandaHour[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!currentTeamId) return;
    setLoading(true);
    try {
      const { data: demandas } = await supabase
        .from("demandas" as any)
        .select("id")
        .eq("team_id", currentTeamId);
      const ids = ((demandas || []) as any[]).map(d => d.id);
      if (ids.length === 0) { setHours([]); setLoading(false); return; }

      const { data } = await supabase
        .from("demanda_hours" as any)
        .select("*")
        .in("demanda_id", ids)
        .order("created_at", { ascending: true });
      setHours((data || []) as unknown as DemandaHour[]);
    } catch {
      setHours([]);
    } finally {
      setLoading(false);
    }
  }, [currentTeamId]);

  useEffect(() => { load(); }, [load]);
  return { hours, loading, reload: load };
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Array<{ user_id: string; display_name: string; email: string }>>([]);

  useEffect(() => {
    supabase.from("profiles").select("user_id, display_name, email").then(({ data }) => {
      setProfiles((data || []) as any[]);
    });
  }, []);

  return profiles;
}
