
CREATE TABLE public.demanda_evidencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demanda_id UUID NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  fase TEXT NOT NULL DEFAULT 'execucao',
  tipo TEXT NOT NULL DEFAULT 'arquivo',
  titulo TEXT NOT NULL DEFAULT '',
  descricao TEXT,
  file_path TEXT,
  file_name TEXT,
  mime_type TEXT DEFAULT 'application/octet-stream',
  url_externa TEXT,
  obrigatoria BOOLEAN NOT NULL DEFAULT false,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.demanda_evidencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access demanda_evidencias" ON public.demanda_evidencias
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Member view demanda_evidencias" ON public.demanda_evidencias
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM demandas d WHERE d.id = demanda_evidencias.demanda_id AND is_team_member(auth.uid(), d.team_id)
  ));

CREATE POLICY "Member insert demanda_evidencias" ON public.demanda_evidencias
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM demandas d WHERE d.id = demanda_evidencias.demanda_id AND is_team_member(auth.uid(), d.team_id)
  ));

CREATE POLICY "Member delete demanda_evidencias" ON public.demanda_evidencias
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM demandas d WHERE d.id = demanda_evidencias.demanda_id AND is_team_member(auth.uid(), d.team_id)
  ));
