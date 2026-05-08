/**
 * Padronização de exibição de nomes e iniciais de avatar.
 *
 * Regras:
 *  - formatPersonName: retorna "Primeiro + Último", ignorando preposições
 *    portuguesas (de, da, do, dos, das, e). Caso só haja um nome, retorna ele.
 *  - getInitials: 1 letra do primeiro nome + 1 letra do último.
 *    Se houver apenas um nome, retorna as 2 primeiras letras dele
 *    (ex.: "Roberto" → "RO").
 */

const PREPOSITIONS = new Set(["de", "da", "do", "dos", "das", "e", "del", "di", "du"]);

function tokenize(name: string | null | undefined): string[] {
  if (!name) return [];
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function meaningfulParts(name: string | null | undefined): string[] {
  const all = tokenize(name);
  if (all.length <= 1) return all;
  const filtered = all.filter((p, idx) => {
    // mantém sempre o primeiro token; remove preposições intermediárias
    if (idx === 0) return true;
    return !PREPOSITIONS.has(p.toLowerCase());
  });
  return filtered.length ? filtered : all;
}

export function formatPersonName(name: string | null | undefined): string {
  const parts = meaningfulParts(name);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export function getInitials(name: string | null | undefined): string {
  const parts = meaningfulParts(name);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const single = parts[0];
    return (single.length >= 2 ? single.slice(0, 2) : single).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Conveniência: formato curto + iniciais */
export function nameAndInitials(name: string | null | undefined) {
  return { name: formatPersonName(name), initials: getInitials(name) };
}
