
-- Create calendar_events table
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_date DATE NOT NULL,
  event_time TIME DEFAULT NULL,
  event_type TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admin full access calendar_events" ON public.calendar_events
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Member view own team calendar_events" ON public.calendar_events
  FOR SELECT TO public USING (is_team_member(auth.uid(), team_id));

CREATE POLICY "Member insert own team calendar_events" ON public.calendar_events
  FOR INSERT TO public WITH CHECK (is_team_member(auth.uid(), team_id) AND user_id = auth.uid());

CREATE POLICY "Member update own calendar_events" ON public.calendar_events
  FOR UPDATE TO public USING (user_id = auth.uid());

CREATE POLICY "Member delete own calendar_events" ON public.calendar_events
  FOR DELETE TO public USING (user_id = auth.uid());
