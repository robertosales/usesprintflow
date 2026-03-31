
CREATE TABLE public.releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  sprint_id uuid,
  version text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  released_at timestamptz NOT NULL DEFAULT now(),
  notes text DEFAULT '',
  hus_included integer DEFAULT 0,
  bugs_fixed integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access releases" ON public.releases FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Member view own team releases" ON public.releases FOR SELECT USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member insert own team releases" ON public.releases FOR INSERT WITH CHECK (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member update own team releases" ON public.releases FOR UPDATE USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member delete own team releases" ON public.releases FOR DELETE USING (is_team_member(auth.uid(), team_id));
