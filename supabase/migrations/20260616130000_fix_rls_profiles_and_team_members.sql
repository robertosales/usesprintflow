-- ============================================================
-- FIX RLS: profiles + team_members
--
-- PROBLEMAS CORRIGIDOS:
--
--   1. profiles_select_same_contract usa coluna contract_id que
--      NAO existe na tabela profiles → policy sempre quebrada.
--      SOLUCAO: dropar a policy invalida.
--
--   2. tm_member_insert_self tinha WITH CHECK circular:
--      exigia is_team_member() antes de o usuario ser membro,
--      bloqueando sempre o INSERT de novos membros.
--      SOLUCAO: WITH CHECK (user_id = auth.uid()) apenas.
--
--   3. team_members_can_view_profiles — recriada de forma
--      idempotente para garantir consistencia em todos os ambientes.
--
-- NAO ALTERA:
--   • profiles_admin_delete
--   • profiles_admin_select_all
--   • profiles_admin_update_all
--   • profiles_insert_own
--   • profiles_select_own
--   • profiles_update_own
--   • tm_admin_all
--   • tm_member_select
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. REMOVE policy invalida (referencia coluna inexistente)
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_same_contract" ON public.profiles;

-- ────────────────────────────────────────────────────────────
-- 2. CORRIGE: tm_member_insert_self (WITH CHECK circular)
-- ────────────────────────────────────────────────────────────
-- A versao anterior exigia is_team_member() no INSERT, mas o
-- usuario ainda NAO e membro nesse momento → bloqueava sempre.
DROP POLICY IF EXISTS "tm_member_insert_self" ON public.team_members;

CREATE POLICY "tm_member_insert_self"
ON public.team_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
);

-- ────────────────────────────────────────────────────────────
-- 3. GARANTE: team_members_can_view_profiles (idempotente)
-- ────────────────────────────────────────────────────────────
-- Permite que membros do mesmo time vejam os perfis uns dos outros.
-- Necessario para o dashboard exibir nomes/avatares dos colegas.
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

COMMIT;

-- ────────────────────────────────────────────────────────────
-- VALIDACAO (executar manualmente no Supabase SQL Editor)
-- ────────────────────────────────────────────────────────────
--
-- 1. Listar policies ativas em profiles (deve ter 7 entradas):
-- SELECT policyname, cmd
-- FROM pg_policies
-- WHERE tablename = 'profiles'
-- ORDER BY policyname;
--
-- Esperado:
--   profiles_admin_delete          | DELETE
--   profiles_admin_select_all      | SELECT
--   profiles_admin_update_all      | UPDATE
--   profiles_insert_own            | INSERT
--   profiles_select_own            | SELECT
--   profiles_update_own            | UPDATE
--   team_members_can_view_profiles | SELECT
--
-- 2. Listar policies em team_members (deve ter 3 entradas):
-- SELECT policyname, cmd
-- FROM pg_policies
-- WHERE tablename = 'team_members'
-- ORDER BY policyname;
--
-- Esperado:
--   tm_admin_all          | ALL
--   tm_member_insert_self | INSERT
--   tm_member_select      | SELECT
--
-- 3. Teste INSERT como membro (deve funcionar):
-- INSERT INTO public.team_members (team_id, user_id, role)
--   VALUES ('<team-uuid>', auth.uid(), 'developer');
--
-- 4. Teste INSERT no time alheio (deve falhar com RLS violation):
-- INSERT INTO public.team_members (team_id, user_id, role)
--   VALUES ('<qualquer-team-uuid>', '<outro-user-uuid>', 'developer');
