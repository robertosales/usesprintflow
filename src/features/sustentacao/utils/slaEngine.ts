// ── SLA Calculation Engine (Evolution 5) ──
// Centralized SLA valid statuses and business hours calculation

/**
 * SLA time is counted ONLY in these statuses.
 * All other statuses pause the SLA clock.
 */
export const SLA_VALID_STATUSES = [
  'nova',           // FILA DE ATENDIMENTO
  'planejamento',   // PLANEJAMENTO: EM ELABORAÇÃO
  'planejamento_aprovado', // PLANEJAMENTO: APROVADA P/ EXEC
  'execucao_dev',   // EM EXECUÇÃO
  // 'rejeitada' maps to going back from homologação → handled via transitions
] as const;

export type SLAValidStatus = typeof SLA_VALID_STATUSES[number];

/**
 * Check if a status counts towards SLA time
 */
export function isSLAActiveStatus(status: string): boolean {
  return (SLA_VALID_STATUSES as readonly string[]).includes(status);
}

/**
 * Brazilian national holidays (fixed dates).
 * For a production system, this should come from a configurable table.
 */
function getFixedHolidays(year: number): Date[] {
  return [
    new Date(year, 0, 1),   // Confraternização Universal
    new Date(year, 3, 21),  // Tiradentes
    new Date(year, 4, 1),   // Dia do Trabalho
    new Date(year, 8, 7),   // Independência
    new Date(year, 9, 12),  // N. Sra. Aparecida
    new Date(year, 10, 2),  // Finados
    new Date(year, 10, 15), // Proclamação da República
    new Date(year, 11, 25), // Natal
  ];
}

function isHoliday(date: Date): boolean {
  const holidays = getFixedHolidays(date.getFullYear());
  return holidays.some(h =>
    h.getDate() === date.getDate() &&
    h.getMonth() === date.getMonth()
  );
}

function isBusinessDay(date: Date): boolean {
  const dow = date.getDay();
  return dow !== 0 && dow !== 6 && !isHoliday(date);
}

/**
 * Business hours config per regime
 */
const REGIME_CONFIG = {
  padrao: { startHour: 8, endHour: 20, hoursPerDay: 12, allDays: false },
  continuo: { startHour: 0, endHour: 24, hoursPerDay: 24, allDays: true },
} as const;

export type Regime = keyof typeof REGIME_CONFIG;

/**
 * Calculate elapsed SLA hours between two dates,
 * considering only business hours for the given regime.
 */
export function calcElapsedSLAHours(
  from: Date,
  to: Date,
  regime: Regime = 'padrao'
): number {
  const config = REGIME_CONFIG[regime];

  if (config.allDays) {
    // Contínuo: 24x7, all hours count
    return Math.max(0, (to.getTime() - from.getTime()) / (1000 * 60 * 60));
  }

  // Padrão: 08h-20h, seg-sex, excluding holidays
  let total = 0;
  const current = new Date(from);

  while (current < to) {
    if (isBusinessDay(current)) {
      const currentHour = current.getHours() + current.getMinutes() / 60;
      const dayEnd = new Date(current);
      dayEnd.setHours(config.endHour, 0, 0, 0);

      if (currentHour < config.startHour) {
        current.setHours(config.startHour, 0, 0, 0);
        continue;
      }
      if (currentHour >= config.endHour) {
        current.setDate(current.getDate() + 1);
        current.setHours(config.startHour, 0, 0, 0);
        continue;
      }

      const effectiveEnd = to < dayEnd ? to : dayEnd;
      const endHour = effectiveEnd.getHours() + effectiveEnd.getMinutes() / 60;
      const hoursThisPeriod = Math.min(endHour, config.endHour) - currentHour;
      if (hoursThisPeriod > 0) total += hoursThisPeriod;

      if (to <= dayEnd) break;
      current.setDate(current.getDate() + 1);
      current.setHours(config.startHour, 0, 0, 0);
    } else {
      current.setDate(current.getDate() + 1);
      current.setHours(config.startHour, 0, 0, 0);
    }
  }

  return Math.max(0, total);
}

/**
 * Calculate SLA elapsed time for a demanda considering transitions.
 * Only counts time spent in SLA_VALID_STATUSES.
 */
export function calcSLAElapsedFromTransitions(
  createdAt: string,
  currentStatus: string,
  transitions: Array<{ from_status: string | null; to_status: string; created_at: string }>,
  regime: Regime = 'padrao'
): number {
  const sorted = [...transitions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let totalHours = 0;
  let lastEntryTime = new Date(createdAt);
  let lastStatus = 'nova'; // initial status

  // Walk through transitions
  for (const t of sorted) {
    const transTime = new Date(t.created_at);
    // If previous status was SLA-active, count time
    if (isSLAActiveStatus(lastStatus)) {
      totalHours += calcElapsedSLAHours(lastEntryTime, transTime, regime);
    }
    lastEntryTime = transTime;
    lastStatus = t.to_status;
  }

  // Count time in current status if it's SLA-active
  if (isSLAActiveStatus(currentStatus)) {
    totalHours += calcElapsedSLAHours(lastEntryTime, new Date(), regime);
  }

  return totalHours;
}

// ── IAP Period Calculation (Evolution 6) ──

/**
 * Get the IAP measurement period for a given month.
 * Period: day 11 of month to day 10 of next month.
 * @param year - Year
 * @param month - Month (1-12)
 * @returns { start, end } dates
 */
export function getIAPPeriod(year: number, month: number): { start: Date; end: Date; label: string } {
  const start = new Date(year, month - 1, 11, 0, 0, 0); // month is 0-indexed
  const end = new Date(year, month, 10, 23, 59, 59);
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return {
    start,
    end,
    label: `${monthNames[month - 1]} ${year}`,
  };
}

/**
 * Get the current active IAP period
 */
export function getCurrentIAPPeriod(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();

  if (day >= 11) {
    return getIAPPeriod(year, month);
  } else {
    // Before 11th: previous month's period
    if (month === 1) return getIAPPeriod(year - 1, 12);
    return getIAPPeriod(year, month - 1);
  }
}

/**
 * Get all available IAP period options for a dropdown
 */
export function getIAPPeriodOptions(count = 6): Array<{ value: string; label: string; start: Date; end: Date }> {
  const current = getCurrentIAPPeriod();
  const options: Array<{ value: string; label: string; start: Date; end: Date }> = [];
  let year = current.start.getFullYear();
  let month = current.start.getMonth() + 1;

  for (let i = 0; i < count; i++) {
    const period = getIAPPeriod(year, month);
    options.push({
      value: `${year}-${String(month).padStart(2, '0')}`,
      label: period.label,
      start: period.start,
      end: period.end,
    });
    month--;
    if (month < 1) { month = 12; year--; }
  }

  return options;
}

/**
 * IAP Glosa tiers (Evolution 6)
 */
export function getIAPGlosa(iapPercent: number): number {
  if (iapPercent >= 90) return 0;
  if (iapPercent >= 80) return 10;
  if (iapPercent >= 70) return 20;
  return 30;
}

/**
 * Count demandas > 60 days in SLA-active statuses
 */
export function countAtraso60Dias(
  demandas: Array<{ id: string; created_at: string; situacao: string; prazo_solucao?: string | null }>
): { count: number; demandas: typeof demandas } {
  const now = new Date();
  const result = demandas.filter(d => {
    if (d.situacao === 'aceite_final') return false;
    if (!isSLAActiveStatus(d.situacao)) return false;
    const created = new Date(d.created_at);
    const dias = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return dias > 60;
  });
  return { count: result.length, demandas: result };
}
