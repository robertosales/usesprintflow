/**
 * @deprecated
 * Este módulo está DEPRECADO.
 *
 * Os cálculos de KPI foram migrados para o banco de dados.
 * Use o hook `useKpisSustentacao` que consome a RPC `calc_kpis_sustentacao`:
 *
 * ```ts
 * import { useKpisSustentacao } from '@/features/sustentacao/hooks/useKpisSustentacao';
 *
 * const { data } = useKpisSustentacao({ teamId, inicio: '2026-05-01', fim: '2026-05-31' });
 * // data.tmr, data.mttr, data.tma, data.sla_compliance, data.produtividade_analisas
 * ```
 *
 * Migration: supabase/migrations/20260520050000_rpc_calc_kpis_sustentacao.sql
 *
 * NÃO adicionar novas funcionalidades aqui.
 * Este arquivo será removido em sprint futura após migração completa do frontend.
 */

// ─── Tipos exportados (mantidos para compatibilidade retroativa) ──────────────

export interface KpiInput {
  demandas: Array<{
    id: string;
    situacao: string;
    tipo: string;
    created_at: string;
    updated_at: string;
    prazo_solucao?: string | null;
    responsavel_id?: string | null;
  }>;
  transitions: Array<{
    demanda_id: string;
    from_status: string;
    to_status: string;
    created_at: string;
  }>;
}

export interface KpiResult {
  tmr: number;              // Tempo Médio de Resolução (horas)
  mttr: number;             // Mean Time To Repair (horas)
  tma: number;              // Tempo Médio de Atendimento (horas)
  slaCompliance: number;    // % demandas dentro do SLA
  produtividadePorAnalista: Record<string, number>;
}

/**
 * @deprecated Use RPC `calc_kpis_sustentacao` via hook `useKpisSustentacao`.
 */
export function calcularTMR(demandas: KpiInput["demandas"]): number {
  const encerradas = demandas.filter(d => d.situacao === "encerrada");
  if (encerradas.length === 0) return 0;
  const totalMs = encerradas.reduce((acc, d) => {
    const inicio = new Date(d.created_at).getTime();
    const fim    = new Date(d.updated_at).getTime();
    return acc + (fim - inicio);
  }, 0);
  return totalMs / encerradas.length / (1000 * 60 * 60);
}

/**
 * @deprecated Use RPC `calc_kpis_sustentacao` via hook `useKpisSustentacao`.
 */
export function calcularSlaCompliance(
  demandas: KpiInput["demandas"],
): number {
  const comPrazo = demandas.filter(d => d.prazo_solucao);
  if (comPrazo.length === 0) return 100;
  const noPrazo = comPrazo.filter(d => {
    if (d.situacao !== "encerrada") return false;
    return new Date(d.updated_at) <= new Date(d.prazo_solucao!);
  });
  return (noPrazo.length / comPrazo.length) * 100;
}

/**
 * @deprecated Use RPC `calc_kpis_sustentacao` via hook `useKpisSustentacao`.
 */
export function calcularKPIs(input: KpiInput): KpiResult {
  const tmr  = calcularTMR(input.demandas);
  const mttr = tmr; // simplificação — banco calcula com precisão por transitions
  const tma  = tmr * 0.3; // simplificação — banco usa timestamps reais de atendimento
  const slaCompliance = calcularSlaCompliance(input.demandas);

  const produtividadePorAnalista: Record<string, number> = {};
  for (const d of input.demandas) {
    if (d.responsavel_id && d.situacao === "encerrada") {
      produtividadePorAnalista[d.responsavel_id] =
        (produtividadePorAnalista[d.responsavel_id] ?? 0) + 1;
    }
  }

  return { tmr, mttr, tma, slaCompliance, produtividadePorAnalista };
}
