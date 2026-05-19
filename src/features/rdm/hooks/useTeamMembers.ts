import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth }  from "@/contexts/AuthContext";

export interface TeamMember {
  id:           string;
  display_name: string | null;
  email:        string | null;
  avatar_url:   string | null;
  role:         string | null;
}

export function useTeamMembers() {
  const { profile } = useAuth();
  const [members, setMembers]   = useState<TeamMember[]>([]);
  const [loading, setLoading]   = useState(false);

  const load = useCallback(async () => {
    if (!profile?.team_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, email, avatar_url, role")
        .eq("team_id", profile.team_id)
        .order("display_name");
      if (error) throw error;
      setMembers((data ?? []) as TeamMember[]);
    } finally {
      setLoading(false);
    }
  }, [profile?.team_id]);

  useEffect(() => { load(); }, [load]);

  return { members, loading };
}
