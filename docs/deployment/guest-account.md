# Guest demo account
1. Supabase Dashboard -> Authentication -> Users -> Add user -> Create new user: email + password, tick **Auto Confirm User**.
2. SQL Editor: edit the email in `supabase/setup_guest.sql` (inside the `do` block), run it. Expect `is_guest = true`, `access_rows = 4`, role `Viewer`.
3. Local: put `VITE_GUEST_EMAIL` and `VITE_GUEST_PASSWORD` in `.env.local`, restart `npm run dev`.
4. Vercel: Settings -> Environment Variables: add both for Production and Preview, then **Redeploy**.
What the guest can do: read dashboards/lists/reports of the 4 demo companies. What it cannot (enforced by the database): any create/edit/delete, transactions, approvals, admin pages, audit log. MFA/passkey pages are disabled in the UI for the guest.
Risk to know: the credentials are public. Anyone can call the Supabase Auth API directly with them, e.g. change the guest password or enrol MFA, which would lock other visitors out (UI blocks this, a determined visitor can still do it).
Recovery: Dashboard -> Authentication -> Users -> reset the guest password / remove its MFA factors. Never reuse this password anywhere. For a stronger design (no shared password) use Supabase anonymous sign-ins.
