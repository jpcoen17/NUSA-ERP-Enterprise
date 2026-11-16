# Database migration strategy
- Tool: Supabase CLI. Files `supabase/migrations/<timestamp>_<name>.sql`, forward-only, never edited after applying.
- Order: 1) extensions/enums 2) companies, branches, departments, profiles, roles, permissions 3) master data
  4) transactions 5) audit_logs 6) RLS policies 7) indexes 8) seed (demo only, flagged `is_demo = true`).
- Isolation: every business table has `company_id` (and `branch_id` where relevant); RLS uses a
  `SECURITY DEFINER` helper reading the user's memberships. Money = `numeric(18,2)`, timestamps = `timestamptz` (UTC), PK = `uuid`.
- Each migration ships with an RLS test (authorized vs. unauthorized user) before moving on.
- Two Supabase projects: `nusa-dev` (preview deployments) and `nusa-prod` (main).
