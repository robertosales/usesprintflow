// src/features/sustentacao/utils/kpiCalculations.ts

import type { Demanda, DemandaTransition, DemandaHour } from "../types/demanda";

// ── Helpers internos ──────────────────────────────────────────────────────────

function diffHours(a: string, b: string): number {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60);
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isResolvido(situacao?: string | null): boolean {
  return ["concluido", "resolvido", "aceite_final"].includes(situacao?.toLowerCase() ?? "");
}

function isAberto(situacao?: string | null): boolean {
  return ["aberto", "em_andamento", "nova", "em_analise"].includes(situacao?.toLowerCase() ?? "");
}

// ── Atendimento e Volume ──────────────────────────────────────────────────────

export function calcAtendimento(demandas: Demanda[], backlogDays = 30) {
  const ativos = demandas.filter((d) => d.situacao !== "aceite_final");
  const total = ativos.length;
  const abertosHoje = demandas.filter((d) => isToday(d.created_at)).length;
  const resolvidosHoje = demandas.filter(
    (d) => d.situacao === "aceite_final" && d.aceite_data && isToday(d.aceite_data),
  ).length;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - backlogDays);
  const backlog = ativos.filter((d) => new Date(d.created_at) < cutoff).length;

  return { total, abertosHoje, resolvidosHoje, backlog, backlogDays };
}

// ── Tempos ────────────────────────────────────────────────────────────────────

export function calcTempos(demandas: Demanda[], transitions: DemandaTransition[]) {
  const transitionsByDemanda = new Map<string, DemandaTransition[]>();
  transitions.forEach((t) => {
    const arr = transitionsByDemanda.get(t.demanda_id) || [];
    arr.push(t);
    transitionsByDemanda.set(t.demanda_id, arr);
  });

  let tmrSum = 0,
    tmrCount = 0;
  let mttrSum = 0,
    mttrCount = 0;
  let mttaSum = 0,
    mttaCount = 0;

  demandas.forEach((d) => {
    const ts = transitionsByDemanda.get(d.id) || [];
    if (ts.length === 0) return;

    const sorted = [...ts].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const firstAction = sorted.find((t) => t.from_status === "nova");
    if (firstAction) {
      tmrSum += diffHours(d.created_at, firstAction.created_at);
      tmrCount++;
    }

    const firstAck = sorted[0];
    if (firstAck) {
      mttaSum += diffHours(d.created_at, firstAck.created_at);
      mttaCount++;
    }

    if (d.situacao === "aceite_final") {
      const aceiteTransition = sorted.find((t) => t.to_status === "aceite_final");
      if (aceiteTransition) {
        mttrSum += diffHours(d.created_at, aceiteTransition.created_at);
        mttrCount++;
      }
    }
  });

  return {
    tmr: tmrCount > 0 ? tmrSum / tmrCount : 0,
    mttr: mttrCount > 0 ? mttrSum / mttrCount : 0,
    tma: mttrCount > 0 ? mttrSum / mttrCount : 0,
    mtta: mttaCount > 0 ? mttaSum / mttaCount : 0,
    tmrCount,
    mttrCount,
    mttaCount,
  };
}

// ── SLA ───────────────────────────────────────────────────────────────────────

export interface SLAResult {
  demandaId: string;
  rhm: string;
  projeto: string;
  prioridade: string;
  abertura: string;
  prazoSLA: string;
  resolucao: string | null;
  statusSLA: "dentro" | "em_risco" | "violado";
  atraso: number;
  analista: string | null;
}

