REVOKE ALL ON FUNCTION public.get_sprint_history(uuid[], uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_sprint_history(uuid[], uuid, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_sprint_history(uuid[], uuid, date) TO authenticated;