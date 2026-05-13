import { useMemo } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { useDemandas } from "@/features/sustentacao/hooks/useDemandas";
import { useAuth } from "@/contexts/AuthContext";

export interface AdminKpis {
  // Sala Ágil
  sprintAtivo: string | null;
  sprintEndDate: string | null;
  totalHUs: number;
  husConcluidasNoSprint: number;
  husBloqueadas: number;
  impedimentosAbertos: number;
  velocityPontos: number;
  backlogTotal: number;
  // Sustentação
  demandasAbertas: number;
  demandasConcluidas: number;
  demandasBloqueadas: number;
  slaEmRisco: number;   // demandas criadas há > 5 dias sem conclusão
  totalTimes: number;
  timesSustentacao: number;
  timesSalaAgil: number;
}

const STATUSES_CONCLUIDOS = ["concluido", "resolvido", "aceite_final", "ag_aceite_final"];
const STATUSES_BLOQUEADOS  = ["bloqueada", "bloqueado"];
const SLA_DIAS_RISCO       = 5;

export function useAdminKpis(): AdminKpis {
  const { activeSprint, userStories, impediments, sprints } = useSprint();
  const { demandas } = useDemandas();
  const { teams }   = useAuth();

  return useMemo(() => {
    // ── Sala Ágil
    const husDoSprint   = activeSprint
      ? userStories.filter(h => h.sprintId === activeSprint.id)
      : [];
    const husConcluidas = husDoSprint.filter(h => STATUSES_CONCLUIDOS.includes(h.status));
    const husBloqueadas = userStories.filter(h => h.status === "bloqueado" || h.status === "bloqueada").length;
    const impedAbertos  = impediments.filter(i => !i.resolvedAt).length;
    const velocityPts   = husConcluidas.reduce((s, h) => s + (h.storyPoints ?? 0), 0);
    const backlog       = userStories.filter(h => !h.sprintId).length;

    // ── Sustentação
    const hoje = new Date();
    const limiteRisco = new Date(hoje);
    limiteRisco.setDate(hoje.getDate() - SLA_DIAS_RISCO);

    const demandasAbertas    = demandas.filter(d => !STATUSES_CONCLUIDOS.includes(d.situacao?.toLowerCase() ?? "")).length;
    const demandasConcluidas = demandas.filter(d =>  STATUSES_CONCLUIDOS.includes(d.situacao?.toLowerCase() ?? "")).length;
    const demandasBloqueadas = demandas.filter(d =>  STATUSES_BLOQUEADOS.includes(d.situacao?.toLowerCase()  ?? "")).length;
    const slaEmRisco         = demandas.filter(d => {
      const aberto    = !STATUSES_CONCLUIDOS.includes(d.situacao?.toLowerCase() ?? "");
      const criada    = new Date(d.created_at);
      return aberto && criada <= limiteRisco;
    }).length;

    // ── Times
    const timesSala  = teams.filter(t => t.module === "sala_agil").length;
    const timesSust  = teams.filter(t => t.module === "sustentacao").length;

    return {
      sprintAtivo:           activeSprint?.name ?? null,
      sprintEndDate:         activeSprint?.endDate ?? null,
      totalHUs:              husDoSprint.length,
      husConcluidasNoSprint: husConcluidas.length,
      husBloqueadas,
      impedimentosAbertos:   impedAbertos,
      velocityPontos:        velocityPts,
      backlogTotal:          backlog,
      demandasAbertas,
      demandasConcluidas,
      demandasBloqueadas,
      slaEmRisco,
      totalTimes:            teams.length,
      timesSustentacao:      timesSust,
      timesSalaAgil:         timesSala,
    };
  }, [activeSprint, userStories, impediments, demandas, teams]);
}
