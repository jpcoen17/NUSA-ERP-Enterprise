# Risks / missing configuration
1. ~~Module spec~~ — RESOLVED: official 75-module list applied (provisional=false).
2. Supabase project(s) not yet created; URL + publishable key required for Stage 3.
3. GitHub repo + Vercel project must be created by the owner (see deployment guide); Supabase Auth redirect URLs must include the Vercel URL.
4. Passkeys in Supabase Auth: verify current SDK support before Stage 10; keep password fallback.
5. 10,000 users is a design target, not verified — requires load testing.
6. Not yet tested on your own Windows machine (Stage 0 ran in a sandbox).
