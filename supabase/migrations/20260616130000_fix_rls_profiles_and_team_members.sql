-- ============================================================
-- FIX RLS: profiles + team_members
--
-- PROBLEMAS CORRIGIDOS:
--   1. tm_member_insert_self tinha WITH CHECK circular:
--      exigia is_team_member() antes de o usuário ser membro.
--      Corrigido: permite INSERT apenas com user_id = auth.uid()
--      (admin continua com acesso total via tm_admin_all).
--
--   2. Documenta e preserva as policies legítimas já existentes:
--      • profiles_select_same_contract
--      • team_members_can_view_profiles
--      Ambas são necessárias para o dashboard funcionar.
--
-- NÃO ALTERA:
--   • profiles_admin_delete
--   • profiles_admin_select_all
--   • profiles_admin_update_all
--   • profiles_insert_own
--   • profiles_select_own
--   • profiles_update_own
--   • profiles_select_same_contract
--   • team_members_can_view_profiles
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. CORRIGE: tm_member_insert_self (WITH CHECK circular)
-- ────────────────────────────────────────────────────────────
-- A versão anterior exigia is_team_member() no INSERT,
-- mas o usuário ainda NÃO é membro nesse momento → sempre bloqueava.

DROP POLICY IF EXISTS "tm_member_insert_self" ON public.team_members;

CREATE POLICY "tm_member_insert_self"
ON public.team_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
);

-- ────────────────────────────────────────────────────────────
-- 2. GARANTE: team_members_can_view_profiles existe em profiles
-- ────────────────────────────────────────────────────────────
-- Criada fora das migrations numeradas; recriamos de forma
-- idempotente para garantir consistência após qualquer rollback.

DROP POLICY IF EXISTS "team_members_can_view_profiles" ON public.profiles;

CREATE POLICY "team_members_can_view_profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.team_members tm1
    JOIN public.team_members tm2
      ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = auth.uid()
      AND tm2.user_id = profiles.user_id
  )
);

-- ────────────────────────────────────────────────────────────
-- 3. GARANTE: profiles_select_same_contract existe em profiles
-- ────────────────────────────────────────────────────────────
-- Recriamos de forma idempotente para garantir consistência.
-- Pressupõe coluna contract_id em profiles.

DROP POLICY IF EXISTS "profiles_select_same_contract" ON public.profiles;

CREATE POLICY "profiles_select_same_contract"
ON public.profiles
FOR SELECT
USING (
  contract_id = (
    SELECT contract_id
    FROM public.profiles
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

COMMIT;

-- ────────────────────────────────────────────────────────────
-- VALIDAÇÃO (executar manualmente no Supabase SQL Editor)
-- ────────────────────────────────────────────────────────────
--
-- 1. Listar todas as policies ativas em profiles:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;
--
-- Esperado:
--   profiles_admin_delete          | DELETE
--   profiles_admin_select_all      | SELECT
--   profiles_admin_update_all      | UPDATE
--   profiles_insert_own            | INSERT
--   profiles_select_own            | SELECT
--   profiles_select_same_contract  | SELECT
--   profiles_update_own            | UPDATE
--   team_members_can_view_profiles | SELECT
--
-- 2. Listar policies em team_members:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'team_members' ORDER BY policyname;
--
-- Esperado:
--   tm_admin_all           | ALL
--   tm_member_insert_self  | INSERT
--   tm_member_select       | SELECT
--
-- 3. Teste de INSERT como membro (deve funcionar):
-- INSERT INTO public.team_members (team_id, user_id, role)
--   VALUES ('<team-uuid>', auth.uid(), 'developer');
--
-- 4. Teste de INSERT como membro no time alheio (deve falhar):
-- INSERT INTO public.team_members (team_id, user_id, role)
--   VALUES ('<outro-team-uuid>', '<outro-user-uuid>', 'developer');
