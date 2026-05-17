-- ============================================================
-- FIX: get_sprint_history — aggregate aninhado (42803)
--
-- Problema: SUM(COUNT(DISTINCT ...)) no bloco comparativo
-- causava "aggregate function calls cannot be nested" → 400.
--
-- Solução (aplicada pelo Lovable diretamente no banco):
-- pré-calcular COUNT(DISTINCT i.id) por sprint em uma CTE
-- separada (sprint_impedimentos) e depois fazer SUM do resultado.
--
-- Esta migration sincroniza o estado real do banco com o repo.
-- ============================================================

-- Remove versão anterior (garante substituição limpa)
DROP FUNCTION IF EXISTS public.get_sprint_history(UUID[], UUID, DATE);

CREATE OR REPLACE FUNCTION public.get_sprint_history(
  p_team_ids  UUID[],
  p_team_id   UUID  DEFAULT NULL,
  p_cutoff    DATE  DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metrics     jsonb := '[]'::jsonb;
  v_comparativo jsonb := '[]'::jsonb;
  v_sprint      record;
  v_row         jsonb;
BEGIN
  PERFORM public._assert_team_access(p_team_ids);

  FOR v_sprint IN
    SELECT s.id, s.name, s.goal, s.start_date, s.end_date, s.team_id
    FROM public.sprints s
    WHERE s.is_active = false
      AND s.team_id = ANY(p_team_ids)
      AND (p_team_id IS NULL OR s.team_id = p_team_id)
      AND (p_cutoff IS NULL OR s.end_date::date >= p_cutoff)
    ORDER BY s.end_date DESC
  LOOP
    SELECT jsonb_build_object(
      'sprintId',    v_sprint.id,
      'sprintName',  v_sprint.name,
      'teamId',      v_sprint.team_id,
      'startDate',   v_sprint.start_date,
      'endDate',     v_sprint.end_date,
      'goal',        v_sprint.goal,
      'durationDays', GREATEST(COALESCE(EXTRACT(DAY FROM (
          v_sprint.end_date::timestamptz - v_sprint.start_date::timestamptz
        ))::int, 0), 0),
      'durationWarning', (v_sprint.start_date IS NULL OR v_sprint.start_date > v_sprint.end_date),
      'totalHUs', (
        SELECT COUNT(*) FROM public.user_stories h WHERE h.sprint_id = v_sprint.id
      ),
      'husConcluidadas', (
        SELECT COUNT(*) FROM public.user_stories h
        WHERE h.sprint_id = v_sprint.id
          AND LOWER(h.status) = ANY(public.status_concluidos())
      ),
      'taxaConclusao', (
        SELECT CASE WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(h.status) = ANY(public.status_concluidos())) / COUNT(*))
        END
        FROM public.user_stories h WHERE h.sprint_id = v_sprint.id
      ),
      'velocityPontos', (
        SELECT COALESCE(SUM(h.story_points), 0) FROM public.user_stories h
        WHERE h.sprint_id = v_sprint.id AND LOWER(h.status) = ANY(public.status_concluidos())
      ),
      'horasPlanejadas', (
        SELECT ROUND(COALESCE(SUM(h.estimated_hours), 0)::numeric, 1)
        FROM public.user_stories h WHERE h.sprint_id = v_sprint.id
      ),
      'horasRealizadas', (
        SELECT ROUND(COALESCE(SUM(a.hours), 0)::numeric, 1)
        FROM public.activities a
        WHERE a.hu_id IN (SELECT h.id FROM public.user_stories h WHERE h.sprint_id = v_sprint.id)
      ),
      'desvioHoras', COALESCE((
        SELECT ROUND(
          COALESCE(SUM(a.hours), 0)::numeric -
          COALESCE((SELECT SUM(h2.estimated_hours) FROM public.user_stories h2 WHERE h2.sprint_id = v_sprint.id), 0)::numeric,
          1
        )
        FROM public.activities a
        WHERE a.hu_id IN (SELECT h.id FROM public.user_stories h WHERE h.sprint_id = v_sprint.id)
      ), 0.0),
      'impedimentos', (
        SELECT COUNT(DISTINCT i.id) FROM public.impediments i
        WHERE i.sprint_id = v_sprint.id
           OR i.hu_id IN (SELECT h.id FROM public.user_stories h WHERE h.sprint_id = v_sprint.id)
      ),
      'devStats', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'developerId',    ds.developer_id,
            'developerName',  ds.developer_name,
            'husCount',       ds.hus_count,
            'estimatedHours', ds.estimated_hours,
            'realizedHours',  ds.realized_hours
          ) ORDER BY ds.hus_count DESC, ds.developer_name
        ), '[]'::jsonb)
        FROM (
          SELECT
            COALESCE(h.assignee_id::text, '__unassigned__') AS developer_id,
            COALESCE(dev.name, 'Não atribuído')             AS developer_name,
            COUNT(h.id)::int                                AS hus_count,
            ROUND(COALESCE(SUM(h.estimated_hours), 0)::numeric, 1) AS estimated_hours,
            ROUND(COALESCE(SUM(hours_by_hu.total_hours), 0)::numeric, 1) AS realized_hours
          FROM public.user_stories h
          LEFT JOIN public.developers dev
            ON dev.id = h.assignee_id AND dev.team_id = v_sprint.team_id
          LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(a.hours), 0) AS total_hours
            FROM public.activities a WHERE a.hu_id = h.id
          ) hours_by_hu ON true
          WHERE h.sprint_id = v_sprint.id
          GROUP BY h.assignee_id, dev.name
        ) ds
      )
    ) INTO v_row;

    v_metrics := v_metrics || jsonb_build_array(v_row);
  END LOOP;

  -- CTE separa COUNT(DISTINCT) para evitar aggregate aninhado no SUM
  WITH sprint_impedimentos AS (
    SELECT s.id AS sprint_id, COUNT(DISTINCT i.id) AS total_imp
    FROM public.sprints s
    LEFT JOIN public.impediments i
      ON i.sprint_id = s.id
      OR i.hu_id IN (SELECT h.id FROM public.user_stories h WHERE h.sprint_id = s.id)
    WHERE s.is_active = false
      AND s.team_id = ANY(p_team_ids)
      AND (p_team_id IS NULL OR s.team_id = p_team_id)
      AND (p_cutoff IS NULL OR s.end_date::date >= p_cutoff)
    GROUP BY s.id
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'teamId',            t_agg.team_id,
      'totalSprints',      t_agg.total_sprints,
      'avgVelocity',       ROUND(t_agg.avg_velocity::numeric, 1),
      'avgTaxaConclusao',  ROUND(t_agg.avg_taxa::numeric, 1),
      'avgDesvioHoras',    ROUND(t_agg.avg_desvio::numeric, 1),
      'totalImpedimentos', t_agg.total_impedimentos,
      'semDados',          (t_agg.total_sprints = 0)
    )
  ), '[]'::jsonb)
  INTO v_comparativo
  FROM (
    SELECT
      s.team_id,
      COUNT(s.id) AS total_sprints,
      AVG(COALESCE((
        SELECT SUM(h.story_points) FROM public.user_stories h
        WHERE h.sprint_id = s.id AND LOWER(h.status) = ANY(public.status_concluidos())
      ), 0)) AS avg_velocity,
      AVG(CASE WHEN (SELECT COUNT(*) FROM public.user_stories h WHERE h.sprint_id = s.id) = 0 THEN 0
               ELSE 100.0
                  * (SELECT COUNT(*) FROM public.user_stories h WHERE h.sprint_id = s.id AND LOWER(h.status) = ANY(public.status_concluidos()))
                  / (SELECT COUNT(*) FROM public.user_stories h WHERE h.sprint_id = s.id)
          END) AS avg_taxa,
      AVG(
        COALESCE((SELECT SUM(a.hours) FROM public.activities a WHERE a.hu_id IN (SELECT h.id FROM public.user_stories h WHERE h.sprint_id = s.id)), 0) -
        COALESCE((SELECT SUM(h.estimated_hours) FROM public.user_stories h WHERE h.sprint_id = s.id), 0)
      ) AS avg_desvio,
      SUM(COALESCE(si.total_imp, 0)) AS total_impedimentos
    FROM public.sprints s
    LEFT JOIN sprint_impedimentos si ON si.sprint_id = s.id
    WHERE s.is_active = false
      AND s.team_id = ANY(p_team_ids)
      AND (p_team_id IS NULL OR s.team_id = p_team_id)
      AND (p_cutoff IS NULL OR s.end_date::date >= p_cutoff)
    GROUP BY s.team_id
  ) t_agg;

  RETURN jsonb_build_object('metrics', v_metrics, 'comparativo', v_comparativo);
END;
$$;

REVOKE ALL ON FUNCTION public.get_sprint_history(UUID[], UUID, DATE) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_sprint_history(UUID[], UUID, DATE) TO authenticated;

COMMENT ON FUNCTION public.get_sprint_history IS
  'v5: CTE sprint_impedimentos elimina aggregate aninhado (42803). Sincronizado com fix do Lovable.';
