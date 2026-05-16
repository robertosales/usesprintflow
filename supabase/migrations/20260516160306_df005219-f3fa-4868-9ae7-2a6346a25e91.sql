CREATE OR REPLACE FUNCTION public.get_sprint_history(
  p_team_ids  UUID[],
  p_team_id   UUID   DEFAULT NULL,
  p_cutoff    DATE   DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metrics     JSONB := '[]'::JSONB;
  v_comparativo JSONB := '[]'::JSONB;
  v_sprint      RECORD;
  v_row         JSONB;
BEGIN
  PERFORM public._assert_team_access(p_team_ids);

  IF p_team_ids IS NULL OR array_length(p_team_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('metrics', v_metrics, 'comparativo', v_comparativo);
  END IF;

  FOR v_sprint IN
    SELECT s.id, s.name, s.goal, s.start_date, s.end_date, s.team_id
    FROM   public.sprints s
    WHERE  s.is_active = FALSE
      AND  s.team_id   = ANY(p_team_ids)
      AND  (p_team_id IS NULL OR s.team_id = p_team_id)
      AND  (p_cutoff  IS NULL OR s.end_date::DATE >= p_cutoff)
    ORDER  BY s.end_date DESC
  LOOP
    SELECT jsonb_build_object(
      'sprintId',    v_sprint.id,
      'sprintName',  v_sprint.name,
      'teamId',      v_sprint.team_id,
      'startDate',   v_sprint.start_date,
      'endDate',     v_sprint.end_date,
      'goal',        v_sprint.goal,
      'durationDays', (
        EXTRACT(DAY FROM (v_sprint.end_date::TIMESTAMPTZ - v_sprint.start_date::TIMESTAMPTZ))::INT
      ),
      'totalHUs', (
        SELECT COUNT(*) FROM public.user_stories h WHERE h.sprint_id = v_sprint.id
      ),
      'husConcluidadas', (
        SELECT COUNT(*) FROM public.user_stories h
        WHERE  h.sprint_id = v_sprint.id
          AND  LOWER(h.status) IN ('concluido','concluida','done','aceite','aceite_final','ag_aceite_final','resolvido')
      ),
      'taxaConclusao', (
        SELECT CASE WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND(100.0 * COUNT(*) FILTER (
            WHERE LOWER(h.status) IN ('concluido','concluida','done','aceite','aceite_final','ag_aceite_final','resolvido')
          ) / COUNT(*))
        END
        FROM public.user_stories h WHERE h.sprint_id = v_sprint.id
      ),
      'velocityPontos', (
        SELECT COALESCE(SUM(h.story_points), 0) FROM public.user_stories h
        WHERE  h.sprint_id = v_sprint.id
          AND  LOWER(h.status) IN ('concluido','concluida','done','aceite','aceite_final','ag_aceite_final','resolvido')
      ),
      'horasPlanejadas', (
        SELECT ROUND(COALESCE(SUM(h.estimated_hours), 0)::NUMERIC, 1)
        FROM   public.user_stories h WHERE h.sprint_id = v_sprint.id
      ),
      'horasRealizadas', (
        SELECT ROUND(COALESCE(SUM(a.hours), 0)::NUMERIC, 1)
        FROM   public.activities a
        WHERE  a.hu_id IN (SELECT id FROM public.user_stories WHERE sprint_id = v_sprint.id)
      ),
      'desvioHoras', (
        SELECT ROUND(
          COALESCE(SUM(a.hours), 0)::NUMERIC -
          COALESCE((SELECT SUM(h2.estimated_hours) FROM public.user_stories h2 WHERE h2.sprint_id = v_sprint.id), 0)::NUMERIC
        , 1)
        FROM public.activities a
        WHERE a.hu_id IN (SELECT id FROM public.user_stories WHERE sprint_id = v_sprint.id)
      ),
      'impedimentos', (
        SELECT COUNT(*) FROM public.impediments i
        WHERE  i.sprint_id = v_sprint.id
          OR   i.hu_id IN (SELECT id FROM public.user_stories WHERE sprint_id = v_sprint.id)
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
        ), '[]'::JSONB)
        FROM (
          SELECT
            COALESCE(h.assignee_id::TEXT, '__unassigned__') AS developer_id,
            COALESCE(dev.name, 'Não atribuído')             AS developer_name,
            COUNT(h.id)                                     AS hus_count,
            ROUND(COALESCE(SUM(h.estimated_hours), 0)::NUMERIC, 1) AS estimated_hours,
            ROUND(COALESCE(SUM(lh.total_hours), 0)::NUMERIC, 1)    AS realized_hours
          FROM public.user_stories h
          LEFT JOIN public.developers dev
            ON dev.id = h.assignee_id AND dev.team_id = v_sprint.team_id
          LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(a.hours), 0) AS total_hours
            FROM public.activities a
            WHERE a.hu_id = h.id
          ) lh ON TRUE
          WHERE h.sprint_id = v_sprint.id
          GROUP BY h.assignee_id, dev.name
        ) ds
      )
    ) INTO v_row;

    v_metrics := v_metrics || jsonb_build_array(v_row);
  END LOOP;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'teamId',            t_agg.team_id,
      'totalSprints',      t_agg.total_sprints,
      'avgVelocity',       ROUND(t_agg.avg_velocity::NUMERIC, 1),
      'avgTaxaConclusao',  ROUND(t_agg.avg_taxa::NUMERIC,     1),
      'avgDesvioHoras',    ROUND(t_agg.avg_desvio::NUMERIC,   1),
      'totalImpedimentos', t_agg.total_impedimentos,
      'semDados',          (t_agg.total_sprints = 0)
    )
  ), '[]'::JSONB)
  INTO v_comparativo
  FROM (
    SELECT
      s.team_id,
      COUNT(s.id) AS total_sprints,
      AVG(COALESCE((SELECT SUM(h.story_points) FROM public.user_stories h
        WHERE h.sprint_id = s.id
          AND LOWER(h.status) IN ('concluido','concluida','done','aceite','aceite_final','ag_aceite_final','resolvido')
      ), 0)) AS avg_velocity,
      AVG(CASE WHEN (SELECT COUNT(*) FROM public.user_stories h WHERE h.sprint_id = s.id) = 0 THEN 0
        ELSE 100.0 * (SELECT COUNT(*) FROM public.user_stories h WHERE h.sprint_id = s.id
          AND LOWER(h.status) IN ('concluido','concluida','done','aceite','aceite_final','ag_aceite_final','resolvido')
        ) / (SELECT COUNT(*) FROM public.user_stories h WHERE h.sprint_id = s.id)
      END) AS avg_taxa,
      AVG(
        COALESCE((SELECT SUM(a.hours) FROM public.activities a
          WHERE a.hu_id IN (SELECT id FROM public.user_stories WHERE sprint_id = s.id)), 0) -
        COALESCE((SELECT SUM(h.estimated_hours) FROM public.user_stories h WHERE h.sprint_id = s.id), 0)
      ) AS avg_desvio,
      SUM((SELECT COUNT(*) FROM public.impediments i
        WHERE i.sprint_id = s.id
          OR  i.hu_id IN (SELECT id FROM public.user_stories WHERE sprint_id = s.id)
      )) AS total_impedimentos
    FROM public.sprints s
    WHERE s.is_active = FALSE
      AND s.team_id   = ANY(p_team_ids)
      AND (p_team_id IS NULL OR s.team_id = p_team_id)
      AND (p_cutoff  IS NULL OR s.end_date::DATE >= p_cutoff)
    GROUP BY s.team_id
  ) t_agg;

  RETURN jsonb_build_object('metrics', v_metrics, 'comparativo', v_comparativo);
