/**
 * @deprecated
 * Este módulo está DEPRECADO.
 *
 * A lógica de SLA foi migrada para o banco de dados (PostgreSQL/Supabase).
 * Use a RPC `calc_sla_demanda` via Supabase client:
 *
 * ```ts
 * const { data } = await supabase.rpc('calc_sla_demanda', {
 *   p_inicio:  '2026-05-20T08:00:00',
 *   p_sla_horas: 8,
 *   p_regime:    'comercial',
 * });
 * // data.prazo_final: string (ISO timestamp)
 * // data.horas_uteis_disponiveis: number
 * ```
 *
 * Migration: supabase/migrations/20260520031000_feriados_e_calc_sla_demanda.sql
 *
 * NÃO adicionar novas funcionalidades aqui.
 * Este arquivo será removido em sprint futura após migração completa do frontend.
 */

// ─── Tipos exportados (mantidos para compatibilidade retroativa) ──────────────

export type Regime = "comercial" | "continuo";

export interface SlaConfig {
  horasUteis: number;
  regime: Regime;
  inicioJornada?: number; // hora de início (default 8)
  fimJornada?: number;    // hora de fim (default 18)
}

export interface SlaResult {
  prazoFinal: Date;
  horasUteisDisponiveis: number;
  dentroDoSla: boolean;
  horasDecorridas: number;
  percentualConsumido: number;
}

// ─── Feriados nacionais (HARDCODED — LEGADO) ──────────────────────────────────
// ⚠️ ATENÇÃO: estes feriados estão desatualizados e não cobrem estados/municípios.
// A versão canônica está na tabela `feriados` do banco de dados.
// Migration: 20260520031000_feriados_e_calc_sla_demanda.sql

const FERIADOS_NACIONAIS_LEGADO: string[] = [
  "2026-01-01",
  "2026-04-03",
  "2026-04-21",
  "2026-05-01",
  "2026-09-07",
  "2026-10-12",
  "2026-11-02",
  "2026-11-15",
  "2026-12-25",
];

function isFeriadoLegado(date: Date): boolean {
  const iso = date.toISOString().slice(0, 10);
  return FERIADOS_NACIONAIS_LEGADO.includes(iso);
}

function isDiaUtil(date: Date, regime: Regime): boolean {
  if (regime === "continuo") return true;
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return false;
  return !isFeriadoLegado(date);
}

/**
 * @deprecated Use RPC `calc_sla_demanda` no banco.
 */
export function calcularPrazoSla(inicio: Date, config: SlaConfig): SlaResult {
  const { horasUteis, regime, inicioJornada = 8, fimJornada = 18 } = config;
  const horasDia = regime === "continuo" ? 24 : fimJornada - inicioJornada;

  let horasRestantes = horasUteis;
  let cursor = new Date(inicio);

  while (horasRestantes > 0) {
    if (isDiaUtil(cursor, regime)) {
      const horasDisponiveis = Math.min(horasRestantes, horasDia);
      horasRestantes -= horasDisponiveis;
      if (horasRestantes > 0) {
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(inicioJornada, 0, 0, 0);
      } else {
        cursor.setHours(cursor.getHours() + horasDisponiveis);
      }
    } else {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(inicioJornada, 0, 0, 0);
    }
  }

  const agora = new Date();
  const msDecorridos = agora.getTime() - inicio.getTime();
  const horasDecorridas = msDecorridos / (1000 * 60 * 60);
  const dentroDoSla = agora <= cursor;
  const percentualConsumido = Math.min(100, (horasDecorridas / horasUteis) * 100);

  return {
    prazoFinal: cursor,
    horasUteisDisponiveis: horasUteis,
    dentroDoSla,
    horasDecorridas,
    percentualConsumido,
  };
}

/**
 * @deprecated Use RPC `calc_sla_demanda` no banco.
 */
export function detectarE8(demanda: {
  prazo_solucao?: string | null;
  situacao: string;
}): boolean {
  if (!demanda.prazo_solucao) return false;
  const prazo = new Date(demanda.prazo_solucao);
  const agora = new Date();
  const statusAbertos = ["aberta", "em_atendimento", "aguardando_aprovacao"];
  return agora > prazo && statusAbertos.includes(demanda.situacao);
}
