-- Stage 9: admin panel RPCs. Suspended users lose ALL access (checked inside the RLS helper functions).
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_access ua join public.roles r on r.id = ua.role_id join public.profiles p on p.id = ua.user_id
                 where ua.user_id = auth.uid() and r.code = 'super_admin' and p.status = 'active');
$$;
create or replace function public.has_company_access(cid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_access ua join public.profiles p on p.id = ua.user_id
                 where ua.user_id = auth.uid() and ua.company_id = cid and p.status = 'active');
$$;
create or replace function public.has_branch_access(cid uuid, bid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_access ua join public.profiles p on p.id = ua.user_id
                 where ua.user_id = auth.uid() and ua.company_id = cid and (ua.branch_id is null or ua.branch_id = bid) and p.status = 'active');
$$;

create function public.admin_list_users() returns table (id uuid, email text, full_name text, status text, created_at timestamptz, access jsonb)
language sql stable security definer set search_path = '' as $$
  select p.id, u.email::text, p.full_name, p.status, p.created_at,
    coalesce((select jsonb_agg(jsonb_build_object('id', ua.id, 'company', c.name, 'branch', b.name, 'role', r.name) order by c.name)
              from public.user_access ua join public.companies c on c.id = ua.company_id
              left join public.branches b on b.id = ua.branch_id join public.roles r on r.id = ua.role_id
              where ua.user_id = p.id), '[]'::jsonb)
  from public.profiles p join auth.users u on u.id = p.id
  where public.is_admin() order by p.created_at;
$$;
create function public.admin_set_status(p_user uuid, p_status text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_user = auth.uid() then raise exception 'cannot change your own status'; end if;
  if p_status not in ('active','suspended') then raise exception 'invalid status'; end if;
  update public.profiles set status = p_status where id = p_user;
  insert into public.audit_logs (user_id, action, table_name, record_id, details)
  values (auth.uid(), 'set_status', 'profiles', p_user, jsonb_build_object('status', p_status));
end $$;
create function public.admin_grant_access(p_user uuid, p_company uuid, p_branch uuid, p_role uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_branch is not null and not exists (select 1 from public.branches where id = p_branch and company_id = p_company) then
    raise exception 'branch does not belong to company'; end if;
  if not exists (select 1 from public.user_access where user_id = p_user and company_id = p_company
                 and branch_id is not distinct from p_branch and role_id = p_role) then
    insert into public.user_access (user_id, company_id, branch_id, role_id) values (p_user, p_company, p_branch, p_role);
  end if;
  insert into public.audit_logs (company_id, user_id, action, table_name, record_id, details)
  values (p_company, auth.uid(), 'grant_access', 'user_access', p_user, jsonb_build_object('role_id', p_role, 'branch_id', p_branch));
end $$;
create function public.admin_revoke_access(p_access uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if exists (select 1 from public.user_access where id = p_access and user_id = auth.uid()) then
    raise exception 'cannot revoke your own access'; end if;
  delete from public.user_access where id = p_access;
  insert into public.audit_logs (user_id, action, table_name, record_id) values (auth.uid(), 'revoke_access', 'user_access', p_access);
end $$;
revoke execute on function public.admin_list_users(), public.admin_set_status(uuid,text), public.admin_grant_access(uuid,uuid,uuid,uuid), public.admin_revoke_access(uuid) from public, anon;
grant execute on function public.admin_list_users(), public.admin_set_status(uuid,text), public.admin_grant_access(uuid,uuid,uuid,uuid), public.admin_revoke_access(uuid) to authenticated;

-- Role -> permission mapping (descriptive for now; see RBAC page note)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on
  r.code = 'super_admin' or (r.code = 'viewer' and p.code like '%.read')
  or (r.code = 'sales_manager' and p.code like 'sales.%') or (r.code = 'inventory_manager' and p.code like 'inventory.%')
  or (r.code = 'finance_manager' and p.code like 'finance.%') or (r.code = 'company_admin' and p.code like 'companies.%')
on conflict do nothing;
