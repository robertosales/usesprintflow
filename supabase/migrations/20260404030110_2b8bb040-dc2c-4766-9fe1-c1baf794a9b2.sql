
-- Table for linking multiple users to a demanda with informational roles
CREATE TABLE public.demanda_responsaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  papel text NOT NULL DEFAULT 'desenvolvedor',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(demanda_id, user_id)
);

ALTER TABLE public.demanda_responsaveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access demanda_responsaveis" ON public.demanda_responsaveis
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Member view demanda_responsaveis" ON public.demanda_responsaveis
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM demandas d WHERE d.id = demanda_responsaveis.demanda_id AND is_team_member(auth.uid(), d.team_id))
  );

CREATE POLICY "Member insert demanda_responsaveis" ON public.demanda_responsaveis
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM demandas d WHERE d.id = demanda_responsaveis.demanda_id AND is_team_member(auth.uid(), d.team_id))
  );

CREATE POLICY "Member delete demanda_responsaveis" ON public.demanda_responsaveis
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM demandas d WHERE d.id = demanda_responsaveis.demanda_id AND is_team_member(auth.uid(), d.team_id))
  );
