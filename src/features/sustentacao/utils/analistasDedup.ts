/**
 * Dedupes analistas (profiles) that represent the same person but have multiple
 * profile rows (e.g. the same user registered twice with different emails).
 *
 * Returns a list of { user_id, display_name } where:
 *  - display_name is unique (case/trim-insensitive)
 *  - user_id is a comma-separated list of all profile user_ids for that name,
 *    so the consumer can match a demanda whose responsavel_dev is ANY of them.
 *
 * Use `analistaMatches(filterValue, demandaUserId)` to test membership.
 */
export interface AnalistaOption {
  user_id: string; // may be "id1,id2,id3" when several profiles share the name
  display_name: string;
}

export function buildAnalistasDedup(
  ids: string[],
  profiles: Array<{ user_id: string; display_name: string }>,
): AnalistaOption[] {
  const byName = new Map<string, { display_name: string; ids: Set<string> }>();
  ids.forEach((id) => {
    if (!id) return;
    const p = profiles.find((pr) => pr.user_id === id);
    const display = (p?.display_name || id.slice(0, 8)).trim();
    const key = display.toLowerCase();
    const entry = byName.get(key) ?? { display_name: display, ids: new Set<string>() };
    entry.ids.add(id);
    // prefer the longest spelling as canonical display_name
    if (display.length > entry.display_name.length) entry.display_name = display;
    byName.set(key, entry);
  });
  return [...byName.values()]
    .map((e) => ({ user_id: [...e.ids].join(","), display_name: e.display_name }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name, "pt-BR"));
}

export function analistaMatches(filterValue: string, userId: string | null | undefined): boolean {
  if (!filterValue || filterValue === "all") return true;
  if (!userId) return false;
  return filterValue.split(",").includes(userId);
}