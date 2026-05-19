import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  listRdms,
  updateRdm,
  deleteRdm,
  criarRdmComChecklist,
} from "../services/rdmService";
import type { Rdm, RdmInsert, RdmUpdate } from "../types/rdm";

export function useRdms() {
  const { currentTeamId } = useAuth();
  const [rdms, setRdms]       = useState<Rdm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentTeamId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listRdms(currentTeamId);
      setRdms(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar RDMs");
    } finally {
      setLoading(false);
    }
  }, [currentTeamId]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(
    async (payload: Omit<RdmInsert, "id" | "codigo" | "updated_at" | "team_id" | "criado_por">) => {
      if (!currentTeamId) throw new Error("Nenhum time selecionado");
      // criado_por vem do useAuth no componente chamador — repassado via payload
      await criarRdmComChecklist({ ...payload, team_id: currentTeamId } as any);
      await load();
    },
    [currentTeamId, load]
  );

  const update = useCallback(
    async (id: string, updates: RdmUpdate) => {
      await updateRdm(id, updates);
      setRdms((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
        )
      );
    },
    []
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteRdm(id);
      setRdms((prev) => prev.filter((r) => r.id !== id));
    },
    []
  );

  return { rdms, loading, error, load, create, update, remove };
}
