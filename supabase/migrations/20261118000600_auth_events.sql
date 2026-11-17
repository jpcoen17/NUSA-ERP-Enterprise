-- Module 40: client-reported authentication events (best effort; Supabase's own auth logs are not readable from the browser).
create index on public.audit_logs (user_id, created_at desc);
create function public.log_auth_event(p_event text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return; end if;
  if p_event not in ('auth_signed_in','auth_signed_out','auth_passkey_signin','auth_passkey_registered','auth_passkey_removed','auth_mfa_enrolled','auth_mfa_verified','auth_mfa_removed') then
    raise exception 'invalid event'; end if;
  -- cheap spam guard: same event by same user at most once per second
  if exists (select 1 from public.audit_logs where user_id = auth.uid() and action = p_event and created_at > now() - interval '1 second') then return; end if;
  insert into public.audit_logs (user_id, action, table_name, details) values (auth.uid(), p_event, 'auth', jsonb_build_object('source', 'client_reported'));
end $$;
revoke execute on function public.log_auth_event(text) from public, anon;
grant execute on function public.log_auth_event(text) to authenticated;
