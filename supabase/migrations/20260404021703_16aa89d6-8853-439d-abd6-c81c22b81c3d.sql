ALTER TABLE public.teams ADD COLUMN module text NOT NULL DEFAULT 'sala_agil';

-- Add module_access select to UserRolesManager: admins can update profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));