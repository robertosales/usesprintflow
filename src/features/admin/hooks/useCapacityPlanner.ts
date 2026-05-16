import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isWip } from "@/shared/constants/statusConstants";

// -- Raw types ----------------------------------------------------------------
interface RawDev    { id: string; name: string; capacity: number | null; team_id: string; }
interface RawHU     { id: string; status: string; estimated_hours: number | null; assignee_id: string | null; sprint_id: string | null; team_id: string; }
interface RawAct    { id: string; hu_id: string; hours: number; assignee_id: string; }
interface RawSprint { id: string; name: string; is_active: boolean; team_id: string; end_date: string | null; }

// -- Public types -------------------------------------------------------------
export type CapacityStatus = "ok" | "warning" | "overloaded" | "idle" | "unknown";

export interface DevCapacity {
  devId:            string;
  devName:          string;
  teamId:           string;
  teamName:         string;
  /** Capacidade declarada (default 40h) */
  capacityHours:    number;
  /** Soma estimated_hours das HUs no sprint ativo */
  allocatedHours:   number;
  /** Soma activities.hours no sprint ativo */
  realizedHours:    number;
  /** HUs em andamento (nao concluidas e nao backlog) */
  wipCount:         number;
  /** allocatedHours / capacityHours * 100 */
  utilizationPct:   number;
  /** realizedHours / capacityHours * 100 */
  realizationPct:   number;
  status:           CapacityStatus;
  /** HUs sem estimativa de horas — afeta a confiabilidade do utilizationPct */
  unestimatedCount: number;
  /** Avisa quando nao ha sprint ativo para o time deste dev */
  noActiveSprint:   boolean;
}

export interface TeamCapacity {
  teamId:          string;
  teamName:        string;
  module:          string;
  sprintAtivo:     string | null;
  sprintEndDate:   string | null;
  totalCapacity:   number;
  totalAllocated:  number;
  totalRealized:   number;
  utilizationPct:  number;
  realizationPct:  number;
  devs:            DevCapacity[];
  /** True quando nenhum dev tem horas estimadas no sprint */
  hasUnestimated:  boolean;
}

const DEFAULT_CAPACITY = 40;
const PAGE_SIZE = 1000;

async function fetchAllPages<T>(table: string, selectFields: string, filters?: (q: any) => any): Promise<T[]> {
  const MAX_PAGES = 20;
  let all: T[] = [];
  let from = 0;
  let pages = 0;
  while (pages < MAX_PAGES) {
    let q = supabase.from(table).select(selectFields).range(from, from + PAGE_SIZE - 1);
    if (filters) q = filters(q);
    const { data, error } = await (q as any);
    if (error) { console.error(`[useCapacityPlanner] Erro em ${table}:`, error); break; }
    const page = (data ?? []) as T[];
    all = [...all, ...page];
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
    pages++;
  }
  return all;
}

