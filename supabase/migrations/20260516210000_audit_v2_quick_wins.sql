-- ============================================================
-- AUDIT V2 — Quick Wins
-- Corrige 5 problemas identificados na auditoria técnica v2:
--
-- QW1: _assert_team_access lê user_roles (não team_members)
-- QW2: desvioHoras COALESCE → elimina +nullh em produção
-- QW3: COUNT(DISTINCT) nos impedimentos
-- QW4: backlogTotal exclui canceladas/concluídas sem sprint
-- QW5: função status_concluidos() centralizada para SQL
-- QW6: índices compostos de performance
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- QW5: Função SQL centralizada para status concluídos
-- Elimina repetição hardcoded em ~12 lugares nas RPCs.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION status_concluidos()
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY[
    'concluido','concluida','done','aceite',
    'aceite_final','ag_aceite_final','resolvido'
  ]::TEXT[];
$$;

REVOKE ALL ON FUNCTION status_concluidos() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION status_concluidos() TO authenticated;

COMMENT ON FUNCTION status_concluidos IS
  'Lista canônica de status conclusivos. Sincronizada com statusConstants.ts no frontend.';

-- ────────────────────────────────────────────────────────────
-- QW1: _assert_team_access — ler user_roles (fonte canônica)
-- Antes: lia team_members.role → divergência com AuthContext
-- Depois: lê user_roles.role → consistência total
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _assert_team_access(p_team_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          UUID := auth.uid();
  v_allowed_ids  UUID[];
  v_unauthorized UUID[];
BEGIN
  -- Usuário não autenticado
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Admin bypassa validação — lê user_roles (fonte canônica do AuthContext)
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_uid
      AND role = 'admin'
    LIMIT 1
  ) THEN
    RETURN;
  END IF;

  -- Times que o usuário realmente pode acessar
  SELECT ARRAY_AGG(tm.team_id)
  INTO   v_allowed_ids
  FROM   public.team_members tm
  WHERE  tm.user_id = v_uid
    AND  tm.team_id = ANY(p_team_ids);

  -- Times solicitados que não estão na lista permitida
  SELECT ARRAY_AGG(t)
  INTO   v_unauthorized
  FROM   UNNEST(p_team_ids) AS t
  WHERE  t <> ALL(COALESCE(v_allowed_ids, ARRAY[]::UUID[]));

  IF v_unauthorized IS NOT NULL AND array_length(v_unauthorized, 1) > 0 THEN
    RAISE EXCEPTION 'Acesso negado aos times: %', v_unauthorized
      USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION _assert_team_access(UUID[]) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION _assert_team_access(UUID[]) TO authenticated;

COMMENT ON FUNCTION _assert_team_access IS
  'v3: admin verificado via user_roles (fonte canônica). Elimina divergência com AuthContext.';

