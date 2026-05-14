import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// A Anon Key é uma chave PÚBLICA por design.
// A segurança dos dados é garantida pelo RLS (Row Level Security) no Supabase.
const SUPABASE_URL = 'https://uwjralsqmppgwemeymyw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3anJhbHNxbXBwZ3dlbWV5bXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMjQ1NDIsImV4cCI6MjA5MzcwMDU0Mn0.lr9xUvCQ67bwi0W9zzTajxGptcP-6zFwiPaGPpj9Eak';

// import { supabase } from "@/integrations/supabase/client";
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
