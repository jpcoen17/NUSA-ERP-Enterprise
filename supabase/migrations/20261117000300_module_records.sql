-- Generic record store for demo-stage modules (field layout is defined in the frontend per module).
-- Promote a module to dedicated typed tables (numeric money columns, FKs) as it matures.
create table public.module_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id),
  module_no smallint not null check (module_no between 1 and 75),
  data jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','pending','done','archived')),
  is_demo boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now());
create index on public.module_records (company_id, module_no, created_at desc);
create index on public.module_records (branch_id);
alter table public.module_records enable row level security;
create policy mr_select on public.module_records for select to authenticated using (
  public.is_admin() or (branch_id is null and public.has_company_access(company_id))
  or (branch_id is not null and public.has_branch_access(company_id, branch_id)));
create policy mr_write on public.module_records for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.module_records from anon;

create function public.touch_and_audit() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op <> 'DELETE' then new.updated_at := now(); end if;
  insert into public.audit_logs (company_id, user_id, action, table_name, record_id, details)
  values (coalesce(new.company_id, old.company_id), auth.uid(), lower(tg_op), tg_table_name,
          coalesce(new.id, old.id), jsonb_build_object('module_no', coalesce(new.module_no, old.module_no)));
  return coalesce(new, old);
end $$;
create trigger module_records_audit before insert or update or delete on public.module_records
  for each row execute function public.touch_and_audit();
