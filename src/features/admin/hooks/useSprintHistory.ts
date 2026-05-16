import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isConcluido } from "@/shared/constants/statusConstants";

// -- Raw types ----------------------------------------------------------------
interface RawSprint    { id: string; name: string; goal: string | null; start_date: string; end_date: string; is_active: boolean; team_id: string; }
interface RawHU        { id: string; sprint_id: string | null; status: string; story_points: number | null; estimated_hours: number | null; assignee_id: string | null; team_id: string; }
interface RawActivity  { id: string; hu_id: string; hours: number; team_id: string; }
interface RawImpediment{ id: string; sprint_id: string | null; hu_id: string | null; resolved_at: string | null; team_id: string; }
interface RawDeveloper { id: string; name: string; team_id: string; }

// -- Public types -------------------------------------------------------------
export interface DevStat {
  developerId: string;
  developerName: string;
  husCount: number;
  estimatedHours: number;
  realizedHours: number;
}

export interface SprintMetrics {
  sprintId:         string;
  sprintName:       string;
  teamId:           string;
  teamName:         string;
  startDate:        string;
  endDate:          string;
  goal:             string | null;
  durationDays:     number;
  totalHUs:         number;
  husConcluidadas:  number;
  taxaConclusao:    number;   // 0-100
  velocityPontos:   number;
  horasPlanejadas:  number;
  horasRealizadas:  number;
  desvioHoras:      number;   // realizadas - planejadas
  impedimentos:     number;
  devStats:         DevStat[];
  /** Avisa se durationDays e negativo (dados invalidos no banco) */
  durationWarning?: boolean;
}

export type PeriodoFiltro = "3m" | "6m" | "12m" | "all";

export interface SprintHistoryFilters {
  teamId:  string;        // "all" | teamId
  periodo: PeriodoFiltro;
}

export interface TeamComparativo {
  teamId:   string;
  teamName: string;
  module:   string;
  avgVelocity:       number;
  avgTaxaConclusao:  number;
  avgDesvioHoras:    number;
  totalSprints:      number;
  totalImpedimentos: number;
  /** Sem dados suficientes no periodo selecionado */
  semDados: boolean;
}

const PAGE_SIZE = 1000;

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function cutoffDate(periodo: PeriodoFiltro): Date | null {
  if (periodo === "all") return null;
  const d = new Date();
  const months = periodo === "3m" ? 3 : periodo === "6m" ? 6 : 12;
  d.setMonth(d.getMonth() - months);
  return d;
}

/** Busca paginada generica */
async function fetchAllPages<T>(
  table: string,
  selectFields: string,
  filters?: (q: any) => any
): Promise<T[]> {
  const MAX_PAGES = 20;
  let all: T[] = [];
  let from = 0;
  let pages = 0;

  while (pages < MAX_PAGES) {
    let q = supabase.from(table).select(selectFields).range(from, from + PAGE_SIZE - 1);
    if (filters) q = filters(q);
    const { data, error } = await (q as any);
    if (error) {
      console.error(`[useSprintHistory] Erro ao buscar ${table}:`, error);
      break;
    }
    const page = (data ?? []) as T[];
    all = [...all, ...page];
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
    pages++;
  }
  return all;
}

