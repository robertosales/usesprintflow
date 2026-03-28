
-- Notifications table for in-app alerts, mentions, impediments
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'mention',
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  link_type TEXT,
  link_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Team members can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (is_team_member(auth.uid(), team_id));

CREATE POLICY "Admins full access notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Allow profiles to be viewed by team members (needed for @ mentions)
CREATE POLICY "Team members can view profiles of teammates"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm1
      JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = auth.uid() AND tm2.user_id = profiles.user_id
    )
  );
