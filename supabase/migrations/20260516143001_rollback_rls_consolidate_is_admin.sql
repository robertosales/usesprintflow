-- ============================================================
-- ROLLBACK: desfaz a consolidação is_admin() em team_members
-- e profiles, restaurando as políticas originais com has_role()
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. TEAM_MEMBERS — restaurar políticas originais
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tm_admin_all"           ON public.team_members;
DROP POLICY IF EXISTS "tm_member_select"       ON public.team_members;
DROP POLICY IF EXISTS "tm_member_insert_self"  ON public.team_members;

CREATE POLICY "Admins can manage all team members"
ON public.team_members
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view own team members"
ON public.team_members
FOR SELECT
USING (public.is_team_member(auth.uid(), team_id));

-- ────────────────────────────────────────────────────────────
-- 2. PROFILES — restaurar políticas da migration 20260513190000
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_own"         ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"         ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"         ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select_all"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update_all"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_delete"       ON public.profiles;

CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "admin_select_all_profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "admin_update_all_profiles"
ON public.profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

COMMIT;
