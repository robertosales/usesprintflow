import { useCallback, useEffect, useState } from "react";
import {
  listChecklistItems,
  updateChecklistItem,
} from "../services/rdmService";
import type { RdmChecklistItem, RdmChecklistItemUpdate } from "../types/rdm";

export function useRdmChecklist(rdmId: string | null) {
  const [items, setItems]       = useState<RdmChecklistItem[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!rdmId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listChecklistItems(rdmId);
      setItems(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar checklist");
    } finally {
      setLoading(false);
    }
  }, [rdmId]);

  useEffect(() => { load(); }, [load]);

  const update = useCallback(
    async (id: string, updates: RdmChecklistItemUpdate) => {
      await updateChecklistItem(id, updates);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, ...updates, updated_at: new Date().toISOString() }
            : item
        )
      );
    },
    []
  );

  const progress = items.length === 0
    ? 0
    : Math.round(
        (items.filter((i) => i.status === "concluido" || i.status === "nao_aplicavel").length /
          items.length) *
          100
      );

  const grouped = items.reduce<Record<string, RdmChecklistItem[]>>((acc, item) => {
    (acc[item.categoria] = acc[item.categoria] ?? []).push(item);
    return acc;
  }, {});

  return { items, grouped, progress, loading, error, load, update };
}
