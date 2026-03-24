
-- 1. Create trigger for auto-creating profiles on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Add missing foreign keys using DO block to skip existing ones
DO $$
BEGIN
  -- activities
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activities_team_id_fkey') THEN
    ALTER TABLE public.activities ADD CONSTRAINT activities_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activities_assignee_id_fkey') THEN
    ALTER TABLE public.activities ADD CONSTRAINT activities_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.developers(id) ON DELETE SET NULL;
  END IF;

  -- automation_rules
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'automation_rules_team_id_fkey') THEN
    ALTER TABLE public.automation_rules ADD CONSTRAINT automation_rules_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;

  -- custom_field_definitions
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custom_field_definitions_team_id_fkey') THEN
    ALTER TABLE public.custom_field_definitions ADD CONSTRAINT custom_field_definitions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;

  -- developers
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'developers_team_id_fkey') THEN
    ALTER TABLE public.developers ADD CONSTRAINT developers_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;

  -- epics
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'epics_team_id_fkey') THEN
    ALTER TABLE public.epics ADD CONSTRAINT epics_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;

  -- impediments
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'impediments_hu_id_fkey') THEN
    ALTER TABLE public.impediments ADD CONSTRAINT impediments_hu_id_fkey FOREIGN KEY (hu_id) REFERENCES public.user_stories(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'impediments_team_id_fkey') THEN
    ALTER TABLE public.impediments ADD CONSTRAINT impediments_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;

  -- sprints
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sprints_team_id_fkey') THEN
    ALTER TABLE public.sprints ADD CONSTRAINT sprints_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;

  -- team_members
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_members_team_id_fkey') THEN
    ALTER TABLE public.team_members ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_members_user_id_fkey') THEN
    ALTER TABLE public.team_members ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- user_stories
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_stories_sprint_id_fkey') THEN
    ALTER TABLE public.user_stories ADD CONSTRAINT user_stories_sprint_id_fkey FOREIGN KEY (sprint_id) REFERENCES public.sprints(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_stories_team_id_fkey') THEN
    ALTER TABLE public.user_stories ADD CONSTRAINT user_stories_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_stories_epic_id_fkey') THEN
    ALTER TABLE public.user_stories ADD CONSTRAINT user_stories_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE SET NULL;
  END IF;

  -- workflow_columns
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workflow_columns_team_id_fkey') THEN
    ALTER TABLE public.workflow_columns ADD CONSTRAINT workflow_columns_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;

  -- profiles
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_fkey') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- user_roles
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_fkey') THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Add updated_at triggers
CREATE OR REPLACE TRIGGER update_sprints_updated_at
  BEFORE UPDATE ON public.sprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_user_stories_updated_at
  BEFORE UPDATE ON public.user_stories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
