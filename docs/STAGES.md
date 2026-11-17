# Progress
| Stage | Scope | Status |
|---|---|---|
| 0 | Inspect environment | Done (sandbox only — repeat on your PC) |
| 1 | Foundation + module registry | Done, build verified |
| 2 | Design system + layout | Done, build verified (see below) |
| 3-5 | Schema + RLS, auth, company/branch (read-only) | Verified live by owner (login works) |
| 6-7 (partial) | Dashboard (real data), customers, products, sales orders, invoices (read-only) | Code + local RLS tests done; live test pending |
| 8 | 51 generic-record modules (add/edit/delete, audit log) | TESTING: DB tests done, browser verification pending |
| 9 | Admin panel: users/access, RBAC view, audit trail (66-68) | TESTING: DB tests done, browser verification pending |
| 10a | PWA (manifest, icons, safe service worker, install button), Vercel config, CI | Built; local preview verified; real deployment NOT yet done |
| 10b | Approval workflow (58), Supply chain analytics (50), Business analytics (61), Data visualization (64), Custom reports + CSV (63) | 58/50/61/64 TESTING (DB-tested); 63 IN DEVELOPMENT (UI only) |
| 11 | Passkey (36-38), MFA TOTP (39), auth events (40) | 36-39 IN DEVELOPMENT (untested live, passkey is beta); 40 TESTING |
| 4 | Auth + user management | Planned |
| 5–11 | See master prompt | Planned |

## Proposed structure
Matches the master prompt. `src/app` (routing/providers), `src/lib` (registry, supabase client),
later `src/modules/<module>` per feature, `src/services` for data access.

## Stage 2 notes
Built: collapsible sidebar (mobile drawer), application launcher (75 modules, status filter), light/dark theme,
global search (Ctrl+K), notification and profile panels, module placeholder pages.
Deliberately NOT built yet (no data source): company/branch selectors (disabled), dashboard widgets, charts,
data tables, filters, modal forms, activity timeline, approval center -> come with Stages 3-8.
