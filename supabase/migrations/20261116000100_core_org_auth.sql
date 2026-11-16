-- Stage 3-5: organization, roles, profiles, access control, audit log. All tables have RLS.
create extension if not exists pgcrypto;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.companies(id),
  code text not null unique,
  name text not null,
  currency char(3) not null default 'IDR',
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null, name text not null, city text,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (company_id, code)
);
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, created_at timestamptz not null default now()
);
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, name text not null, description text
);
create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, description text
);
create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now()
);
-- A user sees a company only if a row exists here. branch_id NULL = all branches of that company.
create table public.user_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  role_id uuid not null references public.roles(id),
  created_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  user_id uuid, action text not null, table_name text, record_id uuid,
  details jsonb, created_at timestamptz not null default now()
);

create index on public.companies (parent_id);
create index on public.branches (company_id);
create index on public.departments (company_id);
create index on public.user_access (user_id);
create index on public.user_access (company_id);
create index on public.audit_logs (company_id, created_at desc);

-- Helper functions (SECURITY DEFINER so policies do not recurse into user_access RLS).
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_access ua join public.roles r on r.id = ua.role_id
                 where ua.user_id = auth.uid() and r.code = 'super_admin');
$$;
create function public.has_company_access(cid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_access ua where ua.user_id = auth.uid() and ua.company_id = cid);
$$;
create function public.has_branch_access(cid uuid, bid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_access ua where ua.user_id = auth.uid() and ua.company_id = cid
                 and (ua.branch_id is null or ua.branch_id = bid));
$$;

-- Auto-create profile on signup. New users have NO access until an admin grants it.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Row Level Security
alter table public.companies enable row level security;
alter table public.branches enable row level security;
alter table public.departments enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.user_access enable row level security;
alter table public.audit_logs enable row level security;

create policy companies_select on public.companies for select to authenticated using (public.has_company_access(id) or public.is_admin());
create policy companies_write on public.companies for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy branches_select on public.branches for select to authenticated using (public.has_branch_access(company_id, id) or public.is_admin());
create policy branches_write on public.branches for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy departments_select on public.departments for select to authenticated using (public.has_company_access(company_id) or public.is_admin());
create policy departments_write on public.departments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy roles_select on public.roles for select to authenticated using (true);
create policy roles_write on public.roles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy permissions_select on public.permissions for select to authenticated using (true);
create policy permissions_write on public.permissions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy role_permissions_select on public.role_permissions for select to authenticated using (true);
create policy role_permissions_write on public.role_permissions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy user_access_select on public.user_access for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy user_access_write on public.user_access for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy audit_select on public.audit_logs for select to authenticated using (public.is_admin());

-- Privileges: anon gets nothing; users may only edit their own display name on profiles.
revoke all on all tables in schema public from anon;
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;
revoke insert, update, delete on public.audit_logs from authenticated;
