import { useCallback, useEffect, useState } from "react";
import { listGoNogo, upsertGoNogo } from "../services/rdmService";
import type { RdmGoNogo, RdmGoNogoInsert } from "../types/rdm";

export function useRdmGoNogo(rdmId: string | null) {
  const [votes, setVotes]     = useState<RdmGoNogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!rdmId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listGoNogo(rdmId);
      setVotes(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar Go/No-Go");
    } finally {
      setLoading(false);
    }
  }, [rdmId]);

  useEffect(() => { load(); }, [load]);

  const vote = useCallback(
    async (payload: RdmGoNogoInsert) => {
      await upsertGoNogo(payload);
      await load();
    },
    [load]
  );

  const totalGo   = votes.filter((v) => v.voto === "go").length;
  const totalNogo = votes.filter((v) => v.voto === "nogo").length;
  const consensus: "go" | "nogo" | "pendente" =
    votes.length === 0
      ? "pendente"
      : totalNogo > 0
        ? "nogo"
        : "go";

  return { votes, loading, error, load, vote, totalGo, totalNogo, consensus };
}
