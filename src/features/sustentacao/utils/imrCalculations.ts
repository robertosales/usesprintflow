/**
 * @deprecated
 * Este módulo está DEPRECADO.
 *
 * Os cálculos de IMR foram migrados para o banco de dados.
 * Use o hook `useImrPeriodo` que consome a RPC `calc_imr_periodo`:
 *
 * ```ts
 * import { useImrPeriodo } from '@/features/sustentacao/hooks/useImrPeriodo';
 *
 * const { data } = useImrPeriodo({ teamId, inicio: '2026-05-01', fim: '2026-05-31' });
 * // data.iap, data.iqs, data.ict, data.iss, data.imr_final
 * ```
 *
 * Migration: supabase/migrations/20260520070000_rpc_calc_imr_periodo.sql
 *
 * NÃO adicionar novas funcionalidades aqui.
 * Este arquivo será removido em sprint futura após migração completa do frontend.
 */

// ─── Tipos exportados (mantidos para compatibilidade retroativa) ──────────────

export interface ImrInput {
  totalDemandas: number;
  demandasNoPrazo: number;
  demandasComQualidade: number;
  demandasComTecnica: number;
  demandasComSatisfacao: number;
  glosas: number;
}

export interface ImrResult {
  iap: number; // Índice de Atendimento no Prazo
  iqs: number; // Índice de Qualidade no Serviço
  ict: number; // Índice de Capacidade Técnica
  iss: number; // Índice de Satisfação no Serviço
  imrFinal: number;
  glosaAplicada: number;
}

/**
 * @deprecated Use RPC `calc_imr_periodo` via hook `useImrPeriodo`.
 */
export function calcularIAP(demandasNoPrazo: number, total: number): number {
  if (total === 0) return 100;
  return Math.min(100, (demandasNoPrazo / total) * 100);
}

/**
 * @deprecated Use RPC `calc_imr_periodo` via hook `useImrPeriodo`.
 */
export function calcularIQS(demandasComQualidade: number, total: number): number {
  if (total === 0) return 100;
  return Math.min(100, (demandasComQualidade / total) * 100);
}

/**
 * @deprecated Use RPC `calc_imr_periodo` via hook `useImrPeriodo`.
 */
export function calcularICT(demandasComTecnica: number, total: number): number {
  if (total === 0) return 100;
  return Math.min(100, (demandasComTecnica / total) * 100);
}

/**
 * @deprecated Use RPC `calc_imr_periodo` via hook `useImrPeriodo`.
 */
export function calcularISS(demandasComSatisfacao: number, total: number): number {
  if (total === 0) return 100;
  return Math.min(100, (demandasComSatisfacao / total) * 100);
}

/**
 * @deprecated Use RPC `calc_imr_periodo` via hook `useImrPeriodo`.
 */
export function calcularIMR(input: ImrInput): ImrResult {
  const iap = calcularIAP(input.demandasNoPrazo, input.totalDemandas);
  const iqs = calcularIQS(input.demandasComQualidade, input.totalDemandas);
  const ict = calcularICT(input.demandasComTecnica, input.totalDemandas);
  const iss = calcularISS(input.demandasComSatisfacao, input.totalDemandas);

  // Média ponderada simples (pesos iguais por padrão)
  const imrFinal = (iap + iqs + ict + iss) / 4;
  const glosaAplicada = input.glosas;

  return { iap, iqs, ict, iss, imrFinal, glosaAplicada };
}