export function useSprintHistory() {
  const { teams } = useAuth();
  const [sprints,     setSprints]     = useState<RawSprint[]>([]);
  const [hus,         setHus]         = useState<RawHU[]>([]);
  const [activities,  setActivities]  = useState<RawActivity[]>([]);
  const [impediments, setImpediments] = useState<RawImpediment[]>([]);
  const [developers,  setDevelopers]  = useState<RawDeveloper[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filters,     setFilters]     = useState<SprintHistoryFilters>({ teamId: "all", periodo: "6m" });
  const cancelledRef = useRef(false);

  const load = useCallback(async () => {
    cancelledRef.current = false;
    setLoading(true);
    try {
      const [
        spData,
        huData,
        actData,
        impData,
        devData,
      ] = await Promise.all([
        fetchAllPages<RawSprint>("sprints",
          "id, name, goal, start_date, end_date, is_active, team_id",
          q => q.eq("is_active", false).order("end_date", { ascending: false })
        ),
        fetchAllPages<RawHU>("user_stories",
          "id, sprint_id, status, story_points, estimated_hours, assignee_id, team_id"
        ),
        fetchAllPages<RawActivity>("activities",
          "id, hu_id, hours, team_id"
        ),
        fetchAllPages<RawImpediment>("impediments",
          "id, sprint_id, hu_id, resolved_at, team_id"
        ),
        fetchAllPages<RawDeveloper>("developers",
          "id, name, team_id"
        ),
      ]);

      if (cancelledRef.current) return;

      setSprints(spData);
      setHus(huData);
      setActivities(actData);
      setImpediments(impData);
      setDevelopers(devData);
    } catch (err) {
      console.error("[useSprintHistory] Erro inesperado:", err);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => { cancelledRef.current = true; };
  }, [load]);

  // -- Metricas por sprint -----------------------------------------------------
  const metrics: SprintMetrics[] = useMemo(() => {
    const cutoff = cutoffDate(filters.periodo);
    const teamMap: Record<string, string> = {};
    teams.forEach(t => { teamMap[t.id] = t.name; });

    // Pre-computar mapa de atividades por HU: O(m) unico
    const actsByHuId = activities.reduce<Record<string, RawActivity[]>>((acc, a) => {
      if (!acc[a.hu_id]) acc[a.hu_id] = [];
      acc[a.hu_id].push(a);
      return acc;
    }, {});

    return sprints
      .filter(s => {
        if (filters.teamId !== "all" && s.team_id !== filters.teamId) return false;
        if (cutoff && new Date(s.end_date) < cutoff) return false;
        return true;
      })
      .map(s => {
        const sprintHUs   = hus.filter(h => h.sprint_id === s.id);
        const concluidas  = sprintHUs.filter(h => isConcluido(h.status));
        const huIds       = new Set(sprintHUs.map(h => h.id));
        // O(m_sprint) usando mapa pre-computado em vez de O(n*m)
        const sprintActs  = Array.from(huIds).flatMap(id => actsByHuId[id] ?? []);
        const sprintImps  = impediments.filter(i => i.sprint_id === s.id || (i.hu_id && huIds.has(i.hu_id)));
        const devMap      = Object.fromEntries(
          developers.filter(d => d.team_id === s.team_id).map(d => [d.id, d.name])
        );

        const horasPlan   = sprintHUs.reduce((acc, h) => acc + (h.estimated_hours ?? 0), 0);
        const horasReal   = sprintActs.reduce((acc, a) => acc + (a.hours ?? 0), 0);
        const velocity    = concluidas.reduce((acc, h) => acc + (h.story_points ?? 0), 0);
        const duration    = daysBetween(s.start_date, s.end_date);

        // Stats por desenvolvedor usando mapa pre-computado
        const devStatsMap: Record<string, DevStat> = {};
        sprintHUs.forEach(h => {
          const devId = h.assignee_id ?? "__unassigned__";
          if (!devStatsMap[devId]) {
            devStatsMap[devId] = {
              developerId:   devId,
              developerName: devMap[devId] ?? "Nao atribuido",
              husCount:      0,
              estimatedHours: 0,
              realizedHours: 0,
            };
          }
          devStatsMap[devId].husCount++;
          devStatsMap[devId].estimatedHours += h.estimated_hours ?? 0;
          // Usa mapa pre-computado: O(1) lookup
          const devHUActs = actsByHuId[h.id] ?? [];
          devStatsMap[devId].realizedHours += devHUActs.reduce((s, a) => s + a.hours, 0);
        });

        return {
          sprintId:        s.id,
          sprintName:      s.name,
          teamId:          s.team_id,
          teamName:        teamMap[s.team_id] ?? s.team_id,
          startDate:       s.start_date,
          endDate:         s.end_date,
          goal:            s.goal,
          durationDays:    duration,
          durationWarning: duration < 0, // guarda contra dados invalidos no banco
          totalHUs:        sprintHUs.length,
          husConcluidadas: concluidas.length,
          taxaConclusao:   sprintHUs.length > 0
            ? Math.round((concluidas.length / sprintHUs.length) * 100)
            : 0,
          velocityPontos:  velocity,
          horasPlanejadas: Math.round(horasPlan * 10) / 10,
          horasRealizadas: Math.round(horasReal * 10) / 10,
          desvioHoras:     Math.round((horasReal - horasPlan) * 10) / 10,
          impedimentos:    sprintImps.length,
          devStats:        Object.values(devStatsMap).sort((a, b) => b.husCount - a.husCount),
        } satisfies SprintMetrics;
      });
  }, [sprints, hus, activities, impediments, developers, teams, filters]);

  // -- Comparativo entre times -------------------------------------------------
  const teamComparativo: TeamComparativo[] = useMemo(() => {
    return teams.map(team => {
      const teamMetrics = metrics.filter(m => m.teamId === team.id);
      const n = teamMetrics.length;
      const semDados = n === 0;

      if (semDados) {
        return {
          teamId:            team.id,
          teamName:          team.name,
          module:            team.module,
          avgVelocity:       0,
          avgTaxaConclusao:  0,
          avgDesvioHoras:    0,
          totalSprints:      0,
          totalImpedimentos: 0,
          semDados:          true,
        };
      }

      const avg = (arr: number[]) =>
        Math.round((arr.reduce((a, b) => a + b, 0) / n) * 10) / 10;

      return {
        teamId:            team.id,
        teamName:          team.name,
        module:            team.module,
        avgVelocity:       avg(teamMetrics.map(m => m.velocityPontos)),
        avgTaxaConclusao:  avg(teamMetrics.map(m => m.taxaConclusao)),
        avgDesvioHoras:    avg(teamMetrics.map(m => m.desvioHoras)),
        totalSprints:      n,
        totalImpedimentos: teamMetrics.reduce((s, m) => s + m.impedimentos, 0),
        semDados:          false,
      };
    }).filter(t => !t.semDados || filters.teamId === "all");
  }, [metrics, teams, filters]);

  return { metrics, teamComparativo, loading, filters, setFilters, reload: load };
}