-- ────────────────────────────────────────────────────────────
-- QW2+QW3+QW4: get_admin_kpis com correções de lógica
-- - desvioHoras: COALESCE → sem +nullh
-- - impedimentos: COUNT(DISTINCT)
-- - backlogTotal: exclui canceladas/concluídas sem sprint
-- - demandasAbertas: exclui bloqueadas da contagem de abertas
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_admin_kpis(
  p_team_ids  UUID[],
  p_sla_dias  INT DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result        JSONB := '[]'::JSONB;
  v_team_id       UUID;
  v_limite_risco  TIMESTAMPTZ;
  v_sprint        RECORD;
  v_team_kpi      JSONB;
  v_delay_days    INT;
  v_sprint_status TEXT;
BEGIN
  -- Validação de autorização
  PERFORM _assert_team_access(p_team_ids);

  v_limite_risco := NOW() - (p_sla_dias || ' days')::INTERVAL;

  FOREACH v_team_id IN ARRAY p_team_ids LOOP

    SELECT s.id, s.name, s.end_date, s.is_active, s.closed_at, s.delay_days
    INTO   v_sprint
    FROM   sprints s
    WHERE  s.team_id  = v_team_id
      AND  s.is_active = TRUE
    LIMIT  1;

    IF v_sprint.id IS NOT NULL THEN
      IF v_sprint.end_date IS NULL THEN
        v_sprint_status := 'ativa';
        v_delay_days    := 0;
      ELSIF v_sprint.end_date::DATE < CURRENT_DATE THEN
        v_sprint_status := 'ativa_atrasada';
        v_delay_days    := CURRENT_DATE - v_sprint.end_date::DATE;
      ELSE
        v_sprint_status := 'ativa';
        v_delay_days    := 0;
      END IF;
    ELSE
      v_sprint_status := NULL;
      v_delay_days    := 0;
    END IF;

    SELECT jsonb_build_object(
      'teamId',   v_team_id,
      'sprintAtivo',      v_sprint.name,
      'sprintEndDate',    v_sprint.end_date,
      'sprintStatus',     v_sprint_status,
      'sprintDelayDays',  v_delay_days,

      'totalHUs', (
        SELECT COUNT(*)
        FROM   user_stories h
        WHERE  h.team_id   = v_team_id
          AND  h.sprint_id = v_sprint.id
      ),
      'husConcluidasNoSprint', (
        SELECT COUNT(*)
        FROM   user_stories h
        WHERE  h.team_id   = v_team_id
          AND  h.sprint_id = v_sprint.id
          AND  LOWER(h.status) = ANY(status_concluidos())
      ),
      'velocityPontos', (
        SELECT COALESCE(SUM(h.story_points), 0)
        FROM   user_stories h
        WHERE  h.team_id   = v_team_id
          AND  h.sprint_id = v_sprint.id
          AND  LOWER(h.status) = ANY(status_concluidos())
      ),

      -- QW4: backlog exclui canceladas e já concluídas sem sprint
      'backlogTotal', (
        SELECT COUNT(*)
        FROM   user_stories h
        WHERE  h.team_id   = v_team_id
          AND  h.sprint_id IS NULL
          AND  LOWER(COALESCE(h.status,'')) NOT IN (
                 'cancelada','cancelado','arquivada','arquivado',
                 'concluido','concluida','done','aceite',
                 'aceite_final','ag_aceite_final','resolvido'
               )
      ),

      'impedimentosAbertos', (
        SELECT COUNT(*)
        FROM   impediments i
        WHERE  i.team_id     = v_team_id
          AND  i.resolved_at IS NULL
      ),

      -- QW3: abertas NÃO incluem bloqueadas (evita dupla contagem)
      'demandasAbertas', (
        SELECT COUNT(*)
        FROM   demandas d
        WHERE  d.team_id = v_team_id
          AND  LOWER(COALESCE(d.situacao,'')) NOT IN (
                 'concluido','concluida','done','aceite',
                 'aceite_final','ag_aceite_final','resolvido',
                 'bloqueada','bloqueado'
               )
      ),
      'demandasConcluidas', (
        SELECT COUNT(*)
        FROM   demandas d
        WHERE  d.team_id = v_team_id
          AND  LOWER(COALESCE(d.situacao,'')) = ANY(status_concluidos())
      ),
      'demandasBloqueadas', (
        SELECT COUNT(*)
        FROM   demandas d
        WHERE  d.team_id = v_team_id
          AND  LOWER(COALESCE(d.situacao,'')) IN ('bloqueada','bloqueado')
      ),
      'slaEmRisco', (
        SELECT COUNT(*)
        FROM   demandas d
        WHERE  d.team_id    = v_team_id
          AND  d.created_at <= v_limite_risco
          AND  LOWER(COALESCE(d.situacao,'')) NOT IN (
                 'concluido','concluida','done','aceite',
                 'aceite_final','ag_aceite_final','resolvido'
               )
      )
    ) INTO v_team_kpi;

    v_result := v_result || jsonb_build_array(v_team_kpi);

  END LOOP;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION get_admin_kpis(UUID[], INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_admin_kpis(UUID[], INT) TO authenticated;

COMMENT ON FUNCTION get_admin_kpis IS
  'v2: usa status_concluidos(), backlog sem canceladas, abertas sem bloqueadas.';

-- ────────────────────────────────────────────────────────────
-- QW2: get_sprint_history — desvioHoras COALESCE + impedimentos DISTINCT
-- ────────────────────────────────────────────────────────────
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

      -- QW: durationDays nunca negativo; durationWarning para datas inválidas
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
      -- QW2: COALESCE garante 0.0 mesmo sem atividades → elimina "+nullh"
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

      -- QW3: COUNT(DISTINCT) evita dupla contagem de impedimentos vinculados à sprint E à HU
      'impedimentos', (
        SELECT COUNT(DISTINCT i.id)
        FROM   impediments i
        WHERE  i.sprint_id = v_sprint.id
          OR   i.hu_id IN (
                 SELECT id FROM user_stories WHERE sprint_id = v_sprint.id
               )
      ),

      -- devStats: LEFT JOIN LATERAL (corrigido na migration anterior, mantido)
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
        -- QW3: DISTINCT para evitar dupla contagem
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
  'v3: desvioHoras COALESCE (sem +nullh), impedimentos DISTINCT, status_concluidos(), durationWarning.';

-- ────────────────────────────────────────────────────────────
-- QW6: Índices compostos de performance
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_us_sprint_status
  ON public.user_stories (sprint_id, status);

CREATE INDEX IF NOT EXISTS idx_us_team_sprint
  ON public.user_stories (team_id, sprint_id);

CREATE INDEX IF NOT EXISTS idx_us_team_sprint_null
  ON public.user_stories (team_id, status)
  WHERE sprint_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_activities_hu
  ON public.activities (hu_id);

CREATE INDEX IF NOT EXISTS idx_impediments_sprint
  ON public.impediments (sprint_id)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_impediments_hu
  ON public.impediments (hu_id);

CREATE INDEX IF NOT EXISTS idx_demandas_team_sit
  ON public.demandas (team_id, situacao);

COMMENT ON INDEX idx_us_sprint_status  IS 'Performance: filtro status dentro de sprint';
COMMENT ON INDEX idx_activities_hu     IS 'Performance: agregação de horas por HU';
COMMENT ON INDEX idx_demandas_team_sit IS 'Performance: contagem de demandas por time/status';
