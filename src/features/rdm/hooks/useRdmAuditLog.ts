import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RdmAuditLog } from "../types/rdm";

export function useRdmAuditLog(rdmId: string | null) {
  const [logs, setLogs]       = useState<RdmAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!rdmId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("rdm_audit_log")
        .select("*")
        .eq("rdm_id", rdmId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (err) throw err;
      setLogs(data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  }, [rdmId]);

  useEffect(() => { load(); }, [load]);

  return { logs, loading, error, load };
}
