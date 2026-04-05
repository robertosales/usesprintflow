import type { Demanda, DemandaTransition, DemandaHour } from "../types/demanda";

// ── Helpers ──
function diffHours(a: string, b: string): number {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60);
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

// ── Atendimento e Volume ──
export function calcAtendimento(demandas: Demanda[], backlogDays = 30) {
  const ativos = demandas.filter(d => d.situacao !== 'aceite_final');
  const total = ativos.length;
  const abertosHoje = demandas.filter(d => isToday(d.created_at)).length;
  const resolvidosHoje = demandas.filter(d => d.situacao === 'aceite_final' && d.aceite_data && isToday(d.aceite_data)).length;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - backlogDays);
  const backlog = ativos.filter(d => new Date(d.created_at) < cutoff).length;

  // Taxa de reabertura: demandas que têm transição aceite_final -> qualquer outra coisa
  // Simplified: count demandas that went to aceite_final and back
  return { total, abertosHoje, resolvidosHoje, backlog, backlogDays };
}

// ── Tempo ──
export function calcTempos(demandas: Demanda[], transitions: DemandaTransition[]) {
  const transitionsByDemanda = new Map<string, DemandaTransition[]>();
  transitions.forEach(t => {
    const arr = transitionsByDemanda.get(t.demanda_id) || [];
    arr.push(t);
    transitionsByDemanda.set(t.demanda_id, arr);
  });

  let tmrSum = 0, tmrCount = 0;
  let mttrSum = 0, mttrCount = 0;
  let mttaSum = 0, mttaCount = 0;

  demandas.forEach(d => {
    const ts = transitionsByDemanda.get(d.id) || [];
    if (ts.length === 0) return;

    // Sort by created_at ascending
    const sorted = [...ts].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // TMR: time from creation to first transition away from 'nova'
    const firstAction = sorted.find(t => t.from_status === 'nova');
    if (firstAction) {
      tmrSum += diffHours(d.created_at, firstAction.created_at);
      tmrCount++;
    }

    // MTTA: same as TMR for now (first acknowledgment)
    const firstAck = sorted[0];
    if (firstAck) {
      mttaSum += diffHours(d.created_at, firstAck.created_at);
      mttaCount++;
    }

    // MTTR: time from creation to aceite_final
    if (d.situacao === 'aceite_final') {
      const aceiteTransition = sorted.find(t => t.to_status === 'aceite_final');
      if (aceiteTransition) {
        mttrSum += diffHours(d.created_at, aceiteTransition.created_at);
        mttrCount++;
      }
    }
  });

  return {
    tmr: tmrCount > 0 ? tmrSum / tmrCount : 0,
    mttr: mttrCount > 0 ? mttrSum / mttrCount : 0,
    tma: mttrCount > 0 ? mttrSum / mttrCount : 0, // TMA ≈ MTTR for simplification
    mtta: mttaCount > 0 ? mttaSum / mttaCount : 0,
    tmrCount,
    mttrCount,
    mttaCount,
  };
}

// ── SLA ──
export interface SLAResult {
  demandaId: string;
  rhm: string;
  projeto: string;
  prioridade: string;
  abertura: string;
  prazoSLA: string;
  resolucao: string | null;
  statusSLA: 'dentro' | 'em_risco' | 'violado';
  atraso: number; // hours
  analista: string | null;
}

export function calcSLA(demandas: Demanda[], transitions: DemandaTransition[]): { results: SLAResult[]; compliance: number; violados: number; emRisco: number } {
  // SLA thresholds in hours
  const SLA_HOURS: Record<string, number> = { '24x7': 4, 'padrao': 24 };

  const transitionsByDemanda = new Map<string, DemandaTransition[]>();
  transitions.forEach(t => {
    const arr = transitionsByDemanda.get(t.demanda_id) || [];
    arr.push(t);
    transitionsByDemanda.set(t.demanda_id, arr);
  });

  const results: SLAResult[] = demandas.map(d => {
    const slaHours = SLA_HOURS[d.sla] || 24;
    const prazo = new Date(new Date(d.created_at).getTime() + slaHours * 60 * 60 * 1000);
    const ts = transitionsByDemanda.get(d.id) || [];
    const aceite = ts.find(t => t.to_status === 'aceite_final');
    const resolucao = aceite ? aceite.created_at : null;
    const now = new Date();
    let statusSLA: 'dentro' | 'em_risco' | 'violado' = 'dentro';
    let atraso = 0;

    if (resolucao) {
      if (new Date(resolucao) > prazo) {
        statusSLA = 'violado';
        atraso = diffHours(prazo.toISOString(), resolucao);
      }
    } else {
      if (now > prazo) {
        statusSLA = 'violado';
        atraso = diffHours(prazo.toISOString(), now.toISOString());
      } else {
        const remaining = (prazo.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (remaining < 2) statusSLA = 'em_risco';
      }
    }

    return {
      demandaId: d.id,
      rhm: d.rhm,
      projeto: d.projeto,
      prioridade: d.sla === '24x7' ? 'Crítico' : 'Padrão',
      abertura: d.created_at,
      prazoSLA: prazo.toISOString(),
      resolucao,
      statusSLA,
      atraso,
      analista: d.responsavel_dev,
    };
  });

  const total = results.length;
  const dentro = results.filter(r => r.statusSLA === 'dentro').length;
  const violados = results.filter(r => r.statusSLA === 'violado').length;
  const emRisco = results.filter(r => r.statusSLA === 'em_risco').length;
  const compliance = total > 0 ? (dentro / total) * 100 : 0;

  return { results, compliance, violados, emRisco, total };
}

// ── Produtividade por Analista ──
export interface AnalistaStats {
  userId: string;
  nome: string;
  atribuidos: number;
  resolvidos: number;
  taxaResolucao: number;
  mttrIndividual: number;
  fcrIndividual: number;
  horasLancadas: number;
  emAberto: number;
  slaCompliance: number;
}

export function calcProdutividade(
  demandas: Demanda[],
  transitions: DemandaTransition[],
  hours: DemandaHour[],
  profiles: Array<{ user_id: string; display_name: string }>
): AnalistaStats[] {
  const analistas = new Map<string, AnalistaStats>();

  const getOrCreate = (userId: string): AnalistaStats => {
    if (!analistas.has(userId)) {
      const p = profiles.find(pr => pr.user_id === userId);
      analistas.set(userId, {
        userId,
        nome: p?.display_name || userId.slice(0, 8),
        atribuidos: 0,
        resolvidos: 0,
        taxaResolucao: 0,
        mttrIndividual: 0,
        fcrIndividual: 0,
        horasLancadas: 0,
        emAberto: 0,
        slaCompliance: 0,
      });
    }
    return analistas.get(userId)!;
  };

  // Count demandas by responsavel_dev
  demandas.forEach(d => {
    if (d.responsavel_dev) {
      const a = getOrCreate(d.responsavel_dev);
      a.atribuidos++;
      if (d.situacao === 'aceite_final') a.resolvidos++;
      else a.emAberto++;
    }
  });

  // Sum hours by user
  hours.forEach(h => {
    const a = getOrCreate(h.user_id);
    a.horasLancadas += Number(h.horas);
  });

  // Calc derived metrics
  analistas.forEach(a => {
    a.taxaResolucao = a.atribuidos > 0 ? (a.resolvidos / a.atribuidos) * 100 : 0;
  });

  return Array.from(analistas.values()).sort((a, b) => b.resolvidos - a.resolvidos);
}

export function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}min`;
  return `${h.toFixed(1)}h`;
}
