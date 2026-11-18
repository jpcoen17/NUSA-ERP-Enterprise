-- Stage 17: security self-audit for Super Admins (module 69) + tighten helper function privileges.
revoke execute on function public.is_admin(), public.has_company_access(uuid), public.has_branch_access(uuid,uuid) from public, anon;
grant execute on function public.is_admin(), public.has_company_access(uuid), public.has_branch_access(uuid,uuid) to authenticated;

create function public.security_posture() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tables jsonb; v_users jsonb; v_act jsonb; v_issues jsonb := '[]'::jsonb; r record; v_super int; v_guests int;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('name', c.relname, 'rls', c.relrowsecurity, 'anon_access', has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE'),
         'policies', (select count(*) from pg_policy p where p.polrelid = c.oid)) order by c.relname), '[]'::jsonb)
    into v_tables from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r';
  for r in select c.relname, c.relrowsecurity as rls, has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE') as anon_access
           from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' loop
    if not r.rls then v_issues := v_issues || jsonb_build_object('severity','critical','message','Tabel ' || r.relname || ' tidak memakai Row Level Security'); end if;
    if r.anon_access then v_issues := v_issues || jsonb_build_object('severity','critical','message','Role anon punya hak akses langsung ke tabel ' || r.relname); end if;
  end loop;
  for r in select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prosecdef and p.prorettype <> 'trigger'::regtype
             and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
             and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) cfg where cfg like 'search_path=%') loop
    v_issues := v_issues || jsonb_build_object('severity','high','message','Fungsi security definer ' || r.proname || ' tanpa search_path tetap');
  end loop;
  for r in select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prosecdef and p.prorettype <> 'trigger'::regtype
             and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
             and has_function_privilege('anon', p.oid, 'EXECUTE') loop
    v_issues := v_issues || jsonb_build_object('severity','medium','message','Fungsi security definer ' || r.proname || ' dapat dipanggil oleh anon');
  end loop;
  select jsonb_build_object('total', count(*), 'suspended', count(*) filter (where status = 'suspended'), 'guests', count(*) filter (where is_guest),
         'without_access', count(*) filter (where not exists (select 1 from public.user_access ua where ua.user_id = p.id)))
    into v_users from public.profiles p;
  select count(distinct ua.user_id) into v_super from public.user_access ua join public.roles ro on ro.id = ua.role_id where ro.code = 'super_admin';
  v_users := v_users || jsonb_build_object('super_admins', v_super);
  select count(*) into v_guests from public.profiles where is_guest;
  if v_super > 3 then v_issues := v_issues || jsonb_build_object('severity','medium','message','Ada ' || v_super || ' Super Admin; batasi seminimal mungkin'); end if;
  if v_guests > 0 then v_issues := v_issues || jsonb_build_object('severity','info','message','Akun guest aktif: kredensialnya publik, pastikan hanya-baca dan hanya data demo'); end if;
  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_act from (select action, count(*) as n from public.audit_logs where created_at > now() - interval '7 days' group by action order by n desc limit 10) t;
  return jsonb_build_object('generated_at', now(), 'tables', v_tables, 'users', v_users, 'activity', v_act, 'issues', v_issues);
end $$;
revoke execute on function public.security_posture() from public, anon;
grant execute on function public.security_posture() to authenticated;
