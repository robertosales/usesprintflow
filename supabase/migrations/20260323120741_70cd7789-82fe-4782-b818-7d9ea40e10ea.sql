
-- ============================================
-- SPRINT MANAGER - SCHEMA COMPLETO
-- ============================================

-- 1. Enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- 2. Tabela de perfis
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela de roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  UNIQUE (user_id, role)
);

-- 4. Tabela de times/squads
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Membros do time
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'developer',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

-- 6. Desenvolvedores (membros do projeto)
CREATE TABLE public.developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'developer',
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Sprints
CREATE TABLE public.sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  goal TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Épicos
CREATE TABLE public.epics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. User Stories (HUs)
CREATE TABLE public.user_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  epic_id UUID REFERENCES public.epics(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  story_points INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'media',
  status TEXT NOT NULL DEFAULT 'aguardando_desenvolvimento',
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Atividades/Tarefas
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  hu_id UUID NOT NULL REFERENCES public.user_stories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  activity_type TEXT NOT NULL DEFAULT 'task',
  assignee_id UUID REFERENCES public.developers(id) ON DELETE SET NULL,
  hours NUMERIC NOT NULL DEFAULT 8,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Impedimentos (vinculados à HU)
CREATE TABLE public.impediments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  hu_id UUID NOT NULL REFERENCES public.user_stories(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'tecnico',
  criticality TEXT NOT NULL DEFAULT 'media',
  has_ticket BOOLEAN NOT NULL DEFAULT false,
  ticket_url TEXT,
  ticket_id TEXT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution TEXT
);

-- 12. Campos personalizados
CREATE TABLE public.custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  options TEXT[],
  required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Regras de automação
CREATE TABLE public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  trigger_type TEXT NOT NULL DEFAULT 'status_change',
  trigger_from_status TEXT,
  trigger_to_status TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'notify',
  action_target_status TEXT,
  action_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Colunas do workflow
CREATE TABLE public.workflow_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  color_class TEXT NOT NULL,
  dot_color TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (team_id, key)
);

-- ============================================
-- RLS
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impediments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_columns ENABLE ROW LEVEL SECURITY;

-- Security definer function to check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to check team membership
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members WHERE user_id = _user_id AND team_id = _team_id
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Teams policies (admin sees all, member sees own teams)
CREATE POLICY "Admins can manage all teams" ON public.teams FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members can view own teams" ON public.teams FOR SELECT USING (public.is_team_member(auth.uid(), id));

-- Team members policies
CREATE POLICY "Admins can manage all team members" ON public.team_members FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members can view own team members" ON public.team_members FOR SELECT USING (public.is_team_member(auth.uid(), team_id));

-- Developers
CREATE POLICY "Admin full access developers" ON public.developers FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Member view own team developers" ON public.developers FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member insert own team developers" ON public.developers FOR INSERT WITH CHECK (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member update own team developers" ON public.developers FOR UPDATE USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member delete own team developers" ON public.developers FOR DELETE USING (public.is_team_member(auth.uid(), team_id));

-- Sprints
CREATE POLICY "Admin full access sprints" ON public.sprints FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Member view own team sprints" ON public.sprints FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member insert own team sprints" ON public.sprints FOR INSERT WITH CHECK (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member update own team sprints" ON public.sprints FOR UPDATE USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member delete own team sprints" ON public.sprints FOR DELETE USING (public.is_team_member(auth.uid(), team_id));

-- Epics
CREATE POLICY "Admin full access epics" ON public.epics FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Member view own team epics" ON public.epics FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member insert own team epics" ON public.epics FOR INSERT WITH CHECK (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member update own team epics" ON public.epics FOR UPDATE USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member delete own team epics" ON public.epics FOR DELETE USING (public.is_team_member(auth.uid(), team_id));

-- User Stories
CREATE POLICY "Admin full access user_stories" ON public.user_stories FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Member view own team user_stories" ON public.user_stories FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member insert own team user_stories" ON public.user_stories FOR INSERT WITH CHECK (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member update own team user_stories" ON public.user_stories FOR UPDATE USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member delete own team user_stories" ON public.user_stories FOR DELETE USING (public.is_team_member(auth.uid(), team_id));

-- Activities
CREATE POLICY "Admin full access activities" ON public.activities FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Member view own team activities" ON public.activities FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member insert own team activities" ON public.activities FOR INSERT WITH CHECK (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member update own team activities" ON public.activities FOR UPDATE USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member delete own team activities" ON public.activities FOR DELETE USING (public.is_team_member(auth.uid(), team_id));

-- Impediments
CREATE POLICY "Admin full access impediments" ON public.impediments FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Member view own team impediments" ON public.impediments FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member insert own team impediments" ON public.impediments FOR INSERT WITH CHECK (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member update own team impediments" ON public.impediments FOR UPDATE USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member delete own team impediments" ON public.impediments FOR DELETE USING (public.is_team_member(auth.uid(), team_id));

-- Custom Field Definitions
CREATE POLICY "Admin full access custom_field_definitions" ON public.custom_field_definitions FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Member view own team custom_field_definitions" ON public.custom_field_definitions FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member insert own team custom_field_definitions" ON public.custom_field_definitions FOR INSERT WITH CHECK (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member update own team custom_field_definitions" ON public.custom_field_definitions FOR UPDATE USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member delete own team custom_field_definitions" ON public.custom_field_definitions FOR DELETE USING (public.is_team_member(auth.uid(), team_id));

-- Automation Rules
CREATE POLICY "Admin full access automation_rules" ON public.automation_rules FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Member view own team automation_rules" ON public.automation_rules FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member insert own team automation_rules" ON public.automation_rules FOR INSERT WITH CHECK (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member update own team automation_rules" ON public.automation_rules FOR UPDATE USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member delete own team automation_rules" ON public.automation_rules FOR DELETE USING (public.is_team_member(auth.uid(), team_id));

-- Workflow Columns
CREATE POLICY "Admin full access workflow_columns" ON public.workflow_columns FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Member view own team workflow_columns" ON public.workflow_columns FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member insert own team workflow_columns" ON public.workflow_columns FOR INSERT WITH CHECK (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member update own team workflow_columns" ON public.workflow_columns FOR UPDATE USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member delete own team workflow_columns" ON public.workflow_columns FOR DELETE USING (public.is_team_member(auth.uid(), team_id));

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON public.sprints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_stories_updated_at BEFORE UPDATE ON public.user_stories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  
  -- First user gets admin role, subsequent users get member role
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
