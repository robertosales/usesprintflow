
-- Create projetos table
CREATE TABLE public.projetos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  equipe TEXT DEFAULT '',
  sla TEXT NOT NULL DEFAULT 'padrao',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access projetos" ON public.projetos FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Member view own team projetos" ON public.projetos FOR SELECT USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member insert own team projetos" ON public.projetos FOR INSERT WITH CHECK (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member update own team projetos" ON public.projetos FOR UPDATE USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member delete own team projetos" ON public.projetos FOR DELETE USING (is_team_member(auth.uid(), team_id));

-- Add trigger for updated_at
CREATE TRIGGER update_projetos_updated_at BEFORE UPDATE ON public.projetos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
