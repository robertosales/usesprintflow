-- Tabela de auditoria de gerenciamento de usuários
create table if not exists public.user_management_audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid not null references auth.users(id) on delete set null,
  target_id   uuid not null references auth.users(id) on delete cascade,
  action      text not null,          -- 'toggle_active' | 'change_role' | 'change_email' | 'reset_password' | 'delete_user'
  payload     jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Índices para queries do painel
create index if not exists idx_audit_log_target  on public.user_management_audit_log (target_id,  created_at desc);
create index if not exists idx_audit_log_actor   on public.user_management_audit_log (actor_id,   created_at desc);
create index if not exists idx_audit_log_action  on public.user_management_audit_log (action,     created_at desc);

-- RLS
alter table public.user_management_audit_log enable row level security;

-- Apenas admins (module_access = 'admin') podem ler
create policy "admin_select_audit_log"
  on public.user_management_audit_log
  for select
  using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid()
        and module_access = 'admin'
    )
  );

-- Insert feito via service role (Edge Functions) — sem policy de insert para anon/authenticated
