import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as svc from "../services/projetos.service";
import type { Projeto } from "../services/projetos.service";

export function useProjetos() {
  const { currentTeamId } = useAuth();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentTeamId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await svc.fetchProjetos(currentTeamId);
      setProjetos(data);
    } catch (err: any) {
      setError(err.message);
      toast.error("Erro ao carregar projetos");
    } finally {
      setLoading(false);
    }
  }, [currentTeamId]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!currentTeamId) return;
    const channel = supabase
      .channel(`projetos-rt-${currentTeamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projetos', filter: `team_id=eq.${currentTeamId}` },
        () => { load(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentTeamId, load]);

  const create = async (p: { nome: string; descricao?: string; equipe?: string; sla?: string }) => {
    if (!currentTeamId) return;
    try {
      await svc.createProjeto({ ...p, team_id: currentTeamId });
      toast.success("Projeto criado com sucesso");
    } catch {
      toast.error("Erro ao criar projeto");
    }
  };

  const update = async (id: string, updates: Partial<Projeto>) => {
    try {
      await svc.updateProjeto(id, updates);
      toast.success("Projeto atualizado com sucesso");
    } catch {
      toast.error("Erro ao atualizar projeto");
    }
  };

  const remove = async (id: string) => {
    try {
      await svc.deleteProjeto(id);
      toast.success("Projeto excluído com sucesso");
    } catch {
      toast.error("Erro ao excluir projeto");
    }
  };

  return { projetos, loading, error, reload: load, create, update, remove };
}
