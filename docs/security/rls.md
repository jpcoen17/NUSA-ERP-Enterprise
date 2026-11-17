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

## Passkeys / MFA / auth events (modules 36-40)
Passkey (Supabase beta/experimental) and TOTP MFA are called only from `src/services/auth.ts`. NOT tested live (needs a real Supabase project, browser and device).
Passkeys must be enabled in Dashboard -> Authentication -> Configuration -> Passkeys. The MFA gate is enforced in the UI only; RLS does not check AAL2 yet.
`log_auth_event` (module 40) tested locally: whitelist, 1/sec throttle, anon denied, only Super Admin can read, clients cannot insert into audit_logs. Events are client-reported (best effort).

## Sales / stock / payments (modules 13, 8, 21) — tested on a FRESH database with all 7 migrations + all seeds
RLS enabled on 19 of 19 public tables. Order items, stock movements and payments have no write policies: they change only through role-checked functions
(create/confirm/deliver/cancel_sales_order, record_payment, adjust_stock). Verified: viewer/finance cannot create orders, sales cannot record payments, finance can;
confirm reduces stock + creates invoice atomically; insufficient stock changes nothing; cancel (unpaid) restores stock and removes the invoice; cancel after payment rejected;
overpayment rejected; ledger guard blocks direct edits of stock_qty / paid_amount even for Super Admin while normal edits (price, due date) still work; stock movements sum equals stock change.
A bug found by these tests (guard evaluated the wrong column on invoices) was fixed before release.
Limits: role checks are per company, not per branch; opening stock set at product creation has no movement entry; no purchase/goods-receipt flow yet; UI not tested live.

## Purchasing (modules 16, 18) — tested on a FRESH database (8 migrations + all seeds), RLS on 22 of 22 tables
PO create/approve/receive/cancel only through role-checked functions (company_admin / procurement_manager; receiving also inventory_manager). Verified: viewer/inventory cannot create,
supplier from another company rejected, creator cannot approve own PO (Super Admin may), inventory cannot approve, only approved POs can be received, receipt adds stock + a 'purchase' movement
and sets weighted-average cost (checked against the formula), receive twice / cancel received rejected, direct writes denied, stock_qty still guarded, ledger sums match, anon denied.
Limits: full receipt only (no partial deliveries), no supplier invoice/payable generated yet, role checks per company not per branch, UI not tested live.

## Accounting (modules 6, 7, 10) — tested on a FRESH database (9 migrations + all seeds), RLS on 26 of 26 tables
Double-entry journals are posted only by internal triggers/functions (`_post` is not callable by users) and are append-only (corrections = reversal entries).
Verified: demo backfill balanced and AR in the GL reconciles to outstanding invoices; confirm posts one 4-line balanced entry (AR/Revenue/COGS/Inventory, COGS = qty x cost);
payment posts Dr Cash / Cr AR; cancel posts a reversal (net effect 0); PO receipt posts Dr Inventory / Cr AP and creates a bill; pay_bill (viewer forbidden, overpay rejected, partial -> paid) posts Dr AP / Cr Cash;
manual journal: viewer forbidden, unbalanced rejected, balanced accepted; direct writes to journals/bills denied; a deferred DB constraint rejects an unbalanced entry even for a superuser; trial balance balanced; anon denied.
Limits: fixed default chart of accounts; no tax, multi-currency, period closing or fixed assets; expenses created later do NOT auto-post (use a manual journal); demo backfill has no COGS;
journals exist only for transactions after this migration plus the demo backfill; role checks per company not per branch; UI not tested live.

## Guest account (tested on fresh DB, 10 migrations)
Guest = profile flag `is_guest` + Viewer role on demo companies. Verified: can read companies/customers/orders/journals/dashboard; every write path rejected (orders, payments, stock, journals, POs, direct inserts, approvals, flag change);
sees no other users, no audit log; auth events not logged for guest; normal viewers unaffected. Residual risk: public credentials (password change / MFA enrolment via the Auth API) cannot be blocked from the database.
