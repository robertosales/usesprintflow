-- ============================================================
-- REFACTOR: get_admin_kpis — substitui FOREACH+subqueries por CTEs paralelas
--
-- ANTES: loop FOREACH por time × 9 subqueries independentes
--        10 times = 90 SELECTs numa única chamada
-- DEPOIS: 9 CTEs com GROUP BY cobrindo todos os times de uma vez
--         10 times = 9 queries totais (independente da quantidade de times)
-- ============================================================

CREATE OR REPLACE FUNCTION get_admin_kpis(
  p_team_ids  UUID[],
  p_sla_dias  INT DEFAULT 5
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  -- times solicitados
  times AS (
    SELECT UNNEST(p_team_ids) AS team_id
  ),

  -- CTE 1: sprint ativa por time
  sprints_ativas AS (
    SELECT DISTINCT ON (s.team_id)
      s.team_id,
      s.id        AS sprint_id,
      s.name      AS sprint_name,
      s.end_date  AS sprint_end_date,
      CASE
        WHEN s.end_date IS NULL                     THEN 'ativa'
        WHEN s.end_date::DATE < CURRENT_DATE        THEN 'ativa_atrasada'
        ELSE                                             'ativa'
      END                                           AS sprint_status,
      CASE
        WHEN s.end_date IS NOT NULL AND s.end_date::DATE < CURRENT_DATE
          THEN (CURRENT_DATE - s.end_date::DATE)
        ELSE 0
      END                                           AS delay_days
    FROM sprints s
    WHERE s.team_id = ANY(p_team_ids)
      AND s.is_active = TRUE
    ORDER BY s.team_id, s.created_at DESC
  ),

  -- CTE 2: HUs totais e concluídas no sprint ativo
  hu_stats AS (
    SELECT
      h.team_id,
      h.sprint_id,
      COUNT(*)                                             AS total_hus,
      COUNT(*) FILTER (
        WHERE LOWER(h.status) IN (
          'concluido','concluida','done','aceite',
          'aceite_final','ag_aceite_final','resolvido'
        )
      )                                                    AS hus_concluidas,
      COALESCE(SUM(h.story_points) FILTER (
        WHERE LOWER(h.status) IN (
          'concluido','concluida','done','aceite',
          'aceite_final','ag_aceite_final','resolvido'
        )
      ), 0)                                                AS velocity_pontos
    FROM user_stories h
    WHERE h.team_id = ANY(p_team_ids)
      AND h.sprint_id IN (SELECT sprint_id FROM sprints_ativas)
    GROUP BY h.team_id, h.sprint_id
  ),

  -- CTE 3: backlog (HUs sem sprint)
  backlog_stats AS (
    SELECT
      h.team_id,
      COUNT(*) AS backlog_total
    FROM user_stories h
    WHERE h.team_id = ANY(p_team_ids)
      AND h.sprint_id IS NULL
    GROUP BY h.team_id
  ),

  -- CTE 4: impedimentos abertos
  impedimentos_stats AS (
    SELECT
      i.team_id,
      COUNT(*) AS impedimentos_abertos
    FROM impediments i
    WHERE i.team_id = ANY(p_team_ids)
      AND i.resolved_at IS NULL
    GROUP BY i.team_id
  ),

  -- CTE 5-8: demandas (abertas, concluídas, bloqueadas, SLA em risco)
  demandas_stats AS (
    SELECT
      d.team_id,
      COUNT(*) FILTER (
        WHERE LOWER(COALESCE(d.situacao,'')) NOT IN (
          'concluido','concluida','done','aceite',
          'aceite_final','ag_aceite_final','resolvido'
        )
      )                                                    AS demandas_abertas,
      COUNT(*) FILTER (
        WHERE LOWER(COALESCE(d.situacao,'')) IN (
          'concluido','concluida','done','aceite',
          'aceite_final','ag_aceite_final','resolvido'
        )
      )                                                    AS demandas_concluidas,
      COUNT(*) FILTER (
        WHERE LOWER(COALESCE(d.situacao,'')) IN ('bloqueada','bloqueado')
      )                                                    AS demandas_bloqueadas,
      COUNT(*) FILTER (
        WHERE d.created_at <= (NOW() - (p_sla_dias || ' days')::INTERVAL)
          AND LOWER(COALESCE(d.situacao,'')) NOT IN (
            'concluido','concluida','done','aceite',
            'aceite_final','ag_aceite_final','resolvido'
          )
      )                                                    AS sla_em_risco
    FROM demandas d
    WHERE d.team_id = ANY(p_team_ids)
    GROUP BY d.team_id
  )

  -- JOIN final: monta JSON por time
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'teamId',               t.team_id,
        'sprintAtivo',          sa.sprint_name,
        'sprintEndDate',        sa.sprint_end_date,
        'sprintStatus',         sa.sprint_status,
        'sprintDelayDays',      COALESCE(sa.delay_days, 0),
        'totalHUs',             COALESCE(hs.total_hus, 0),
        'husConcluidasNoSprint',COALESCE(hs.hus_concluidas, 0),
        'velocityPontos',       COALESCE(hs.velocity_pontos, 0),
        'backlogTotal',         COALESCE(bs.backlog_total, 0),
        'impedimentosAbertos',  COALESCE(is2.impedimentos_abertos, 0),
        'demandasAbertas',      COALESCE(ds.demandas_abertas, 0),
        'demandasConcluidas',   COALESCE(ds.demandas_concluidas, 0),
        'demandasBloqueadas',   COALESCE(ds.demandas_bloqueadas, 0),
        'slaEmRisco',           COALESCE(ds.sla_em_risco, 0)
      )
    ),
    '[]'::JSONB
  )
  FROM       times                t
  LEFT JOIN  sprints_ativas       sa  ON sa.team_id = t.team_id
  LEFT JOIN  hu_stats             hs  ON hs.team_id = t.team_id
                                     AND hs.sprint_id = sa.sprint_id
  LEFT JOIN  backlog_stats        bs  ON bs.team_id = t.team_id
  LEFT JOIN  impedimentos_stats   is2 ON is2.team_id = t.team_id
  LEFT JOIN  demandas_stats       ds  ON ds.team_id = t.team_id;
$$;

REVOKE ALL ON FUNCTION get_admin_kpis(UUID[], INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_admin_kpis(UUID[], INT) TO authenticated;

COMMENT ON FUNCTION get_admin_kpis IS
  'v2 — CTEs paralelas com GROUP BY. Elimina FOREACH+subqueries. N times = 9 queries totais.';
