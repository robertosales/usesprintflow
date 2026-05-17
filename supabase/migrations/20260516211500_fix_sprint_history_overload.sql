-- ============================================================
-- PATCH: elimina overloads antigos de get_sprint_history
--
-- Problema: CREATE OR REPLACE só substitui a função se a
-- assinatura for IDÊNTICA. Se a versão anterior tinha assinatura
-- diferente (ex: sem p_team_id), o PostgreSQL cria um segundo
-- overload → PostgREST retorna 400 "ambiguous function call".
--
-- Solução: DROP IF EXISTS de todas as assinaturas conhecidas
-- antes do CREATE definitivo.
-- ============================================================

-- Drop de todas as variantes de assinatura conhecidas
DROP FUNCTION IF EXISTS public.get_sprint_history(UUID[]);
DROP FUNCTION IF EXISTS public.get_sprint_history(UUID[], UUID);
DROP FUNCTION IF EXISTS public.get_sprint_history(UUID[], DATE);
DROP FUNCTION IF EXISTS public.get_sprint_history(UUID[], UUID, DATE);
DROP FUNCTION IF EXISTS public.get_sprint_history(UUID[], TEXT, TEXT);

-- Recria com a assinatura canônica (idêntica à migration anterior)
CREATE OR REPLACE FUNCTION get_sprint_history(
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
  PERFORM _assert_team_access(p_team_ids);

  FOR v_sprint IN
    SELECT s.id, s.name, s.goal, s.start_date, s.end_date, s.team_id
    FROM   sprints s
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

      'durationDays', GREATEST(
        COALESCE(
          EXTRACT(DAY FROM (
            v_sprint.end_date::TIMESTAMPTZ - v_sprint.start_date::TIMESTAMPTZ
          ))::INT,
          0
        ), 0
      ),
      'durationWarning', (
        v_sprint.start_date IS NULL OR
        v_sprint.start_date > v_sprint.end_date
      ),

      'totalHUs', (
        SELECT COUNT(*) FROM user_stories h
        WHERE  h.sprint_id = v_sprint.id
      ),
      'husConcluidadas', (
        SELECT COUNT(*) FROM user_stories h
        WHERE  h.sprint_id = v_sprint.id
          AND  LOWER(h.status) = ANY(status_concluidos())
      ),
      'taxaConclusao', (
        SELECT CASE WHEN COUNT(*) = 0 THEN 0
          ELSE ROUND(
            100.0 * COUNT(*) FILTER (
              WHERE LOWER(h.status) = ANY(status_concluidos())
            ) / COUNT(*)
          )
        END
        FROM user_stories h WHERE h.sprint_id = v_sprint.id
      ),
      'velocityPontos', (
        SELECT COALESCE(SUM(h.story_points), 0)
        FROM   user_stories h
        WHERE  h.sprint_id = v_sprint.id
          AND  LOWER(h.status) = ANY(status_concluidos())
      ),
      'horasPlanejadas', (
        SELECT ROUND(COALESCE(SUM(h.estimated_hours), 0)::NUMERIC, 1)
        FROM   user_stories h WHERE h.sprint_id = v_sprint.id
      ),
      'horasRealizadas', (
        SELECT ROUND(COALESCE(SUM(a.hours), 0)::NUMERIC, 1)
        FROM   activities a
        WHERE  a.hu_id IN (
                 SELECT id FROM user_stories WHERE sprint_id = v_sprint.id
               )
      ),
      -- COALESCE garante 0.0 mesmo sem atividades → elimina "+nullh"
      'desvioHoras', COALESCE((
        SELECT ROUND(
          COALESCE(SUM(a.hours), 0)::NUMERIC -
          COALESCE((
            SELECT SUM(h2.estimated_hours)
            FROM   user_stories h2 WHERE h2.sprint_id = v_sprint.id
          ), 0)::NUMERIC
        , 1)
        FROM activities a
        WHERE a.hu_id IN (
          SELECT id FROM user_stories WHERE sprint_id = v_sprint.id
        )
      ), 0.0),

      -- COUNT(DISTINCT) evita dupla contagem sprint + HU
      'impedimentos', (
        SELECT COUNT(DISTINCT i.id)
        FROM   impediments i
        WHERE  i.sprint_id = v_sprint.id
          OR   i.hu_id IN (
                 SELECT id FROM user_stories WHERE sprint_id = v_sprint.id
               )
      ),

      'devStats', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'developerId',    COALESCE(h.assignee_id::TEXT, '__unassigned__'),
            'developerName',  COALESCE(dev.name, 'Não atribuído'),
            'husCount',       COUNT(h.id),
            'estimatedHours', ROUND(COALESCE(SUM(h.estimated_hours), 0)::NUMERIC, 1),
            'realizedHours',  ROUND(COALESCE(SUM(lateral_hours.total_hours), 0)::NUMERIC, 1)
          ) ORDER BY COUNT(h.id) DESC
        ), '[]'::JSONB)
        FROM user_stories h
        LEFT JOIN developers dev
          ON  dev.id      = h.assignee_id
          AND dev.team_id = v_sprint.team_id
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(a.hours), 0) AS total_hours
          FROM   activities a
          WHERE  a.hu_id = h.id
        ) lateral_hours ON TRUE
        WHERE h.sprint_id = v_sprint.id
        GROUP BY h.assignee_id, dev.name
      )
    ) INTO v_row;

    v_metrics := v_metrics || jsonb_build_array(v_row);
  END LOOP;

  -- Comparativo entre times
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'teamId',            t_agg.team_id,
      'totalSprints',      t_agg.total_sprints,
      'avgVelocity',       ROUND(t_agg.avg_velocity::NUMERIC, 1),
      'avgTaxaConclusao',  ROUND(t_agg.avg_taxa::NUMERIC, 1),
      'avgDesvioHoras',    ROUND(t_agg.avg_desvio::NUMERIC, 1),
      'totalImpedimentos', t_agg.total_impedimentos,
      'semDados',          (t_agg.total_sprints = 0)
    )
  ), '[]'::JSONB)
  INTO v_comparativo
  FROM (
    SELECT
      s.team_id,
      COUNT(s.id) AS total_sprints,
      AVG(
        COALESCE((
          SELECT SUM(h.story_points)
          FROM   user_stories h
          WHERE  h.sprint_id = s.id
            AND  LOWER(h.status) = ANY(status_concluidos())
        ), 0)
      ) AS avg_velocity,
      AVG(
        CASE WHEN (
          SELECT COUNT(*) FROM user_stories h WHERE h.sprint_id = s.id
        ) = 0 THEN 0
        ELSE 100.0 * (
          SELECT COUNT(*) FROM user_stories h
          WHERE  h.sprint_id = s.id
            AND  LOWER(h.status) = ANY(status_concluidos())
        ) / (
          SELECT COUNT(*) FROM user_stories h WHERE h.sprint_id = s.id
        )
        END
      ) AS avg_taxa,
      AVG(
        COALESCE((
          SELECT SUM(a.hours) FROM activities a
          WHERE  a.hu_id IN (SELECT id FROM user_stories WHERE sprint_id = s.id)
        ), 0) -
        COALESCE((
          SELECT SUM(h.estimated_hours) FROM user_stories h
          WHERE  h.sprint_id = s.id
        ), 0)
      ) AS avg_desvio,
      SUM((
        SELECT COUNT(DISTINCT i.id) FROM impediments i
        WHERE  i.sprint_id = s.id
          OR   i.hu_id IN (SELECT id FROM user_stories WHERE sprint_id = s.id)
      )) AS total_impedimentos
    FROM sprints s
    WHERE s.is_active = FALSE
      AND s.team_id   = ANY(p_team_ids)
      AND (p_team_id IS NULL OR s.team_id = p_team_id)
      AND (p_cutoff  IS NULL OR s.end_date::DATE >= p_cutoff)
    GROUP BY s.team_id
  ) t_agg;

  RETURN jsonb_build_object(
    'metrics',     v_metrics,
    'comparativo', v_comparativo
  );
END;
$$;

REVOKE ALL ON FUNCTION get_sprint_history(UUID[], UUID, DATE) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_sprint_history(UUID[], UUID, DATE) TO authenticated;

COMMENT ON FUNCTION get_sprint_history IS
  'v4: DROP de overloads antigos + assinatura canônica (p_team_ids, p_team_id, p_cutoff).';