export function useCapacityPlanner() {
  const { teams } = useAuth();
  const [devs,    setDevs]    = useState<RawDev[]>([]);
  const [hus,     setHus]     = useState<RawHU[]>([]);
  const [acts,    setActs]    = useState<RawAct[]>([]);
  const [sprints, setSprints] = useState<RawSprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState("all");
  const cancelledRef = useRef(false);

  const load = useCallback(async () => {
    cancelledRef.current = false;
    setLoading(true);
    try {
      // Buscar sprints ativos primeiro para filtrar atividades apenas do sprint
      const sprintData = await fetchAllPages<RawSprint>(
        "sprints",
        "id, name, is_active, team_id, end_date",
        q => q.eq("is_active", true)
      );

      if (cancelledRef.current) return;

      const activeSprintIds = sprintData.map(s => s.id);

      // Buscar HUs apenas das sprints ativas (eliminar overfetch)
      const huQuery = activeSprintIds.length > 0
        ? (q: any) => q.in("sprint_id", activeSprintIds)
        : undefined;

      // Buscar atividades apenas das sprints ativas via HU
      // Nota: se a tabela activities nao tiver sprint_id, filtramos via hu_id em memoria
      // mas buscamos apenas HUs do sprint ativo primeiro para reduzir o volume
      const [devData, huData, actData] = await Promise.all([
        fetchAllPages<RawDev>("developers", "id, name, capacity, team_id"),
        fetchAllPages<RawHU>("user_stories",
          "id, status, estimated_hours, assignee_id, sprint_id, team_id",
          huQuery
        ),
        // Atividades: buscar todas mas apenas de HUs do sprint ativo (filtro em memoria abaixo)
        fetchAllPages<RawAct>("activities", "id, hu_id, hours, assignee_id"),
      ]);

      if (cancelledRef.current) return;

      setSprints(sprintData);
      setDevs(devData);
      setHus(huData);
      // Filtrar atividades apenas das HUs carregadas (ja sao somente do sprint ativo)
      const huIdSet = new Set(huData.map(h => h.id));
      setActs(actData.filter(a => huIdSet.has(a.hu_id)));
    } catch (err) {
      console.error("[useCapacityPlanner] Erro inesperado:", err);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => { cancelledRef.current = true; };
  }, [load]);

  const teamCapacities: TeamCapacity[] = useMemo(() => {
    // Pre-computar mapa de atividades por HU: O(m)
    const actsByHuId = acts.reduce<Record<string, RawAct[]>>((acc, a) => {
      if (!acc[a.hu_id]) acc[a.hu_id] = [];
      acc[a.hu_id].push(a);
      return acc;
    }, {});

    return teams
      .filter(t => selectedTeam === "all" || t.id === selectedTeam)
      .map(team => {
        const activeSprint  = sprints.find(s => s.team_id === team.id) ?? null;
        const teamDevs      = devs.filter(d => d.team_id === team.id);
        // HUs ja sao filtradas por sprint ativo na carga
        const sprintHUs     = activeSprint
          ? hus.filter(h => h.sprint_id === activeSprint.id)
          : [];
        const sprintHUIds   = new Set(sprintHUs.map(h => h.id));

        const devCapacities: DevCapacity[] = teamDevs.map(dev => {
          const cap          = dev.capacity ?? DEFAULT_CAPACITY;
          const devHUs       = sprintHUs.filter(h => h.assignee_id === dev.id);
          const unestimated  = devHUs.filter(h => h.estimated_hours === null).length;
          const allocated    = devHUs.reduce((s, h) => s + (h.estimated_hours ?? 0), 0);
          // Atividades via mapa pre-computado
          const devActs      = devHUs.flatMap(h => actsByHuId[h.id] ?? []).filter(a => a.assignee_id === dev.id);
          const realized     = devActs.reduce((s, a) => s + a.hours, 0);
          const wip          = devHUs.filter(h => isWip(h.status)).length;
          const utilPct      = cap > 0 ? Math.round((allocated / cap) * 100) : 0;
          const realPct      = cap > 0 ? Math.round((realized  / cap) * 100) : 0;

          // Se todas as HUs sem estimativa E nenhuma hora alocada -> status unknown
          const status: CapacityStatus =
            devHUs.length > 0 && unestimated === devHUs.length
              ? "unknown"
              : utilPct >= 100 ? "overloaded"
              : utilPct >= 80  ? "warning"
              : utilPct > 0    ? "ok"
              : "idle";

          return {
            devId:            dev.id,
            devName:          dev.name,
            teamId:           team.id,
            teamName:         team.name,
            capacityHours:    cap,
            allocatedHours:   Math.round(allocated * 10) / 10,
            realizedHours:    Math.round(realized  * 10) / 10,
            wipCount:         wip,
            utilizationPct:   utilPct,
            realizationPct:   realPct,
            status,
            unestimatedCount: unestimated,
            noActiveSprint:   !activeSprint,
          };
        });

        const totalCap   = devCapacities.reduce((s, d) => s + d.capacityHours,  0);
        const totalAlloc = devCapacities.reduce((s, d) => s + d.allocatedHours, 0);
        const totalReal  = devCapacities.reduce((s, d) => s + d.realizedHours,  0);
        const hasUnestimated = devCapacities.some(d => d.unestimatedCount > 0);

        return {
          teamId:          team.id,
          teamName:        team.name,
          module:          team.module,
          sprintAtivo:     activeSprint?.name     ?? null,
          sprintEndDate:   activeSprint?.end_date  ?? null,
          totalCapacity:   totalCap,
          totalAllocated:  Math.round(totalAlloc * 10) / 10,
          totalRealized:   Math.round(totalReal  * 10) / 10,
          utilizationPct:  totalCap > 0 ? Math.round((totalAlloc / totalCap) * 100) : 0,
          realizationPct:  totalCap > 0 ? Math.round((totalReal  / totalCap) * 100) : 0,
          devs:            devCapacities.sort((a, b) => b.utilizationPct - a.utilizationPct),
          hasUnestimated,
        };
      });
  }, [teams, devs, hus, acts, sprints, selectedTeam]);

  const overloadedDevs = useMemo(
    () => teamCapacities.flatMap(t => t.devs).filter(d => d.status === "overloaded"),
    [teamCapacities]
  );

  const unknownStatusDevs = useMemo(
    () => teamCapacities.flatMap(t => t.devs).filter(d => d.status === "unknown"),
    [teamCapacities]
  );

  return {
    teamCapacities,
    overloadedDevs,
    unknownStatusDevs,
    loading,
    selectedTeam,
    setSelectedTeam,
    reload: load,
  };
}
