
-- Attachments table for HUs and activities
CREATE TABLE public.attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'user_story',
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access attachments" ON public.attachments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Member view own team attachments" ON public.attachments FOR SELECT USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member insert own team attachments" ON public.attachments FOR INSERT WITH CHECK (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member delete own attachments" ON public.attachments FOR DELETE USING (auth.uid() = uploaded_by);

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attachments');
CREATE POLICY "Anyone can view attachments" ON storage.objects FOR SELECT USING (bucket_id = 'attachments');
CREATE POLICY "Users can delete own attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Ensure trigger exists for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
