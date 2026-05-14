import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FluxoColuna {
  id: string;
  team_id: string;
  key: string;
  label: string;
  color_class: string;
  dot_color: string;
  hex: string | null;
  sort_order: number;
  wip_limit: number | null;
}

const COLOR_PRESETS = [
  { label: "Cinza",    color_class: "bg-slate-100 text-slate-700",   dot_color: "bg-slate-400",   hex: "#94a3b8" },
  { label: "Azul",     color_class: "bg-blue-100 text-blue-700",     dot_color: "bg-blue-500",    hex: "#3b82f6" },
  { label: "Violeta",  color_class: "bg-violet-100 text-violet-700", dot_color: "bg-violet-500",  hex: "#8b5cf6" },
  { label: "Âmbar",   color_class: "bg-amber-100 text-amber-700",   dot_color: "bg-amber-500",   hex: "#f59e0b" },
  { label: "Verde",    color_class: "bg-green-100 text-green-700",   dot_color: "bg-green-500",   hex: "#22c55e" },
  { label: "Vermelho", color_class: "bg-red-100 text-red-700",       dot_color: "bg-red-500",     hex: "#ef4444" },
  { label: "Rosa",     color_class: "bg-pink-100 text-pink-700",     dot_color: "bg-pink-500",    hex: "#ec4899" },
  { label: "Ciano",    color_class: "bg-cyan-100 text-cyan-700",     dot_color: "bg-cyan-500",    hex: "#06b6d4" },
];

export { COLOR_PRESETS };

export function useFluxoAdmin(teamId: string) {
  const [colunas, setColunas] = useState<FluxoColuna[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("workflow_columns")
        .select("*")
        .eq("team_id", teamId)
        .order("sort_order");
      if (error) throw error;
      setColunas((data ?? []) as FluxoColuna[]);
    } catch {
      toast.error("Erro ao carregar fluxo");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { load(); }, [load]);

  const create = async (data: Omit<FluxoColuna, "id" | "team_id">) => {
    const nextOrder = colunas.length > 0 ? Math.max(...colunas.map(c => c.sort_order)) + 1 : 0;
    const { error } = await supabase.from("workflow_columns").insert({
      ...data,
      team_id: teamId,
      sort_order: nextOrder,
    });
    if (error) { toast.error("Erro ao criar coluna: " + error.message); return false; }
    toast.success("Coluna criada com sucesso!");
    await load();
    return true;
  };

  const update = async (id: string, data: Partial<Omit<FluxoColuna, "id" | "team_id">>) => {
    const { error } = await supabase.from("workflow_columns").update(data).eq("id", id);
    if (error) { toast.error("Erro ao atualizar coluna: " + error.message); return false; }
    toast.success("Coluna atualizada!");
    await load();
    return true;
  };

  const remove = async (id: string) => {
    // Verifica se há HUs usando esse status
    const col = colunas.find(c => c.id === id);
    if (col) {
      const { count } = await supabase
        .from("user_stories")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("status", col.key);
      if ((count ?? 0) > 0) {
        toast.error(`Não é possível excluir: ${count} HU(s) estão nessa coluna`);
        return false;
      }
    }
    const { error } = await supabase.from("workflow_columns").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir coluna"); return false; }
    toast.success("Coluna excluída");
    await load();
    return true;
  };

  const moveUp = async (id: string) => {
    const idx = colunas.findIndex(c => c.id === id);
    if (idx <= 0) return;
    const prev = colunas[idx - 1];
    const curr = colunas[idx];
    await Promise.all([
      supabase.from("workflow_columns").update({ sort_order: prev.sort_order }).eq("id", curr.id),
      supabase.from("workflow_columns").update({ sort_order: curr.sort_order }).eq("id", prev.id),
    ]);
    await load();
  };

  const moveDown = async (id: string) => {
    const idx = colunas.findIndex(c => c.id === id);
    if (idx < 0 || idx >= colunas.length - 1) return;
    const next = colunas[idx + 1];
    const curr = colunas[idx];
    await Promise.all([
      supabase.from("workflow_columns").update({ sort_order: next.sort_order }).eq("id", curr.id),
      supabase.from("workflow_columns").update({ sort_order: curr.sort_order }).eq("id", next.id),
    ]);
    await load();
  };

  return { colunas, loading, reload: load, create, update, remove, moveUp, moveDown };
}