export function calcSLA(
  demandas: Demanda[],
  transitions: DemandaTransition[],
): {
  results: SLAResult[];
  compliance: number;
  violados: number;
  emRisco: number;
  total: number;
} {
  const SLA_HOURS: Record<string, number> = { "24x7": 4, padrao: 24 };

  const transitionsByDemanda = new Map<string, DemandaTransition[]>();
  transitions.forEach((t) => {
    const arr = transitionsByDemanda.get(t.demanda_id) || [];
    arr.push(t);
    transitionsByDemanda.set(t.demanda_id, arr);
  });

  const results: SLAResult[] = demandas.map((d) => {
    const slaHours = SLA_HOURS[d.sla] || 24;
    const prazo = new Date(new Date(d.created_at).getTime() + slaHours * 60 * 60 * 1000);
    const ts = transitionsByDemanda.get(d.id) || [];
    const aceite = ts.find((t) => t.to_status === "aceite_final");
    const resolucao = aceite ? aceite.created_at : null;
    const now = new Date();
    let statusSLA: "dentro" | "em_risco" | "violado" = "dentro";
    let atraso = 0;

    if (resolucao) {
      if (new Date(resolucao) > prazo) {
        statusSLA = "violado";
        atraso = diffHours(prazo.toISOString(), resolucao);
      }
    } else {
      if (now > prazo) {
        statusSLA = "violado";
        atraso = diffHours(prazo.toISOString(), now.toISOString());
      } else {
        const remaining = (prazo.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (remaining < 2) statusSLA = "em_risco";
      }
    }

    return {
      demandaId: d.id,
      rhm: d.rhm,
      projeto: d.projeto,
      prioridade: d.sla === "24x7" ? "Crítico" : "Padrão",
      abertura: d.created_at,
      prazoSLA: prazo.toISOString(),
      resolucao,
      statusSLA,
      atraso,
      analista: d.responsavel_dev,
    };
  });

  const total = results.length;
  const dentro = results.filter((r) => r.statusSLA === "dentro").length;
  const violados = results.filter((r) => r.statusSLA === "violado").length;
  const emRisco = results.filter((r) => r.statusSLA === "em_risco").length;
  const compliance = total > 0 ? (dentro / total) * 100 : 0;

  return { results, compliance, violados, emRisco, total };
}

// ── Produtividade por Analista ────────────────────────────────────────────────
//
// REGRA: uma demanda pode ter N analistas — cada um lança horas via
// demanda_hours. "Atribuídos" de cada analista é a UNIÃO de:
//   1. demandas onde ele lançou ao menos 1 hora  (demanda_hours.user_id)
//   2. demandas onde é responsável em qualquer coluna
//      (responsavel_dev | responsavel_requisitos | responsavel_teste | responsavel_arquiteto)
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalistaStats {
  userId: string;
  nome: string;
  atribuidos: number;
  resolvidos: number;
  taxaResolucao: number;
  mttrIndividual: number | null;
  fcrIndividual: number;
  horasLancadas: number;
  emAberto: number;
  slaCompliance: number;
}

export function calcProdutividade(
  demandas: Demanda[],
  transitions: DemandaTransition[],
  hours: DemandaHour[],
  profiles: Array<{ user_id: string; display_name: string }>,
): AnalistaStats[] {
  // 1. Mapa user_id → Map<demanda_id, totalHoras>
  const horasPorUser = new Map<string, Map<string, number>>();
  hours.forEach((h) => {
    if (!h.user_id || !h.demanda_id) return;
    if (!horasPorUser.has(h.user_id)) horasPorUser.set(h.user_id, new Map());
    const m = horasPorUser.get(h.user_id)!;
    m.set(h.demanda_id, (m.get(h.demanda_id) ?? 0) + Number(h.horas ?? 0));
  });

  // 2. Todos os user_ids únicos (horas lançadas + colunas responsável)
  const todosIds = new Set<string>([...horasPorUser.keys()]);
  demandas.forEach((d) => {
    if (d.responsavel_dev) todosIds.add(d.responsavel_dev);
    if (d.responsavel_requisitos) todosIds.add(d.responsavel_requisitos);
    if (d.responsavel_teste) todosIds.add(d.responsavel_teste);
    if (d.responsavel_arquiteto) todosIds.add(d.responsavel_arquiteto);
  });

  const result: AnalistaStats[] = [...todosIds].map((userId) => {
    // IDs de demandas onde o analista lançou hora
    const demandasComHora = new Set<string>(horasPorUser.get(userId)?.keys() ?? []);

    // IDs de demandas onde é responsável direto em qualquer coluna
    const demandasResponsavel = new Set<string>(
      demandas
        .filter(
          (d) =>
            d.responsavel_dev === userId ||
            d.responsavel_requisitos === userId ||
            d.responsavel_teste === userId ||
            d.responsavel_arquiteto === userId,
        )
        .map((d) => d.id),
    );

    // União dos dois conjuntos
    const todasIds = new Set<string>([...demandasComHora, ...demandasResponsavel]);
    const atribuidas = demandas.filter((d) => todasIds.has(d.id));

    const resolvidos = atribuidas.filter((d) => isResolvido(d.situacao)).length;
    const emAberto = atribuidas.filter((d) => isAberto(d.situacao)).length;

    // Total de horas lançadas pelo analista
    const horasLancadas = [...(horasPorUser.get(userId)?.values() ?? [])].reduce((s, v) => s + v, 0);

    const taxaResolucao = atribuidas.length > 0 ? (resolvidos / atribuidas.length) * 100 : 0;

    // MTTR individual em horas
    const tempos = atribuidas
      .filter((d) => isResolvido(d.situacao))
      .map((d) => {
        const abertura = new Date(d.created_at).getTime();
        const conclusao = d.aceite_data
          ? new Date(d.aceite_data).getTime()
          : d.updated_at
            ? new Date(d.updated_at).getTime()
            : null;
        return conclusao ? (conclusao - abertura) / (1000 * 60 * 60) : null;
      })
      .filter((t): t is number => t !== null);

    const mttrIndividual = tempos.length > 0 ? tempos.reduce((s, t) => s + t, 0) / tempos.length : null;

    const profile = profiles.find((p) => p.user_id === userId);
    const nome = profile?.display_name || userId.slice(0, 8);

    return {
      userId,
      nome,
      atribuidos: atribuidas.length,
      resolvidos,
      emAberto,
      horasLancadas,
      taxaResolucao,
      mttrIndividual,
      fcrIndividual: 0, // calculado externamente se necessário
      slaCompliance: 0, // calculado externamente se necessário
    };
  });

  return result.sort((a, b) => b.resolvidos - a.resolvidos);
}

// ── KPI Geral (painel global) ─────────────────────────────────────────────────

export function calcKpiGeral(demandas: Demanda[], hours: DemandaHour[]) {
  const total = demandas.length;
  const resolvidos = demandas.filter((d) => isResolvido(d.situacao)).length;
  const emAberto = demandas.filter((d) => isAberto(d.situacao)).length;
  const taxa = total > 0 ? (resolvidos / total) * 100 : 0;
  const totalHoras = hours.reduce((s, h) => s + Number(h.horas ?? 0), 0);

  const tempos = demandas
    .filter((d) => isResolvido(d.situacao))
    .map((d) => {
      const abertura = new Date(d.created_at).getTime();
      const conclusao = d.aceite_data
        ? new Date(d.aceite_data).getTime()
        : d.updated_at
          ? new Date(d.updated_at).getTime()
          : null;
      return conclusao ? (conclusao - abertura) / (1000 * 60 * 60) : null;
    })
    .filter((t): t is number => t !== null);

  const mttrGeral = tempos.length > 0 ? tempos.reduce((s, t) => s + t, 0) / tempos.length : null;

  return { total, resolvidos, emAberto, taxa, totalHoras, mttrGeral };
}

// ── Formatação ────────────────────────────────────────────────────────────────

export function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}min`;
  return `${h.toFixed(1)}h`;
}
