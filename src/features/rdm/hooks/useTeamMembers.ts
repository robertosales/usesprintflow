import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TeamMember {
  id:           string;
  display_name: string | null;
  email:        string | null;
  avatar_url:   string | null;
  role:         string | null;
}

// Mapa role do perfil → papel válido no CHECK do banco (rdm_participantes)
export const ROLE_TO_PAPEL: Record<string, string> = {
  architect:     "arquiteto",
  scrum_master:  "scrum_master",
  admin:         "ad",
  ad:            "ad",
  product_owner: "product_owner",
  analyst:       "requisitos",
  developer:     "desenvolvedor",
  qa_analyst:    "desenvolvedor",
  member:        "desenvolvedor",
};

export function useTeamMembers(teamId: string | null) {
  const [members, setMembers]   = useState<TeamMember[]>([]);
  const [loading, setLoading]   = useState(false);

  const load = useCallback(async () => {
    if (!teamId) { setMembers([]); return; }
    setLoading(true);
    try {
      // Busca via team_members (N:N) JOIN profiles
      const { data, error } = await supabase
        .from("team_members")
        .select(`
          profile:profiles!team_members_user_id_fkey(
            id, display_name, email, avatar_url, role
          )
        `)
        .eq("team_id", teamId);
      if (error) throw error;
      const mapped = (data ?? [])
        .map((row: any) => row.profile)
        .filter(Boolean) as TeamMember[];
      mapped.sort((a, b) =>
        (a.display_name ?? a.email ?? "").localeCompare(b.display_name ?? b.email ?? "")
      );
      setMembers(mapped);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { load(); }, [load]);

  return { members, loading };
}
