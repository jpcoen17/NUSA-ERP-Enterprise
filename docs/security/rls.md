# Security notes (Stage 3-5)
- All tables have RLS. `anon` has no table privileges. Only the publishable key is used in the browser.
- New users get a profile but NO data access. An admin inserts a `user_access` row (company [+ branch], role).
- Easiest: run `supabase/setup_demo.sql` (idempotent) in SQL Editor; it grants Super Admin to the email inside it and seeds demo data.
- Apply: `supabase link --project-ref <ref>`, then `supabase db push`, then run `supabase/seed.sql` in the SQL Editor.
- Not yet built: admin UI for access/status changes (needs an Edge Function), audit triggers, rate limiting.

## RLS test results (local Postgres 16, mocked auth.uid(); re-run on real Supabase)
Passed: profile auto-created; admin sees 4 companies/5 branches; branch-scoped viewer sees 1/1; user without access sees 0/0;
non-admin cannot insert companies; cannot self-grant access; cannot edit own profile status; anon has no table access.

## Business tables test (local Postgres 16, mocked auth)
Seed: 20 customers, 30 products, 60 sales orders. Admin dashboard: 6 months of data. Branch-scoped user sees 18 of 60 orders (own branch only).
User without access: 0 orders, revenue 0. Non-admin UPDATE changed 0 rows (blocked by RLS). `anon` cannot call dashboard_summary.

## module_records (generic modules) — local test
Seed idempotent (153 records, 51 modules). Admin insert/update/delete work and write audit_logs via trigger. Branch-scoped viewer reads but update/delete affect 0 rows. No-access user sees 0; anon denied.
Limits: field layout lives in the frontend (jsonb); money values in these modules are not typed numeric columns; no workflow/approval logic.

## Admin panel (modules 66-68) — local test
Admin list/grant/revoke/suspend work via SECURITY DEFINER RPCs that re-check is_admin() server-side. Verified: non-admin gets 0 rows / "forbidden"; admin cannot suspend self or revoke own access;
suspended user loses all data access; duplicate grant is idempotent; branch must belong to company; anon denied; actions land in audit_logs.
Not built: creating users from the admin UI (needs an Edge Function with the service role on the server), per-permission enforcement.

## Approvals + analytics (modules 58, 50, 61, 64) — local test
Verified: any user with company access can submit; requester cannot forge `requested_by`; non-admin sees only own requests; direct UPDATE denied;
approve/reject only by Super Admin via function; cannot decide an already-decided request; cannot decide own request (separation of duties); anon denied;
analytics/supply-chain RPCs run as SECURITY INVOKER (no-access user gets empty results). Not verified by a test: cancelling another user's request (guarded in the function by `requested_by = auth.uid()`).
Not built: multi-step/threshold approval chains, notifications on decision.
