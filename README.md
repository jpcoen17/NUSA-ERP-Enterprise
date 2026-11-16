# NUSA ERP Enterprise — Demo Edition 1.0

Status: **Stage 2 complete (design system and layout)**. No business module is functional yet.

## Stack
React + Vite + TypeScript + Tailwind v4, React Router, TanStack Query, React Hook Form, Zod, Recharts, Lucide.
Backend: Supabase (Postgres, Auth, Storage, Realtime, Edge Functions). Hosting: Vercel. Source: GitHub.

## Run locally (Windows PowerShell, inside the project folder)
```powershell
npm install
Copy-Item .env.example .env.local   # then fill in your Supabase URL + publishable key
npm run dev
npm run build
```

## Rules
- Never commit `.env.local` or any `service_role` key.
- Module list lives only in `src/lib/modules.ts`. It contains the OFFICIAL 75 modules; do not change without owner approval.
- All DB changes go through `supabase/migrations/`. All business tables need RLS.

## Docs
See `docs/`: STAGES.md, architecture/migration-strategy.md, deployment/github-vercel.md, security/rls.md, RISKS.md.
