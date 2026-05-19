import { useCallback, useEffect, useState } from "react";
import {
  listParticipantes,
  addParticipante,
  removeParticipante,
} from "../services/rdmService";
import type { RdmParticipante, RdmParticipanteInsert } from "../types/rdm";

export function useRdmParticipantes(rdmId: string | null) {
  const [participantes, setParticipantes] = useState<RdmParticipante[]>([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!rdmId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listParticipantes(rdmId);
      setParticipantes(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar participantes");
    } finally {
      setLoading(false);
    }
  }, [rdmId]);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(
    async (payload: RdmParticipanteInsert) => {
      await addParticipante(payload);
      await load();
    },
    [load]
  );

  const remove = useCallback(
    async (id: string) => {
      await removeParticipante(id);
      setParticipantes((prev) => prev.filter((p) => p.id !== id));
    },
    []
  );

  return { participantes, loading, error, load, add, remove };
}
