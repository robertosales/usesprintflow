-- ============================================================
-- CONSOLIDAÇÃO RLS: substituir has_role() por is_admin() e
-- declarar explicitamente INSERT/UPDATE/DELETE em team_members
-- e profiles usando a função canônica is_admin().
--
-- ESCOPO:
--   • team_members  — recria todas as políticas com is_admin()
--                     e adiciona INSERT/UPDATE/DELETE explícitos
--   • profiles      — garante consistência com is_admin()
--                     (a migration 20260516134200 já trata user_roles e teams)
--
-- SEGURANÇA:
--   • Toda a operação é atômica (BEGIN / COMMIT)
--   • has_role() NÃO é removida — mantida por retrocompat com
--     migrations anteriores até hardening completo
--   • is_team_member() permanece inalterada (correta)
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. TEAM_MEMBERS
-- ────────────────────────────────────────────────────────────

-- Remove políticas legadas que usam has_role()
DROP POLICY IF EXISTS "Admins can manage all team members" ON public.team_members;
DROP POLICY IF EXISTS "Members can view own team members"  ON public.team_members;

-- Admin: acesso total (todas as operações)
CREATE POLICY "tm_admin_all"
ON public.team_members
FOR ALL
USING      (public.is_admin())
WITH CHECK (public.is_admin());

-- Membro: pode VER membros do próprio time
CREATE POLICY "tm_member_select"
ON public.team_members
FOR SELECT
USING (public.is_team_member(auth.uid(), team_id));

-- Membro: pode se AUTO-INSERIR no próprio time (ex: aceitar convite)
CREATE POLICY "tm_member_insert_self"
ON public.team_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND public.is_team_member(auth.uid(), team_id)
);

-- Membro: NÃO pode atualizar registros de team_members
-- (sem policy = negado por padrão; declaramos para deixar explícito)
-- Bloco vazio intencional — nenhuma policy de UPDATE para membros.

-- Membro: NÃO pode deletar registros de team_members
-- (sem policy = negado por padrão; declaramos para deixar explícito)
-- Bloco vazio intencional — nenhuma policy de DELETE para membros.

-- ────────────────────────────────────────────────────────────
-- 2. PROFILES — consolidar para is_admin()
-- ────────────────────────────────────────────────────────────

-- Remove políticas antigas (has_role + migration inicial)
DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
-- Remove também as policies criadas em 20260513190000
DROP POLICY IF EXISTS "profiles_select_own"          ON public.profiles;
DROP POLICY IF EXISTS "admin_select_all_profiles"    ON public.profiles;
DROP POLICY IF EXISTS "admin_update_all_profiles"    ON public.profiles;

-- Usuário comum: ver e editar apenas o próprio perfil
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid());

-- Admin: ver TODOS os perfis
CREATE POLICY "profiles_admin_select_all"
ON public.profiles
FOR SELECT
USING (public.is_admin());

-- Admin: atualizar QUALQUER perfil
CREATE POLICY "profiles_admin_update_all"
ON public.profiles
FOR UPDATE
USING      (public.is_admin())
WITH CHECK (public.is_admin());

-- Admin: deletar perfil (ex: desativação de conta)
CREATE POLICY "profiles_admin_delete"
ON public.profiles
FOR DELETE
USING (public.is_admin());

COMMIT;

-- ────────────────────────────────────────────────────────────
-- QUERIES DE VALIDAÇÃO (executar manualmente no Supabase)
-- ────────────────────────────────────────────────────────────
-- -- Como admin autenticado:
-- SELECT * FROM public.team_members;           -- deve retornar todos
-- SELECT * FROM public.profiles;               -- deve retornar todos
--
-- -- Como membro autenticado (user_id = '<membro-uuid>'):
-- SELECT * FROM public.team_members
--   WHERE team_id = '<team-uuid>';             -- apenas do próprio time
-- SELECT * FROM public.profiles
--   WHERE user_id = auth.uid();               -- apenas o próprio perfil
--
-- -- Teste de bloqueio (membro tentando INSERT no time alheio):
-- INSERT INTO public.team_members (team_id, user_id, role)
--   VALUES ('<outro-team-uuid>', auth.uid(), 'developer'); -- deve falhar
