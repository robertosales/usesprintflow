import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DemandaFase {
  id: string;
  key: string;
  label: string;
  ordem: number;
  ativo: boolean;
}

const FALLBACK: DemandaFase[] = [
  { id: "f1", key: "analise", label: "Análise", ordem: 1, ativo: true },
  { id: "f2", key: "planejamento", label: "Planejamento", ordem: 2, ativo: true },
  { id: "f3", key: "execucao", label: "Execução", ordem: 3, ativo: true },
  { id: "f4", key: "homologacao", label: "Homologação", ordem: 4, ativo: true },
  { id: "f5", key: "producao", label: "Produção", ordem: 5, ativo: true },
  { id: "f6", key: "reuniao_interna", label: "Reunião Interna", ordem: 6, ativo: true },
  { id: "f7", key: "reuniao_cliente", label: "Reunião Cliente", ordem: 7, ativo: true },
];

export function useFases() {
  const [fases, setFases] = useState<DemandaFase[]>(FALLBACK);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("demanda_fases" as any)
        .select("*")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      if (data && (data as any[]).length > 0) {
        setFases(data as unknown as DemandaFase[]);
      } else {
        setFases(FALLBACK);
      }
    } catch {
      setFases(FALLBACK);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("demanda-fases-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demanda_fases" },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const create = async (label: string) => {
    const key = label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const ordem = (fases.reduce((m, f) => Math.max(m, f.ordem), 0) || 0) + 1;
    const { error } = await supabase
      .from("demanda_fases" as any)
      .insert({ key, label, ordem } as any);
    if (error) throw error;
    await load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase
      .from("demanda_fases" as any)
      .update({ ativo: false } as any)
      .eq("id", id);
    if (error) throw error;
    await load();
  };

  return { fases, loading, reload: load, create, remove };
}