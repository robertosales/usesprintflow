import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// A Anon Key é uma chave PÚBLICA por design.
// A segurança dos dados é garantida pelo RLS (Row Level Security) no Supabase.
const SUPABASE_URL = 'https://uwjralsqmppgwemeymyw.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_m-Yx0b0kO2iGVhCN5cMy0Q_6zub3rQH';

// import { supabase } from "@/integrations/supabase/client";
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
