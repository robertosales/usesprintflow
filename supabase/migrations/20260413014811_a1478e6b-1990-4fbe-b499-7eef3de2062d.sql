
-- 1. Tornar sprint_id nullable em user_stories
ALTER TABLE public.user_stories ALTER COLUMN sprint_id DROP NOT NULL;

-- 2. Adicionar colunas de backlog em user_stories
ALTER TABLE public.user_stories ADD COLUMN IF NOT EXISTS backlog_order integer DEFAULT 0;
ALTER TABLE public.user_stories ADD COLUMN IF NOT EXISTS added_to_sprint_at timestamp with time zone;

-- 3. Tabela planning_rounds (rodadas individuais do planning poker)
CREATE TABLE IF NOT EXISTS public.planning_rounds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.planning_sessions(id) ON DELETE CASCADE,
  hu_id uuid NOT NULL REFERENCES public.user_stories(id) ON DELETE CASCADE,
  round_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'voting',
  result_value text,
  result_hours numeric(5,1),
  facilitator_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  revealed_at timestamp with time zone,
  saved_at timestamp with time zone
);

ALTER TABLE public.planning_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access planning_rounds" ON public.planning_rounds FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Member view planning_rounds" ON public.planning_rounds FOR SELECT USING (EXISTS (SELECT 1 FROM planning_sessions ps WHERE ps.id = planning_rounds.session_id AND is_team_member(auth.uid(), ps.team_id)));
CREATE POLICY "Member insert planning_rounds" ON public.planning_rounds FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM planning_sessions ps WHERE ps.id = planning_rounds.session_id AND is_team_member(auth.uid(), ps.team_id)));
CREATE POLICY "Member update planning_rounds" ON public.planning_rounds FOR UPDATE USING (EXISTS (SELECT 1 FROM planning_sessions ps WHERE ps.id = planning_rounds.session_id AND is_team_member(auth.uid(), ps.team_id)));
CREATE POLICY "Member delete planning_rounds" ON public.planning_rounds FOR DELETE USING (EXISTS (SELECT 1 FROM planning_sessions ps WHERE ps.id = planning_rounds.session_id AND is_team_member(auth.uid(), ps.team_id)));

-- 4. Tabela planning_participants
CREATE TABLE IF NOT EXISTS public.planning_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.planning_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_facilitator boolean NOT NULL DEFAULT false,
  is_online boolean NOT NULL DEFAULT true,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.planning_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access planning_participants" ON public.planning_participants FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Member view planning_participants" ON public.planning_participants FOR SELECT USING (EXISTS (SELECT 1 FROM planning_sessions ps WHERE ps.id = planning_participants.session_id AND is_team_member(auth.uid(), ps.team_id)));
CREATE POLICY "Member insert planning_participants" ON public.planning_participants FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM planning_sessions ps WHERE ps.id = planning_participants.session_id AND is_team_member(auth.uid(), ps.team_id)));
CREATE POLICY "Member update planning_participants" ON public.planning_participants FOR UPDATE USING (EXISTS (SELECT 1 FROM planning_sessions ps WHERE ps.id = planning_participants.session_id AND is_team_member(auth.uid(), ps.team_id)));
CREATE POLICY "Member delete planning_participants" ON public.planning_participants FOR DELETE USING (EXISTS (SELECT 1 FROM planning_sessions ps WHERE ps.id = planning_participants.session_id AND is_team_member(auth.uid(), ps.team_id)));

-- 5. Tabela retro_participants
CREATE TABLE IF NOT EXISTS public.retro_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.retro_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_facilitator boolean NOT NULL DEFAULT false,
  is_online boolean NOT NULL DEFAULT true,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.retro_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access retro_participants" ON public.retro_participants FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Member view retro_participants" ON public.retro_participants FOR SELECT USING (EXISTS (SELECT 1 FROM retro_sessions rs WHERE rs.id = retro_participants.session_id AND is_team_member(auth.uid(), rs.team_id)));
CREATE POLICY "Member insert retro_participants" ON public.retro_participants FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM retro_sessions rs WHERE rs.id = retro_participants.session_id AND is_team_member(auth.uid(), rs.team_id)));
CREATE POLICY "Member update retro_participants" ON public.retro_participants FOR UPDATE USING (EXISTS (SELECT 1 FROM retro_sessions rs WHERE rs.id = retro_participants.session_id AND is_team_member(auth.uid(), rs.team_id)));
CREATE POLICY "Member delete retro_participants" ON public.retro_participants FOR DELETE USING (EXISTS (SELECT 1 FROM retro_sessions rs WHERE rs.id = retro_participants.session_id AND is_team_member(auth.uid(), rs.team_id)));

-- 6. Tabela retro_votes (votos individuais em cards)
CREATE TABLE IF NOT EXISTS public.retro_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES public.retro_cards(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.retro_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(card_id, user_id)
);

ALTER TABLE public.retro_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access retro_votes" ON public.retro_votes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Member view retro_votes" ON public.retro_votes FOR SELECT USING (EXISTS (SELECT 1 FROM retro_sessions rs WHERE rs.id = retro_votes.session_id AND is_team_member(auth.uid(), rs.team_id)));
CREATE POLICY "Member insert retro_votes" ON public.retro_votes FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM retro_sessions rs WHERE rs.id = retro_votes.session_id AND is_team_member(auth.uid(), rs.team_id)));
CREATE POLICY "Member delete retro_votes" ON public.retro_votes FOR DELETE USING (EXISTS (SELECT 1 FROM retro_sessions rs WHERE rs.id = retro_votes.session_id AND is_team_member(auth.uid(), rs.team_id)));

-- 7. Habilitar realtime nas novas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.planning_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.planning_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.retro_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.retro_votes;
