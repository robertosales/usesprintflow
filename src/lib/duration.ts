/**
 * Conversões para campos de duração no formato HH:MM (ou H:MM).
 *
 * - parseHmToMinutes("1:30")  -> 90
 * - parseHmToMinutes("0:48")  -> 48
 * - parseHmToMinutes("2")     -> 120 (apenas horas)
 * - parseHmToMinutes("0,8")   -> 48 (compat. com lançamentos antigos)
 * - minutesToHm(90)           -> "1:30"
 * - hoursDecimalToMinutes(0.8) -> 48
 */

export function parseHmToMinutes(input: string | number | null | undefined): number | null {
  if (input == null) return null;
  if (typeof input === "number") {
    if (!isFinite(input) || input < 0) return null;
    return Math.round(input * 60);
  }
  const s = String(input).trim().replace(",", ".");
  if (!s) return null;

  // Formato HH:MM
  if (s.includes(":")) {
    const m = /^(\d{1,3}):([0-5]?\d)$/.exec(s);
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (isNaN(h) || isNaN(mm)) return null;
    return h * 60 + mm;
  }

  // Formato decimal (compatibilidade)
  const dec = parseFloat(s);
  if (!isFinite(dec) || dec < 0) return null;
  return Math.round(dec * 60);
}

export function minutesToHm(minutes: number | null | undefined): string {
  const m = Math.max(0, Math.round(Number(minutes ?? 0)));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h}:${String(r).padStart(2, "0")}`;
}

export function hoursDecimalToMinutes(hours: number | null | undefined): number {
  if (!hours || !isFinite(hours) || hours <= 0) return 0;
  return Math.round(hours * 60);
}

export function minutesToHoursDecimal(minutes: number | null | undefined): number {
  const m = Math.max(0, Math.round(Number(minutes ?? 0)));
  return Math.round((m / 60) * 100) / 100; // 2 casas
}

/** Validação amigável usada nos formulários */
export function isValidHm(input: string): boolean {
  if (!input) return false;
  return parseHmToMinutes(input) !== null;
}
