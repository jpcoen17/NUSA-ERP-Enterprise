-- Stage 15: shared public "guest" demo account. Guests are read-only by design.
alter table public.profiles add column is_guest boolean not null default false;
-- (Users cannot change it: profiles UPDATE is column-limited to full_name since migration 1.)

create function public.is_guest() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_guest from public.profiles where id = auth.uid()), false);
$$;
revoke execute on function public.is_guest() from public, anon;
grant execute on function public.is_guest() to authenticated;

-- The only non-admin write path that existed was submitting approval requests: guests may not.
drop policy ar_insert on public.approval_requests;
create policy ar_insert on public.approval_requests for insert to authenticated
  with check (requested_by = auth.uid() and status = 'pending' and decided_by is null and public.has_company_access(company_id) and not public.is_guest());

-- Guests share one account: do not let their sign-ins flood the audit log.
create or replace function public.log_auth_event(p_event text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return; end if;
  if public.is_guest() then return; end if;
  if p_event not in ('auth_signed_in','auth_signed_out','auth_passkey_signin','auth_passkey_registered','auth_passkey_removed','auth_mfa_enrolled','auth_mfa_verified','auth_mfa_removed') then
    raise exception 'invalid event'; end if;
  if exists (select 1 from public.audit_logs where user_id = auth.uid() and action = p_event and created_at > now() - interval '1 second') then return; end if;
  insert into public.audit_logs (user_id, action, table_name, details) values (auth.uid(), p_event, 'auth', jsonb_build_object('source', 'client_reported'));
end $$;
