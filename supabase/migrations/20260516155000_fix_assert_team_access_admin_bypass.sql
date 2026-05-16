-- ============================================================
-- HOTFIX #3: admin bypass em _assert_team_access
--
-- Problema: usuários com role='admin' em team_members eram
-- barrados ao consultar times em que não estão cadastrados.
-- Admin deve ter acesso irrestrito a todos os times.
--
-- Solução: se auth.uid() possui qualquer entrada com
-- role='admin' em team_members, a função retorna sem erro.
-- ============================================================

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

  -- Admin bypassa validação — acesso irrestrito
  IF EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = v_uid
      AND LOWER(role) = 'admin'
    LIMIT 1
  ) THEN
    RETURN;
  END IF;

  -- Times que o usuário realmente pode acessar
  SELECT ARRAY_AGG(tm.team_id)
  INTO   v_allowed_ids
  FROM   team_members tm
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
  'v2: admin (role=admin em team_members) bypassa validação de times.';
