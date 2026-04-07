
-- Add size reference fields to user_stories
ALTER TABLE public.user_stories 
  ADD COLUMN IF NOT EXISTS size_reference text,
  ADD COLUMN IF NOT EXISTS estimated_hours numeric,
  ADD COLUMN IF NOT EXISTS planning_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS voted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS voted_by uuid;

-- Planning Poker sessions
CREATE TABLE public.planning_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  sprint_id uuid NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  deck_mode text NOT NULL DEFAULT 'fibonacci',
  deck_config jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone
);

ALTER TABLE public.planning_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access planning_sessions" ON public.planning_sessions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Member view own team planning_sessions" ON public.planning_sessions FOR SELECT USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member insert own team planning_sessions" ON public.planning_sessions FOR INSERT WITH CHECK (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member update own team planning_sessions" ON public.planning_sessions FOR UPDATE USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member delete own team planning_sessions" ON public.planning_sessions FOR DELETE USING (is_team_member(auth.uid(), team_id));

-- Planning votes
CREATE TABLE public.planning_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.planning_sessions(id) ON DELETE CASCADE,
  hu_id uuid NOT NULL REFERENCES public.user_stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vote_value text NOT NULL,
  revealed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.planning_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access planning_votes" ON public.planning_votes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Member view planning_votes" ON public.planning_votes FOR SELECT USING (
  EXISTS (SELECT 1 FROM planning_sessions ps WHERE ps.id = planning_votes.session_id AND is_team_member(auth.uid(), ps.team_id))
);
CREATE POLICY "Member insert planning_votes" ON public.planning_votes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM planning_sessions ps WHERE ps.id = planning_votes.session_id AND is_team_member(auth.uid(), ps.team_id))
);
CREATE POLICY "Member update planning_votes" ON public.planning_votes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM planning_sessions ps WHERE ps.id = planning_votes.session_id AND is_team_member(auth.uid(), ps.team_id))
);
CREATE POLICY "Member delete planning_votes" ON public.planning_votes FOR DELETE USING (
  EXISTS (SELECT 1 FROM planning_sessions ps WHERE ps.id = planning_votes.session_id AND is_team_member(auth.uid(), ps.team_id))
);

-- Retrospective sessions
CREATE TABLE public.retro_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  sprint_id uuid NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  model text NOT NULL DEFAULT '4ls',
  status text NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone
);

ALTER TABLE public.retro_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access retro_sessions" ON public.retro_sessions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Member view own team retro_sessions" ON public.retro_sessions FOR SELECT USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member insert own team retro_sessions" ON public.retro_sessions FOR INSERT WITH CHECK (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member update own team retro_sessions" ON public.retro_sessions FOR UPDATE USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member delete own team retro_sessions" ON public.retro_sessions FOR DELETE USING (is_team_member(auth.uid(), team_id));

-- Retrospective cards
CREATE TABLE public.retro_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.retro_sessions(id) ON DELETE CASCADE,
  column_key text NOT NULL,
  text text NOT NULL,
  author_id uuid NOT NULL,
  is_action boolean NOT NULL DEFAULT false,
  votes integer NOT NULL DEFAULT 0,
  action_owner_id uuid,
  action_target_sprint_id uuid REFERENCES public.sprints(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.retro_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access retro_cards" ON public.retro_cards FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Member view retro_cards" ON public.retro_cards FOR SELECT USING (
  EXISTS (SELECT 1 FROM retro_sessions rs WHERE rs.id = retro_cards.session_id AND is_team_member(auth.uid(), rs.team_id))
);
CREATE POLICY "Member insert retro_cards" ON public.retro_cards FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM retro_sessions rs WHERE rs.id = retro_cards.session_id AND is_team_member(auth.uid(), rs.team_id))
);
CREATE POLICY "Member update retro_cards" ON public.retro_cards FOR UPDATE USING (
  EXISTS (SELECT 1 FROM retro_sessions rs WHERE rs.id = retro_cards.session_id AND is_team_member(auth.uid(), rs.team_id))
);
CREATE POLICY "Member delete retro_cards" ON public.retro_cards FOR DELETE USING (
  EXISTS (SELECT 1 FROM retro_sessions rs WHERE rs.id = retro_cards.session_id AND is_team_member(auth.uid(), rs.team_id))
);

-- Retrospective actions
CREATE TABLE public.retro_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.retro_sessions(id) ON DELETE CASCADE,
  card_id uuid REFERENCES public.retro_cards(id) ON DELETE SET NULL,
  description text NOT NULL,
  owner_id uuid,
  target_sprint_id uuid REFERENCES public.sprints(id),
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.retro_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access retro_actions" ON public.retro_actions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Member view retro_actions" ON public.retro_actions FOR SELECT USING (
  EXISTS (SELECT 1 FROM retro_sessions rs WHERE rs.id = retro_actions.session_id AND is_team_member(auth.uid(), rs.team_id))
);
CREATE POLICY "Member insert retro_actions" ON public.retro_actions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM retro_sessions rs WHERE rs.id = retro_actions.session_id AND is_team_member(auth.uid(), rs.team_id))
);
CREATE POLICY "Member update retro_actions" ON public.retro_actions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM retro_sessions rs WHERE rs.id = retro_actions.session_id AND is_team_member(auth.uid(), rs.team_id))
);
CREATE POLICY "Member delete retro_actions" ON public.retro_actions FOR DELETE USING (
  EXISTS (SELECT 1 FROM retro_sessions rs WHERE rs.id = retro_actions.session_id AND is_team_member(auth.uid(), rs.team_id))
);

-- Enable realtime for planning and retro
ALTER PUBLICATION supabase_realtime ADD TABLE public.planning_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.retro_cards;
