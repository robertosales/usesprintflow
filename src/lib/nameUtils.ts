/**
 * nameUtils.ts — utilitário central de formatação de nomes e iniciais.
 * Regras:
 *  - Exibir Primeiro Nome + Último Sobrenome (ignorando preposições)
 *  - Avatar: primeira letra do primeiro nome + primeira letra do último sobrenome
 *  - Se só um nome: usar as duas primeiras letras
 *  - Preposições ignoradas: de, da, do, dos, das, e
 */

const PREPOSICOES = new Set(["de", "da", "do", "dos", "das", "e"]);

/** Retorna array de partes relevantes (sem preposições) */
function partes(fullName: string): string[] {
  return fullName
    .trim()
    .split(/\s+/)
    .filter((p) => !PREPOSICOES.has(p.toLowerCase()));
}

/**
 * Formata nome para exibição: Primeiro + Último (ignorando preposições).
 * Exemplos:
 *   "Roberto de Araujo Sales" → "Roberto Sales"
 *   "Maria Fernanda Lima Costa" → "Maria Costa"
 *   "João" → "João"
 */
export function formatDisplayName(fullName: string | null | undefined): string {
  if (!fullName) return "";
  const p = partes(fullName);
  if (p.length === 0) return fullName.trim();
  if (p.length === 1) return p[0];
  return `${p[0]} ${p[p.length - 1]}`;
}

/**
 * Gera iniciais para avatar: primeira letra do primeiro nome + primeira letra do último sobrenome.
 * Se só um token: duas primeiras letras.
 * Exemplos:
 *   "Roberto Sales" → "RS"
 *   "João" → "JO"
 */
export function getInitials(fullName: string | null | undefined): string {
  if (!fullName) return "?";
  const p = partes(fullName);
  if (p.length === 0) return "?";
  if (p.length === 1) {
    const w = p[0];
    return (w.slice(0, 2)).toUpperCase();
  }
  return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
}

/** Alias para uso nos avatars — recebe display_name já armazenado e aplica as regras. */
export function nameToInitials(name: string | null | undefined): string {
  return getInitials(name);
}
