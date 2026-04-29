// src/modules/sustentacao/utils/kpiCalculations.ts

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function formatHours(hours: number): string {
  if (hours === 0) return "0h";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getNome(profiles: any[], userId: string): string {
  const profile = profiles.find((p) => p.user_id === userId);
  return profile?.display_name || profile?.email || userId.slice(0, 8);
}

function isResolvido(situacao?: string | null): boolean {
  return ["concluido", "resolvido"].includes(situacao?.toLowerCase() ?? "");
}

function isAberto(situacao?: string | null): boolean {
  return ["aberto", "em_andamento"].includes(situacao?.toLowerCase() ?? "");
}

// ─────────────────────────────────────────────────────────────────────────────
// calcProdutividade
//
// Regra: uma demanda pode ter N analistas — cada um lança horas via
// demanda_hours. O "atribuídos" de cada analista é a união de:
//   1. demandas onde ele lançou ao menos 1 hora
//   2. demandas onde ele é responsável em qualquer coluna
//      (responsavel_dev | requisitos | teste | arquiteto)
// ─────────────────────────────────────────────────────────────────────────────

export function calcProdutividade(demandas: any[], transitions: any[], hours: any[], profiles: any[]) {
  // 1. Mapa user_id → Map<demanda_id, totalHoras>
  const horasPorUser = new Map<string, Map<string, number>>();
  hours.forEach((h) => {
    if (!h.user_id || !h.demanda_id) return;
    if (!horasPorUser.has(h.user_id)) horasPorUser.set(h.user_id, new Map());
    const m = horasPorUser.get(h.user_id)!;
    m.set(h.demanda_id, (m.get(h.demanda_id) ?? 0) + (h.hours ?? 0));
  });

  // 2. Todos os user_ids únicos (horas + colunas responsável)
  const todosIds = new Set<string>([...horasPorUser.keys()]);
  demandas.forEach((d) => {
    if (d.responsavel_dev) todosIds.add(d.responsavel_dev);
    if (d.responsavel_requisitos) todosIds.add(d.responsavel_requisitos);
    if (d.responsavel_teste) todosIds.add(d.responsavel_teste);
    if (d.responsavel_arquiteto) todosIds.add(d.responsavel_arquiteto);
  });

  return [...todosIds].map((userId) => {
    // IDs de demandas onde lançou hora
    const demandasComHora = new Set<string>(horasPorUser.get(userId)?.keys() ?? []);

    // IDs de demandas onde é responsável direto
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

    // União
    const todasIds = new Set<string>([...demandasComHora, ...demandasResponsavel]);
    const atribuidas = demandas.filter((d) => todasIds.has(d.id));

    const resolvidos = atribuidas.filter((d) => isResolvido(d.situacao)).length;
    const emAberto = atribuidas.filter((d) => isAberto(d.situacao)).length;

    // Total de horas lançadas pelo analista (soma de todas as demandas)
    const horasLancadas = [...(horasPorUser.get(userId)?.values() ?? [])].reduce((s, v) => s + v, 0);

    const taxaResolucao = atribuidas.length > 0 ? (resolvidos / atribuidas.length) * 100 : 0;

    // MTTR em horas: média do tempo entre created_at e aceite_data/updated_at
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

    return {
      userId,
      nome: getNome(profiles, userId),
      atribuidos: atribuidas.length,
      resolvidos,
      emAberto,
      horasLancadas,
      taxaResolucao,
      mttrIndividual,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// calcKpiGeral — KPIs globais do painel (não individual)
// ─────────────────────────────────────────────────────────────────────────────

export function calcKpiGeral(demandas: any[], hours: any[]) {
  const total = demandas.length;
  const resolvidos = demandas.filter((d) => isResolvido(d.situacao)).length;
  const emAberto = demandas.filter((d) => isAberto(d.situacao)).length;
  const taxa = total > 0 ? (resolvidos / total) * 100 : 0;
  const totalHoras = hours.reduce((s, h) => s + (h.hours ?? 0), 0);

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