END;
$$;

REVOKE ALL ON FUNCTION public.get_sprint_history(UUID[], UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sprint_history(UUID[], UUID, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_capacity_planner(
  p_team_ids    UUID[],
  p_team_id     UUID  DEFAULT NULL,
  p_default_cap INT   DEFAULT 40
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result   JSONB := '[]'::JSONB;
  v_team_id  UUID;
  v_sprint   RECORD;
  v_team_row JSONB;
  v_devs     JSONB;
BEGIN
  PERFORM public._assert_team_access(p_team_ids);

  IF p_team_ids IS NULL OR array_length(p_team_ids, 1) IS NULL THEN
    RETURN v_result;
  END IF;

  FOREACH v_team_id IN ARRAY p_team_ids LOOP
    IF p_team_id IS NOT NULL AND v_team_id <> p_team_id THEN
      CONTINUE;
    END IF;

    SELECT s.id, s.name, s.end_date
    INTO   v_sprint
    FROM   public.sprints s
    WHERE  s.team_id  = v_team_id AND s.is_active = TRUE
    LIMIT  1;

    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'devId',            d.id,
        'devName',          d.name,
        'teamId',           v_team_id,
        'capacityHours',    p_default_cap,
        'noActiveSprint',   (v_sprint.id IS NULL),
        'allocatedHours', CASE WHEN v_sprint.id IS NULL THEN 0::NUMERIC ELSE (
          SELECT ROUND(COALESCE(SUM(h.estimated_hours), 0)::NUMERIC, 1)
          FROM   public.user_stories h
          WHERE  h.sprint_id = v_sprint.id AND h.assignee_id = d.id
        ) END,
        'unestimatedCount', CASE WHEN v_sprint.id IS NULL THEN 0 ELSE (
          SELECT COUNT(*) FROM public.user_stories h
          WHERE  h.sprint_id = v_sprint.id AND h.assignee_id = d.id
            AND  h.estimated_hours IS NULL
        ) END,
        'husCount', CASE WHEN v_sprint.id IS NULL THEN 0 ELSE (
          SELECT COUNT(*) FROM public.user_stories h
          WHERE  h.sprint_id = v_sprint.id AND h.assignee_id = d.id
        ) END,
        'wipCount', CASE WHEN v_sprint.id IS NULL THEN 0 ELSE (
          SELECT COUNT(*) FROM public.user_stories h
          WHERE  h.sprint_id = v_sprint.id AND h.assignee_id = d.id
            AND  LOWER(h.status) NOT IN (
                   'concluido','concluida','done','aceite','aceite_final',
                   'ag_aceite_final','resolvido','cancelada','backlog'
                 )
        ) END,
        'realizedHours', CASE WHEN v_sprint.id IS NULL THEN 0::NUMERIC ELSE (
          SELECT ROUND(COALESCE(SUM(a.hours), 0)::NUMERIC, 1)
          FROM   public.activities a
          WHERE  a.assignee_id = d.id
            AND  a.hu_id IN (
                   SELECT h.id FROM public.user_stories h
                   WHERE  h.sprint_id = v_sprint.id AND h.assignee_id = d.id
                 )
        ) END
      ) ORDER BY d.name
    ), '[]'::JSONB)
    INTO v_devs
    FROM public.developers d WHERE d.team_id = v_team_id;

    SELECT jsonb_build_object(
      'teamId',        v_team_id,
      'sprintAtivo',   v_sprint.name,
      'sprintEndDate', v_sprint.end_date,
      'devs',          v_devs,
      'totalCapacity', (
        SELECT COALESCE(COUNT(d.id) * p_default_cap, 0)
        FROM public.developers d WHERE d.team_id = v_team_id
      ),
      'totalAllocated', CASE WHEN v_sprint.id IS NULL THEN 0::NUMERIC ELSE (
        SELECT ROUND(COALESCE(SUM(h.estimated_hours), 0)::NUMERIC, 1)
        FROM   public.user_stories h
        JOIN   public.developers d ON d.id = h.assignee_id AND d.team_id = v_team_id
        WHERE  h.sprint_id = v_sprint.id
      ) END,
      'totalRealized', CASE WHEN v_sprint.id IS NULL THEN 0::NUMERIC ELSE (
        SELECT ROUND(COALESCE(SUM(a.hours), 0)::NUMERIC, 1)
        FROM   public.activities a
        JOIN   public.developers d ON d.id = a.assignee_id AND d.team_id = v_team_id
        WHERE  a.hu_id IN (
          SELECT h.id FROM public.user_stories h WHERE h.sprint_id = v_sprint.id
        )
      ) END
    ) INTO v_team_row;

    v_result := v_result || jsonb_build_array(v_team_row);
  END LOOP;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_capacity_planner(UUID[], UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_capacity_planner(UUID[], UUID, INT) TO authenticated;

COMMENT ON FUNCTION public.get_sprint_history(UUID[], UUID, DATE) IS
  'v4: corrige devStats sem agregações aninhadas para evitar erro 400 no Dashboard Admin.';

COMMENT ON FUNCTION public.get_capacity_planner(UUID[], UUID, INT) IS
  'v2: usa capacidade padrão por desenvolvedor quando não há coluna de capacidade no cadastro.';