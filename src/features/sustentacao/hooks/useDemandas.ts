import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as svc from "../services/demandas.service";
import type { Demanda, DemandaTransition, DemandaHour } from "../types/demanda";
import { REQUIRES_JUSTIFICATIVA } from "../types/demanda";

export function useDemandas() {
  const { currentTeamId, user } = useAuth();
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentTeamId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await svc.fetchDemandas(currentTeamId);
      setDemandas(data);
    } catch (err: any) {
      setError(err.message);
      toast.error("Erro ao carregar demandas");
    } finally {
      setLoading(false);
    }
  }, [currentTeamId]);

  useEffect(() => { load(); }, [load]);

  const create = async (d: Partial<Demanda>) => {
    if (!currentTeamId) return;
    try {
      const created = await svc.createDemanda({ ...d, team_id: currentTeamId, rhm: d.rhm! });
      if (user) {
        await svc.addTransition({ demanda_id: created.id, from_status: null, to_status: 'nova', user_id: user.id, justificativa: null });
      }
      toast.success("Demanda criada com sucesso");
      await load();
    } catch (err: any) {
      toast.error("Erro ao criar demanda");
    }
  };

  const update = async (id: string, updates: Partial<Demanda>) => {
    try {
      await svc.updateDemanda(id, updates);
      toast.success("Demanda atualizada com sucesso");
      await load();
    } catch (err: any) {
      toast.error("Erro ao atualizar demanda");
    }
  };

  const moveTo = async (demanda: Demanda, newStatus: string, justificativa?: string) => {
    if (REQUIRES_JUSTIFICATIVA.includes(newStatus) && !justificativa) {
      toast.error("Justificativa obrigatória para este status");
      return false;
    }
    try {
      await svc.updateDemanda(demanda.id, { situacao: newStatus });
      if (user) {
        await svc.addTransition({
          demanda_id: demanda.id,
          from_status: demanda.situacao,
          to_status: newStatus,
          user_id: user.id,
          justificativa: justificativa || null,
        });
      }
      toast.success("Status atualizado com sucesso");
      await load();
      return true;
    } catch {
      toast.error("Erro ao atualizar status");
      return false;
    }
  };

  const remove = async (id: string) => {
    try {
      await svc.deleteDemanda(id);
      toast.success("Demanda excluída com sucesso");
      await load();
    } catch {
      toast.error("Erro ao excluir demanda");
    }
  };

  return { demandas, loading, error, reload: load, create, update, moveTo, remove };
}

export function useTransitions(demandaId: string | null) {
  const [transitions, setTransitions] = useState<DemandaTransition[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!demandaId) return;
    setLoading(true);
    try {
      const data = await svc.fetchTransitions(demandaId);
      setTransitions(data);
    } finally {
      setLoading(false);
    }
  }, [demandaId]);

  useEffect(() => { load(); }, [load]);

  return { transitions, loading, reload: load };
}

export function useHours(demandaId: string | null) {
  const { user } = useAuth();
  const [hours, setHours] = useState<DemandaHour[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!demandaId) return;
    setLoading(true);
    const data = await svc.fetchHours(demandaId);
    setHours(data);
    setLoading(false);
  }, [demandaId]);

  useEffect(() => { load(); }, [load]);

  const add = async (h: { horas: number; fase: string; descricao: string }) => {
    if (!demandaId || !user) return;
    try {
      await svc.addHours({ demanda_id: demandaId, user_id: user.id, ...h });
      toast.success("Horas registradas com sucesso");
      await load();
    } catch {
      toast.error("Erro ao registrar horas");
    }
  };

  const remove = async (id: string) => {
    try {
      await svc.deleteHour(id);
      toast.success("Registro excluído com sucesso");
      await load();
    } catch {
      toast.error("Erro ao excluir registro");
    }
  };

  const total = hours.reduce((s, h) => s + Number(h.horas), 0);

  return { hours, loading, add, remove, total, reload: load };
}
